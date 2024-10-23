import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { config } from 'src/common/config';
import { Message } from './message';

@Injectable()
export class AMQPPublishService implements OnModuleInit {
  private exchange: string = config.amqp.exchange;

  private connection: AmqpConnectionManager;

  private channel: ChannelWrapper;

  constructor(private readonly logger: Logger) {}

  public onModuleInit(): void {
    this.logger.log('Connecting to rabbit');
    this.connection = amqp.connect(config.amqp.connection, {});

    // Must be bound, otherwise you won't know anything
    this.connection.addListener('connectFailed', (data) =>
      this.handleConnectionError(data),
    );

    // You don't have to wait for connection to create channel
    this.channel = this.connection.createChannel({
      json: true, // All sent data will be encoded as json
      confirm: true, // Each message publish should be confirmed by broker
      setup: (channel: ConfirmChannel) => this.setupChannel(channel),
    });
  }

  public async publish({ routingKey, content }: Message): Promise<void> {
    try {
      /* Note that amqp-connection-manager's publish is not the same as amqplib's publish.
      This method returns an actual Promise that resolves when broker confirms the message.
      It rejects if message cannot be sent or is refused by broker.
      */
      await this.channel.publish(this.exchange, routingKey, content, {
        persistent: true, // Will survive broker restart
      });
    } catch (error) {
      this.logger.error('Cannot publish a message', error);
      throw error; // This is necessary because your transaction success may depend on publishing
    }
  }

  private handleConnectionError(data: unknown): void {
    this.logger.error('Cannot connect to broker', data);
  }

  private async setupChannel(channel: ConfirmChannel): Promise<void> {
    this.logger.log('AMQP channel connected');

    try {
      /* Topic is the most flexible exchange type. 
      You bind queues using routing key with wildcard support,
      then publish messages with different routing keys,
      so queues will receive only desired messages, filtered by routing key.
      */
      await channel.assertExchange(this.exchange, 'topic', {
        durable: true, // Will survive after broker restart
        autoDelete: false, // Will not be destroyed if 0 queues are bound
      });
      this.logger.log('AMQP Exchange asserted');
    } catch (error) {
      // May throw an error if exchange exists, but has different type
      this.logger.error('Cannot create AMQP exchange', error);
    }
  }
}
