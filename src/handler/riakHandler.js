const Riak = require("basho-riak-client");
const moment = require("moment");

class RiakHandler {
  constructor(nodes, logger) {
    this.nodes = nodes;
    this.logger = logger;

    this.receiveMessage.bind(this);
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
    const client = new Riak.Client(this.nodes, (error, c) => {
      if (error) {
        this.logger.error("Failed to connect to Riak", error.message);
        return;
      }
      this.logger.info("Successfully connected to Riak");

      const now = moment();
      const formatted = now.format("YYYY-MM-DD HH:mm:ss");
      const datum = {
        bucket: content.type,
        key: formatted,
        value: content
      }
      c.storeValue(datum, (error, result) => {
        if (error) {
          this.logger.error("Failed to store value", error.message);
        } else {
          this.logger.info("Successfully stored value ", result);
        }
        this.stop(c);
      });
    });

    // Riak is for session data.
    // It is ok to lose some.
    return true;
  }
}

module.exports = RiakHandler;
