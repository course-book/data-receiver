const amqp = require("amqplib");
const dotenv = require("dotenv");
const SimpleNodeLogger = require("simple-node-logger");


const MongoHandler = require("./mongoHandler");
dotenv.config()

const mongo_host = process.env.MONGO_HOST;
const RABBIT_HOST = process.env.RABBITMQ_HOST;

let logger = SimpleNodeLogger.createSimpleLogger();
const handler = new MongoHandlerHandler(host, logger);


amqp.connect(RABBIT_HOST)
  .then((conn) => {
    conn.createChannel()
      .then((channel) => {
        const args = process.argv.slice(2);
        const routingKey = args[0];

        const exchange = "coursebook";


        channel.assertExchange(exchange, "direct");

        channel.assertQueue(`${exchange}.${routingKey}`)
          .then((q) => {
            console.log(`  [*] Waiting for messages on ${routingKey}. To exit press CTRL+C`);
            channel.bindQueue(q.queue, exchange, routingKey);

            channel.consume(q.queue, (message) => {
              logger.info(message);
              const content = message.content.toString();
              logger.info(`  [x] ${content}`);
              var state = handler.recieveMessage(${routingKey}, $(content));
              if(state) {
            	channel.ack(message);  
              } else {
            	logger.error(message);
              }
            });
          });
      });
  });

