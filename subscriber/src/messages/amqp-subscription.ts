/** Message handler responds with one of these values */
export enum AMQPResult {
  Processed = 'processed',
  InternalError = 'internal_error',
  Unprocessable = 'unprocessable',
}

/** Message handler should declare async method for consuming messages.
 * This method should not throw any errors. It should return one of listed values
 */
export type MessageConsumer = (data: unknown) => Promise<AMQPResult>;

/** Message handler subscribes with this data */
export type AMQPSubscription = {
  /** Exchange name */
  exchange: string;
  /** Queue name */
  queue: string;
  /** Routing key with wildcard support */
  routingKey: string;
  /** Limit immediately loaded messages */
  prefetch: number;
  /** Async processing function */
  consumer: MessageConsumer;
};
