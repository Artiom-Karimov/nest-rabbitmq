import { Injectable, Logger } from '@nestjs/common';
import { ConfirmChannel } from 'amqplib';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';

@Injectable()
export class RabbitMQPublishService {
  constructor(
    private readonly logger: Logger,
    private readonly connection: RabbitMQConnectionService,
  ) {}

  /** Call before sending any messages, because exchange may not exist */
  public async assertExchange(exchange: string): Promise<void> {
    await this.connection.channel.addSetup((channel: ConfirmChannel) =>
      this.handleConnection(exchange, channel),
    );
  }

  /** May throw an error if message is unserializable or broker didn't accept the message  */
  public async publish<T extends object>(
    exchange: string,
    topic: string,
    message: T,
  ): Promise<void> {
    const content = JSON.stringify(message);
    /* Note that amqp-connection-manager's publish is not the same as amqplib's publish.
      This method returns an actual Promise that resolves when broker confirms the message.
      It rejects if message cannot be sent or is refused by broker. */
    await this.connection.channel.publish(exchange, topic, content, {
      persistent: true, // Will survive broker restart
    });
  }

  private async handleConnection(
    exchange: string,
    channel: ConfirmChannel,
  ): Promise<void> {
    try {
      /* Topic is the most flexible exchange type. 
      You bind queues using routing key with wildcard support,
      then publish messages with different routing keys,
      so queues will receive only desired messages, filtered by routing key. */
      await channel.assertExchange(exchange, 'topic', {
        durable: true, // Will survive after broker restart
        autoDelete: false, // Will not be destroyed if 0 queues are bound
      });
      this.logger.log(`Exchange ${exchange} asserted`);
    } catch (error) {
      this.logger.error(`Cannot assert exchange ${exchange}`, error);
    }
  }
}
