# Nestjs + RabbitMQ implementation

## Production-ready usecase, includes:

- Auto-reconnect
- Error handling
- Auto-created durable exchange
- Publishing restart-proof messages over exchange
- Auto-bound queue with exchange assertion
- Consuming/parsing messages
- Async handler support with ability to requeue unprocessed messages
- Using class-transformer/class-validator with consumer

## How to start

- Start rabbit container
```
docker-compose up -d
```

- Install dependencies
```
yarn
```

- Start publisher
```
cd publisher
yarn start
```

- Start subscriber. Open another terminal
```
cd subscriber
yarn start
```
