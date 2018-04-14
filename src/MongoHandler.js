/**
 * 
 */
const dotenv = require("dotenv");
dotenv.config();

class MongoHandler {
  constructor(host, logger) {
    this.host = host;
    this.logger = logger;
  }

  recieveMessage(routingKey, message) {
    return false;
  }
}

module.exports = MongoHandler;