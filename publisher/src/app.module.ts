import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './logger';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [LoggerModule, MessagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
