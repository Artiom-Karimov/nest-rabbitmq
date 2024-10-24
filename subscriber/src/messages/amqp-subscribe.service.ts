import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { config } from 'src/common/config';
import { assertExhausted } from 'src/common/assert-exhausted';
import {
  AMQPResult,
  AMQPSubscription,
  MessageConsumer,
} from './amqp-subscription';

@Injectable()
export class AMQPSubscribeService implements OnModuleInit {
  private connection: AmqpConnectionManager;

  private channel: ChannelWrapper;

  constructor(private readonly logger: Logger) {}

  /** Use it to bind some usecase handler.
   * This service does not apply validation, so you need to perform it in handler
   */
  public async subscribe(subscription: AMQPSubscription): Promise<void> {
    await this.channel.addSetup((channel: ConfirmChannel) =>
      this.bindQueue(channel, subscription),
    );

    await this.channel.consume(
      subscription.queue,
      (message) => {
        this.parseAndConsume(message, subscription.consumer);
      },
      {
        prefetch: subscription.prefetch,
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
    this.channel = this.connection.createChannel();
  }

  private handleConnectionError(data: unknown): void {
    this.logger.error('Cannot connect to broker', data);
  }

  private async bindQueue(
    channel: ConfirmChannel,
    subscription: AMQPSubscription,
  ): Promise<void> {
    /* You have to ensure that desired exchange exists before binding */
    await channel.assertExchange(subscription.exchange, 'topic', {
      durable: true, // Will survive after broker restart
      autoDelete: false, // Will not be destroyed if 0 queues are bound
    });
    this.logger.log('AMQP Exchange asserted');

    await channel.assertQueue(subscription.queue, {
      durable: true,
      autoDelete: false,
    });
    this.logger.log('AMQP Queue asserted');

    await channel.bindQueue(
      subscription.queue,
      subscription.exchange,
      subscription.routingKey,
    );
    this.logger.log('AMQP Queue bound to Exchange');
  }

  /** Application usecases are usually async, but amqplib expects consume to be sync.
   * message.content is a Buffer, so you need to parse it properly.
   */
  private parseAndConsume(
    message: ConsumeMessage,
    consumer: MessageConsumer,
  ): void {
    this.logger.log('Message received');

    // JSON.parse can throw an error
    try {
      const json = message.content.toString();
      const data = JSON.parse(json) as unknown;

      // Consumer should catch its own errors. If it throws, consider it as a fatal error
      // eslint-disable-next-line @typescript-eslint/no-floating-promises, promise/catch-or-return
      consumer(data).then((result: AMQPResult) =>
        this.processConsumeResult(message, result),
      );
    } catch (error) {
      this.logger.error('Cannot parse message data', error);
      this.channel.nack(message, undefined, false);
    }
  }

  private processConsumeResult(
    message: ConsumeMessage,
    result: AMQPResult,
  ): void {
    if (result === AMQPResult.Processed) {
      return this.channel.ack(message);
    }

    if (result === AMQPResult.InternalError) {
      // If the data is correct, but server cannot handle it, requeue the message
      return this.channel.nack(message, undefined, true);
    }

    if (result === AMQPResult.Unprocessable) {
      // If there is something wrong with the data, don't requeue the message
      return this.channel.nack(message, undefined, false);
    }

    return assertExhausted(result);
  }
}
