import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import { DTOValidator } from 'src/common/dto-validator';
import { RabbitMQConsumeService } from './rabbitmq-consume.service';
import {
  RabbitConsumerResult,
  RabbitSubscription,
} from './rabbit-subscription';
import { CounterMessageDTO } from './counter-message.dto';

@Injectable()
export class CounterMessageHandler implements OnApplicationBootstrap {
  private readonly validator: DTOValidator<CounterMessageDTO>;

  constructor(
    private readonly logger: Logger,
    private readonly service: RabbitMQConsumeService,
  ) {
    this.validator = new DTOValidator(logger, CounterMessageDTO);
  }

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
    await this.sleep();

    const message = await this.validator.validate(data);
    // Do not requeue message if it cannot be processed
    if (!message) return RabbitConsumerResult.Unprocessable;

    this.logger.log('Message received', message);

    return RabbitConsumerResult.Processed;
  }

  private async sleep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, config.generatorConsumer.sleep);
    });
  }
}
