import { Injectable, Logger } from '@nestjs/common';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { assertExhausted } from 'src/common/assert-exhausted';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import {
  RabbitConsumer,
  RabbitConsumerResult,
  RabbitSubscription,
} from './dto';
import { RabbitDTOValidator } from './utils/rabbit-dto-validator';

@Injectable()
export class RabbitMQConsumeService {
  constructor(
    private readonly logger: Logger,
    private readonly connection: RabbitMQConnectionService,
  ) {}

  /** Use it to bind some usecase handler.
   * T is return type.
   * Validation of T is performed automatically with class-transformer & class-validator
   */
  public async subscribe<T extends object>(
    subscription: RabbitSubscription<T>,
  ): Promise<void> {
    await this.connection.channel.addSetup((channel: ConfirmChannel) =>
      this.bindQueue(channel, subscription),
    );

    const validator = new RabbitDTOValidator<T>(
      this.logger,
      subscription.dtoClass,
    );

    await this.connection.channel.consume(
      subscription.queue,
      (message) => {
        this.parseAndConsume<T>(message, subscription.consumer, validator);
      },
      {
        prefetch: subscription.prefetch,
        noAck: false, // Disable auto-acknowledgement
      },
    );
  }

  private async bindQueue<T>(
    channel: ConfirmChannel,
    { exchange, queue, pattern }: RabbitSubscription<T>,
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

  /** Application usecases are usually async, but amqplib expects consume to be sync */
  private parseAndConsume<T extends object>(
    message: ConsumeMessage,
    consumer: RabbitConsumer<T>,
    validator: RabbitDTOValidator<T>,
  ): void {
    this.consumeIfValid(message, consumer, validator).catch(
      (reason: unknown) => {
        this.logger.error('Consuming rabbit message', reason);
        this.processConsumeResult(message, RabbitConsumerResult.InternalError);
      },
    );
  }

  private async consumeIfValid<T extends object>(
    message: ConsumeMessage,
    consumer: RabbitConsumer<T>,
    validator: RabbitDTOValidator<T>,
  ): Promise<void> {
    const value = await validator.validate(message.content.toString());
    if (!value) {
      return this.processConsumeResult(
        message,
        RabbitConsumerResult.Unprocessable,
      );
    }

    const result = await consumer(value);

    return this.processConsumeResult(message, result);
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
