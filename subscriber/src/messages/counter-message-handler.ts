import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import { RabbitMQConsumeService } from './rabbitmq-consume.service';
import { RabbitConsumerResult, RabbitSubscription } from './rabbit-subscription';

@Injectable()
export class CounterMessageHandler implements OnApplicationBootstrap {
  constructor(
    private readonly logger: Logger,
    private readonly service: RabbitMQConsumeService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const subscription: RabbitSubscription = {
      exchange: config.generatorConsumer.exchange,
      queue: config.generatorConsumer.queue,
      pattern: config.generatorConsumer.routingKey,
      prefetch: config.generatorConsumer.prefetch,
      consumer: (data: unknown) => this.handleMessage(data),
    };

    await this.service.subscribe(subscription);
  }

  private async handleMessage(data: unknown): Promise<RabbitConsumerResult> {
    this.logger.log('Message received', data);
    await this.sleep();

    return RabbitConsumerResult.Processed;
  }

  private async sleep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, config.generatorConsumer.sleep);
    });
  }
}
