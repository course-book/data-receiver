const amqp = require("amqplib");
const dotenv = require("dotenv");
const SimpleNodeLogger = require("simple-node-logger");

const MongoHandler = require("./handler/mongoHandler");
const RiakHandler = require("./handler/riakHandler");
dotenv.config()

const MONGO_HOST = process.env.MONGO_HOST;
const RABBIT_HOST = process.env.RABBITMQ_HOST;
const RIAK_NODES = process.env.RIAK_NODES.split(",");

let logger = SimpleNodeLogger.createSimpleLogger();

const args = process.argv.slice(2);
const routingKey = args[0];

let handler;
if (routingKey === "riak") {
  handler = new RiakHandler(RIAK_NODES, logger);
} else if (routingKey === "mongo") {
  handler = new MongoHandler(MONGO_HOST, logger);
} else if (routingKey === "redis") {
  handler = new RedisHandler(REDIS_HOST, logger); 
}

amqp.connect(RABBIT_HOST)
  .then((connection) => {
    connection.createChannel()
      .then((channel) => {
        const exchange = "coursebook";

        channel.assertExchange(exchange, "direct");
        channel.assertQueue(`${exchange}.${routingKey}`)
          .then((q) => {
            logger.info(`  [*] Waiting for messages on ${routingKey}. To exit press CTRL+C`);
            channel.bindQueue(q.queue, exchange, routingKey);

            channel.consume(q.queue, (message) => {
              logger.info(message);
              let content = message.content.toString();
              logger.info(`  [x] ${content}`);

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
