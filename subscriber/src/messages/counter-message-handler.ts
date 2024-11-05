import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { config } from 'src/common/config';
import { RabbitMQConsumeService } from './rabbitmq-consume.service';
import { CounterMessageDTO } from './dto/counter-message.dto';
import { RabbitConsumerResult, RabbitSubscription } from './dto';

@Injectable()
export class CounterMessageHandler implements OnApplicationBootstrap {
  constructor(
    private readonly logger: Logger,
    private readonly service: RabbitMQConsumeService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const subscription: RabbitSubscription<CounterMessageDTO> = {
      exchange: config.generatorConsumer.exchange,
      queue: config.generatorConsumer.queue,
      pattern: config.generatorConsumer.routingKey,
      prefetch: config.generatorConsumer.prefetch,
      consumer: (data: CounterMessageDTO) => this.handleMessage(data),
      dtoClass: CounterMessageDTO,
    };

    await this.service.subscribe(subscription);
  }

  private async handleMessage(
    message: CounterMessageDTO,
  ): Promise<RabbitConsumerResult> {
    await this.sleep();

    this.logger.log('Message received', message);

    return RabbitConsumerResult.Processed;
  }

  private async sleep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, config.generatorConsumer.sleep);
    });
  }
}
