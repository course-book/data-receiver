const express = require("express");
const bodyParser = require("body-parser");

class MongoServer {
  constructor(port, logger) {
    this.port = port;
    this.logger = logger;
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    // TODO: specify endpoints

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`Failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`MongoServer LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = MongoServer;
