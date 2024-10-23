import { Module } from '@nestjs/common';
import { AMQPPublishService } from './amqp-publish.service';
import { MessageGenerator } from './message-generator';

@Module({ providers: [AMQPPublishService, MessageGenerator] })
export class MessagesModule {}
