const amqp = require("amqplib");
const dotenv = require("dotenv");
const SimpleNodeLogger = require("simple-node-logger");

const MongoHandler = require("./handler/mongoHandler");
const MongoServer = require("./server/mongoServer");
const RedisHandler = require("./handler/redisHandler");
const RedisServer = require("./server/redisServer");
const RiakHandler = require("./handler/riakHandler");
const RiakServer = require("./server/riakServer");
dotenv.config();

const MONGO_HOST = process.env.MONGO_HOST;
const RABBIT_HOST = process.env.RABBITMQ_HOST;
const RIAK_NODES = process.env.RIAK_NODES.split(",");

let logger = SimpleNodeLogger.createSimpleLogger();

const args = process.argv.slice(2);
const routingKey = args[0];

let handler;
let server;
switch (routingKey) {
  case "mongo":
    handler = new MongoHandler(MONGO_HOST, logger);
    server = new MongoServer(8080, logger);
    break;
  case "redis":
    handler = new RedisHandler(REDIS_HOST, logger);
    server = new RedisServer(8081, logger);
    break;
  case "riak":
    handler = new RiakHandler(RIAK_NODES, logger);
    server = new RiakServer(8082, logger);
    break;
  default:
    throw new Error(`Unsupported routingKey ${routingKey}.`);
    break;
}

amqp.connect(RABBIT_HOST)
  .then((connection) => {
    connection.createChannel()
      .then((channel) => {
        const exchange = "coursebook";

        channel.assertExchange(exchange, "direct");
        channel.assertQueue(`${exchange}.${routingKey}`)
          .then((q) => {
            logger.info(`Waiting for messages on ${routingKey}. To exit press CTRL+C`);
            channel.bindQueue(q.queue, exchange, routingKey);

            channel.consume(q.queue, (message) => {
              logger.info(message);
              let content = message.content.toString();
              logger.info(`Received Content: ${content}`);

              content = JSON.parse(content);
              handler.receiveMessage(content)
                .then((result) => {
                  if (result) {
                    logger.info("Message acknowledged");
                    channel.ack(message);
                  } else {
                    logger.info("Message not acknowledged");
                    channel.nack(message);
                  }
                });
            });
          });
      });
  });

server.listen();
