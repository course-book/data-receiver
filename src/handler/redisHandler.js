
const dotenv = require("dotenv");
dotenv.config();

class RedisHandler {
  constructor(host, logger) {
    this.host = host;
    this.logger = logger;
  }

  recieveMessage(message) {
    return Promise.resolve(true);
  }
}

module.exports = RedisHandler;