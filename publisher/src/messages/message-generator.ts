import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import { RabbitMQPublishService } from './rabbitmq-publish.service';

@Injectable()
export class MessageGenerator implements OnApplicationBootstrap {
  private messageCounter = 0;

  private readonly exchange = config.amqp.exchange;

  private readonly timeout = config.generator.intervalMillis;

  private readonly routingKey = config.generator.routingKey;

  constructor(
    private readonly logger: Logger,
    private readonly service: RabbitMQPublishService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Initializing generator');

    await this.service.assertExchange(this.exchange);

    // This should not be awaited
    this.sendForever().catch((error) => {
      this.logger.error('Error sending message', error);
      process.exit(1);
    });
  }

  private async sendForever(): Promise<void> {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      await this.sleep();
      // eslint-disable-next-line no-await-in-loop
      await this.send();
    }
  }

  private async sleep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, this.timeout);
    });
  }

  private async send(): Promise<void> {
    try {
      await this.service.publish(this.exchange, this.routingKey, {
        value: this.messageCounter,
      });

      this.logger.log(`Message #${this.messageCounter} sent`);
      this.messageCounter += 1;
    } catch (error) {
      this.logger.error('Cannot send counter value', error);
    }
  }
}
