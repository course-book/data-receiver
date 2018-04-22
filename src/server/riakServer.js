const express = require("express");
const bodyParser = require("body-parser");

class RiakServer {
  constructor(port, logger) {
    this.port = port;
    this.logger = logger;
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    app.get("/ping", (request, response) => {
      this.logger.info("[ GET ] ping request");
      response.status(200).send("pong");
    });

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`Failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`RiakServer LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = RiakServer;