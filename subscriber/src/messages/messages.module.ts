import { Module } from '@nestjs/common';
import { CounterMessageHandler } from './counter-message-handler';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import { RabbitMQConsumeService } from './rabbitmq-consume.service';

@Module({
  providers: [
    RabbitMQConnectionService,
    RabbitMQConsumeService,
    CounterMessageHandler,
  ],
})
export class MessagesModule {}
