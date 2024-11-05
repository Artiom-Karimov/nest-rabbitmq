import { ClassConstructor } from 'class-transformer';

/** Message handler responds with one of these values */
export enum RabbitConsumerResult {
  Processed = 'processed',
  InternalError = 'internal_error',
  Unprocessable = 'unprocessable',
}

/** Message handler should declare async method for consuming messages.
 * This method should not throw any errors. It should return one of listed values
 */
export type RabbitConsumer<T> = (data: T) => Promise<RabbitConsumerResult>;

/** Message handler subscribes with this data */
export type RabbitSubscription<T> = {
  /** Exchange name */
  exchange: string;
  /** Queue name */
  queue: string;
  /** Routing key with wildcard support */
  pattern: string;
  /** Limit immediately loaded messages */
  prefetch: number;
  /** Async processing function */
  consumer: RabbitConsumer<T>;
  /** DTO class with class-validator decorated fields */
  dtoClass: ClassConstructor<T>;
};
