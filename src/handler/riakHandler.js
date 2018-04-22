const Riak = require("basho-riak-client");
const moment = require("moment");

class RiakHandler {
  constructor(nodes, logger) {
    this.nodes = nodes;
    this.logger = logger;

    this.receiveMessage.bind(this);
    this.handleRegistration.bind(this);
  }

  stop(client) {
    client.stop((error, result) => {
      if (error) {
        this.logger.error("Failed to stop Riak client", error.message);
      } else {
        this.logger.info("Successfully stopped Riak client");
      }
    });
  }

  receiveMessage(content) {
    return new Promise((resolve, reject) => {
      const client = new Riak.Client(this.nodes, (error, c) => {
        if (error) {
          this.logger.error(`Failed to connect to Riak ${error}`);
          reject(false);
          return;
        }
        this.logger.info("Successfully connected to Riak");

        switch (content.action) {
          case "REGISTRATION":
            return this.handleRegistration(content, c)
              .then((result) => resolve(result));
          default:
            this.logger.warn(`Unexpected type ${content.action}.`);
            return resolve(true);
        }
      });
    });
  }

  handleRegistration(content, client) {
    return new Promise((resolve, reject) => {
      const datum = {
        bucketType: "counters",
        bucket: content.action,
        key: content.ip,
        increment: 1
      };
      client.updateCounter(datum, (error, result) => {
        if (error) {
          this.logger.error(`Failed to store value ${error}`);
          this.stop(client);
          resolve(false);
        } else {
          this.logger.info("Successfully stored value ", result);
          this.stop(client);
          resolve(true);
        }
      });
    });
  }
}

module.exports = RiakHandler;
