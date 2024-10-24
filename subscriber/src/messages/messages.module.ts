import { Module } from '@nestjs/common';
import { CounterMessageHandler } from './counter-message-handler';
import { AMQPSubscribeService } from './amqp-subscribe.service';

@Module({ providers: [AMQPSubscribeService, CounterMessageHandler] })
export class MessagesModule {}
