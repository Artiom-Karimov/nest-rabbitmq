export type Message = {
  readonly routingKey: string;

  readonly content: object;
};
