import { Injectable, Logger } from '@nestjs/common';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { assertExhausted } from 'src/common/assert-exhausted';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import {
  RabbitConsumer,
  RabbitConsumerResult,
  RabbitSubscription,
} from './rabbit-subscription';

@Injectable()
export class RabbitMQConsumeService {
  constructor(
    private readonly logger: Logger,
    private readonly connection: RabbitMQConnectionService,
  ) {}

  /** Use it to bind some usecase handler.
   * This service does not apply validation, so you need to perform it in handler
   */
  public async subscribe(subscription: RabbitSubscription): Promise<void> {
    await this.connection.channel.addSetup((channel: ConfirmChannel) =>
      this.bindQueue(channel, subscription),
    );

    await this.connection.channel.consume(
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

  private async bindQueue(
    channel: ConfirmChannel,
    { exchange, queue, pattern }: RabbitSubscription,
  ): Promise<void> {
    try {
      await channel.assertExchange(exchange, 'topic', {
        durable: true, // Will survive after broker restart
        autoDelete: false, // Will not be destroyed if 0 queues are bound
      });
      this.logger.log(`Exchange ${exchange} asserted`);

      await channel.assertQueue(queue, {
        durable: true,
        autoDelete: false,
      });
      this.logger.log(`Queue ${queue} asserted`);

      await channel.bindQueue(queue, exchange, pattern);
      this.logger.log(`Queue ${queue} bound to ${exchange}`);
    } catch (error) {
      this.logger.error(`Cannot subscribe ${queue} to ${exchange}`, error);
    }
  }

  /** Application usecases are usually async, but amqplib expects consume to be sync.
   * message.content is a Buffer, so you need to parse it properly.
   */
  private parseAndConsume(
    message: ConsumeMessage,
    consumer: RabbitConsumer,
  ): void {
    try {
      const json = message.content.toString();
      // Type will be checked on consumer side
      const data = JSON.parse(json) as unknown;

      // Consumer should catch its own errors. If it throws, consider it as a fatal error
      // eslint-disable-next-line @typescript-eslint/no-floating-promises, promise/catch-or-return
      consumer(data).then((result: RabbitConsumerResult) =>
        this.processConsumeResult(message, result),
      );
    } catch (error) {
      this.logger.error('Cannot parse message data', error);
      this.connection.channel.nack(message, undefined, false);
    }
  }

  private processConsumeResult(
    message: ConsumeMessage,
    result: RabbitConsumerResult,
  ): void {
    if (result === RabbitConsumerResult.Processed) {
      return this.connection.channel.ack(message);
    }

    if (result === RabbitConsumerResult.InternalError) {
      // If the data is correct, but server cannot handle it, requeue the message
      return this.connection.channel.nack(message, undefined, true);
    }

    if (result === RabbitConsumerResult.Unprocessable) {
      // If there is something wrong with the data, don't requeue the message
      return this.connection.channel.nack(message, undefined, false);
    }

    return assertExhausted(result);
  }
}
