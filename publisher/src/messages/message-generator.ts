import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import { AMQPPublishService } from 'src/messages/amqp-publish.service';

@Injectable()
export class MessageGenerator implements OnApplicationBootstrap {
  private messageCounter = 0;

  private timeout: number = config.generator.intervalMillis;

  private routingKey: string = config.generator.routingKey;

  constructor(
    private readonly logger: Logger,
    private readonly service: AMQPPublishService,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log('Initializing generator');
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
      await this.service.publish({
        routingKey: this.routingKey,
        content: { value: this.messageCounter },
      });

      this.logger.log(`Message #${this.messageCounter} sent`);
      this.messageCounter += 1;
    } catch (error) {
      this.logger.error('Cannot send counter value', error);
    }
  }
}
