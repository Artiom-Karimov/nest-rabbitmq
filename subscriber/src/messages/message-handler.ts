import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AMQPConsumeService } from './amqp-consume.service';

@Injectable()
export class MessageHandler implements OnApplicationBootstrap {
  constructor(
    private readonly logger: Logger,
    private readonly amqp: AMQPConsumeService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.amqp.subscribe((data) => this.handleMessage(data));
  }

  private handleMessage(data: unknown): Promise<void> {
    this.logger.log('Message received', data);

    return Promise.resolve();
  }
}
