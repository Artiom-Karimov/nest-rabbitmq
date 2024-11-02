import convict from 'convict';

const values = convict({
  port: {
    default: 3024,
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
    exchange: {
      default: 'information',
      env: 'AMQP_EXCHANGE',
      doc: 'RabbitMQ exchange name',
      format: String,
    },
  },
  generator: {
    intervalMillis: {
      default: 2_000,
      env: 'PUBLISH_INTERVAL_MILLIS',
      doc: 'Message generator frequency',
      format: Number,
    },
    routingKey: {
      default: 'counter',
      env: 'GENERATOR_ROUTING_KEY',
      doc: 'Routing key for message generator',
      format: String,
    },
  },
});

values.validate({ allowed: 'strict' });

export const config = values.getProperties();
