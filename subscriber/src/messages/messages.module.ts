import { Module } from '@nestjs/common';
import { AMQPConsumeService } from './amqp-consume.service';
import { MessageHandler } from './message-handler';

@Module({ providers: [AMQPConsumeService, MessageHandler] })
export class MessagesModule {}
