import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import {
  AMQPSubscribeService,
  AMQPSubscription,
} from './amqp-subscribe.service';

@Injectable()
export class CounterMessageHandler implements OnApplicationBootstrap {
  constructor(
    private readonly logger: Logger,
    private readonly amqp: AMQPSubscribeService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const subscription: AMQPSubscription = {
      exchange: config.generatorConsumer.exchange,
      queue: config.generatorConsumer.queue,
      routingKey: config.generatorConsumer.routingKey,
      prefetch: config.generatorConsumer.prefetch,
      consumer: (data) => this.handleMessage(data),
    };

    await this.amqp.subscribe(subscription);
  }

  private handleMessage(data: unknown): Promise<void> {
    this.logger.log('Message received', data);

    return this.sleep();
  }

  private async sleep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, config.generatorConsumer.sleep);
    });
  }
}
