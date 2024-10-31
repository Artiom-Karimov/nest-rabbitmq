import { Module } from '@nestjs/common';
import { LoggerModule } from './logger';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [LoggerModule, MessagesModule],
})
export class AppModule {}
