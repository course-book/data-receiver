const express = require("express");
const bodyParser = require("body-parser");

class RiakServer {
  constructor(host, port, logger) {
    this.host = host;
    this.port = port;
    this.logger = logger;

    this.listen = this.listen.bind(this);
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    app.get("/ping", (request, response) => {
      const logTag = "PING";
      this.logger.info(`[ ${logTag} ] ping request`);
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
