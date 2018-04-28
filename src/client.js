const amqp = require("amqplib");
const dotenv = require("dotenv");
const SimpleNodeLogger = require("simple-node-logger");

const MongoHandler = require("./handler/MongoHandler");
const MongoServer = require("./server/MongoServer");
const RedisHandler = require("./handler/RedisHandler");
const RedisServer = require("./server/RedisServer");
const RiakHandler = require("./handler/RiakHandler");
const RiakServer = require("./server/RiakServer");
dotenv.config();

const MONGO_HOST = process.env.MONGO_HOST;
const RABBIT_HOST = process.env.RABBITMQ_HOST;
const RIAK_NODES = process.env.RIAK_NODES.split(",");
const RESPONSE_ENDPOINT = process.env.RESPONSE_ENDPOINT;

let logger = SimpleNodeLogger.createSimpleLogger();

const args = process.argv.slice(2);
const routingKey = args[0];

let handler;
let server;
switch (routingKey) {
  case "mongo":
    handler = new MongoHandler(MONGO_HOST, RESPONSE_ENDPOINT, logger);
    server = new MongoServer(MONGO_HOST, 8090, logger);
    break;
  case "redis":
    handler = new RedisHandler(REDIS_HOST, logger);
    server = new RedisServer(REDDIS_HOST, 8091, logger);
    break;
  case "riak":
    handler = new RiakHandler(RIAK_NODES, logger);
    server = new RiakServer(RIAK_NODES, 8092, logger);
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
