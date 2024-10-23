import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { config } from 'src/common/config';

@Injectable()
export class AMQPConsumeService implements OnModuleInit {
  private exchange: string = config.generatorConsumer.exchange;

  private queue: string = config.generatorConsumer.queue;

  private routingKey: string = config.generatorConsumer.routingKey;

  private prefetch: number = config.generatorConsumer.prefetch;

  private connection: AmqpConnectionManager;

  private channel: ChannelWrapper;

  constructor(private readonly logger: Logger) {}

  /** Use it to bind some usecase handler.
   * This service does not apply validation, so you need to perform it in handler
   */
  public async subscribe(
    consumer: (data: unknown) => Promise<void>,
  ): Promise<void> {
    await this.channel.consume(
      this.queue,
      (message) => {
        this.parseAndConsume(message, consumer);
      },
      {
        prefetch: this.prefetch, // Limit immediately loaded messages
        noAck: false, // Disable auto-acknowledgement
      },
    );
  }

  public onModuleInit(): void {
    this.logger.log('Connecting to rabbit');
    this.connection = amqp.connect(config.amqp.connection, {});

    // Must be bound, otherwise you won't know anything
    this.connection.addListener('connectFailed', (data) =>
      this.handleConnectionError(data),
    );

    // You don't have to wait for connection to create channel
    this.channel = this.connection.createChannel({
      setup: (channel: ConfirmChannel) => this.setupChannel(channel),
    });
  }

  private handleConnectionError(data: unknown): void {
    this.logger.error('Cannot connect to broker', data);
  }

  private async setupChannel(channel: ConfirmChannel): Promise<void> {
    this.logger.log('AMQP channel connected');

    try {
      await this.bindQueue(channel);
    } catch (error) {
      this.logger.error('Cannot subscribe to AMQP topic', error);
    }
  }

  private async bindQueue(channel: ConfirmChannel): Promise<void> {
    /* You have to ensure that desired exchange exists before binding */
    await channel.assertExchange(this.exchange, 'topic', {
      durable: true, // Will survive after broker restart
      autoDelete: false, // Will not be destroyed if 0 queues are bound
    });
    this.logger.log('AMQP Exchange asserted');

    await channel.assertQueue(this.queue, {
      durable: true,
      autoDelete: false,
    });
    this.logger.log('AMQP Queue asserted');

    await channel.bindQueue(this.queue, this.exchange, this.routingKey);
    this.logger.log('AMQP Queue bound to Exchange');
  }

  /** Application usecases are usually async, but amqplib expects consume to be sync.
   * message.content is a Buffer, so you need to parse it properly.
   */
  private parseAndConsume(
    message: ConsumeMessage,
    consumer: (data: unknown) => Promise<void>,
  ): void {
    this.logger.log('Message received');

    // JSON.parse can throw an error
    try {
      const json = message.content.toString();
      const data = JSON.parse(json) as unknown;

      consumer(data)
        .then(() => this.channel.ack(message))
        .catch(() => this.channel.nack(message));
    } catch (error) {
      this.logger.error('Cannot parse message data', error);
      this.channel.nack(message);
    }
  }
}
