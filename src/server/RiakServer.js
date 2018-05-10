const Riak = require("basho-riak-client");
const express = require("express");
const bodyParser = require("body-parser");

class RiakServer {
  constructor(nodes, port, logger) {
    this.nodes = nodes;
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

    app.get("/registration/:ip", (request, response) => {
      const logTag = "REGISTRATION";
      this.logger.info(`[ ${logTag} ] registration stats for ${request.params.ip}`);

      const client = new Riak.Client(this.nodes, (error, c) => {
        if (error) {
          this.logger.error(`[ ${logTag} ] ${error.message}`);
          response.status(500)
            .send(error.message);
          return;
        }
        this.logger.info(`[ ${logTag} ] successfully connected to riak`);

        const options = {bucket: "REGISTRATION", bucketType: "counters", key: request.params.ip};
        client.fetchCounter(options, (error, riakResponse, data) => {
          if (error) {
            this.logger.error(`[ ${logTag} ] ${error.message} with data ${data}`);
            response.status(500)
              .send(`Riak Error: ${error.message} with data ${data}`);
              return;
          }
          this.logger.info(`[ ${logTag} ] response ${JSON.stringify(riakResponse)}`);
          response.status(200)
            .send(riakResponse);
          return;
        })
      });
    });

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`[ INIT ] failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`[ INIT ] RiakServer LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = RiakServer;
