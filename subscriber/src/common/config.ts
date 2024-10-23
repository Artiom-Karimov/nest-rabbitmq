import convict from 'convict';

const values = convict({
  port: {
    default: 3025,
    env: 'APP_PORT',
    doc: 'Application port',
    format: Number,
  },
  amqp: {
    connection: {
      default: 'amqp://localhost:5672',
      env: 'AMQP_CONNECTION',
      doc: 'RabbitMQ connection string',
      format: String,
    },
  },
  generatorConsumer: {
    exchange: {
      default: 'information',
      env: 'GENERATOR_EXCHANGE',
      doc: 'RabbitMQ exchange name',
      format: String,
    },
    queue: {
      default: 'generator',
      env: 'GENERATOR_QUEUE',
      doc: 'RabbitMQ queue name',
      format: String,
    },
    routingKey: {
      default: 'counter',
      env: 'GENERATOR_ROUTING_KEY',
      doc: 'Routing key for message generator',
      format: String,
    },
    prefetch: {
      default: 1,
      env: 'GENERATOR_PREFETCH',
      doc: 'Messages to load immediately',
      format: Number,
    },
  },
});

values.validate({ allowed: 'strict' });

export const config = values.getProperties();
