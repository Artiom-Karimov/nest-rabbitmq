import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { config } from 'src/common/config';

@Injectable()
export class RabbitMQConnectionService implements OnModuleInit {
  private connection: AmqpConnectionManager;

  private _channel: ChannelWrapper;

  public get channel(): ChannelWrapper {
    return this._channel;
  }

  constructor(private readonly logger: Logger) {}

  public onModuleInit(): void {
    this.connection = amqp.connect(config.amqp.connection, {});
    this.connection.addListener('connectFailed', (data) =>
      this.handleConnectionError(data),
    );

    // You don't have to wait for connection to create channel
    this._channel = this.connection.createChannel({
      json: true, // All sent data will be encoded as json
      confirm: true, // Each message publish should be confirmed by broker
    });
  }

  private handleConnectionError(data: unknown): void {
    this.logger.error('Cannot connect to rabbit', data);
  }
}
