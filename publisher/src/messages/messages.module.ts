import { Module } from '@nestjs/common';
import { MessageGenerator } from './message-generator';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import { RabbitMQPublishService } from './rabbitmq-publish.service';

@Module({
  providers: [
    RabbitMQConnectionService,
    RabbitMQPublishService,
    MessageGenerator,
  ],
})
export class MessagesModule {}
