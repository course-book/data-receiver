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

    app.get("/login/:ip", (request, response) => {
      const logTag = "LOGIN";
      this.logger.info(`[ ${logTag} ] login stats for ${request.params.ip}`);

      const client = new Riak.Client(this.nodes, (error, c) => {
        if (error) {
          handleRiakDown(logTag, response, error);
          return;
        }
        this.logger.info(`[ ${logTag} ] successfully connected to riak`);

        const options = {
          bucketType: "maps",
          bucket: "LOGIN",
          key: request.params.ip
        };
        c.fetchMap(options, (error, riakResponse, data) => {
          if (error) {
            handleError(logTag, error, data, response);
            return;
          }

          this.logger.info(`[ ${logTag} ] response ${JSON.stringify(riakResponse)}`);
          response.status(200)
            .send(riakResponse);
        });
      });
    });

    app.get("/registration/:ip", (request, response) => {
      fetchCounter("REGISTRATION", "REGISTRATION", request.params.ip, response);
    });

    app.get("/course/create/:username", (request, response) => {
      fetchCounter("COURSE", "COURSE_CREATE", request.params.username, response);
    });

    app.get("/course/fetch/:courseId", (request, response) => {
      fetchCounter("COURSE", "COURSE_FETCH", request.params.courseId, response);
    });

    app.get("/course/update/:courseId", (request, response) => {
      fetchCounter("COURSE", "COURSE_UPDATE", request.params.courseId, response);
    });

    app.get("/course/delete/:username", (request, response) => {
      fetchCounter("COURSE", "COURSE_DELETE", request.params.username, response);
    });

    app.get("/wish/create/:username", (request, response) => {
      fetchCounter("WISH", "WISH_CREATE", request.params.username, response);
    });

    app.get("/wish/fetch/:wishId", (request, response) => {
      fetchCounter("WISH", "WISH_FETCH", request.params.wishId, response);
    });

    app.get("/wish/update/:wishId", (request, response) => {
      fetchCounter("WISH", "WISH_UPDATE", request.params.wishId, response);
    });

    app.get("/wish/delete/:username", (request, response) => {
      fetchCounter("WISH", "WISH_DELETE", request.params.username, response);
    });

    const fetchCounter = (logTag, type, key, response) => {
      this.logger.info(`[ ${logTag} ] ${type} stats for ${key}`);

      const client = new Riak.Client(this.nodes, (error, c) => {
        if (error) {
          handleRiakDown(logTag, response, error);
          return;
        }
        this.logger.info(`[ ${logTag} ] successfully connected to riak`);

        const options = {
          bucket: type,
          bucketType: "counters",
          key: key,
        };
        client.fetchCounter(options, (error, riakResponse, data) => {
          if (error) {
            handleError(logTag, error, data, response);
            return;
          }
          this.logger.info(`[ ${logTag} ] response ${JSON.stringify(riakResponse)}`);
          response.status(200)
            .send(riakResponse);
        });
      });
    };

    const handleRiakDown = (logTag, response, error) => {
      this.logger.error(`[ ${logTag} ] ${error.messages}`);
      response.status(500)
        .send(error.message);
      return;
    }

    const handleError = (logTag, error, data, response) => {
      this.logger.error(`[ ${logTag} ] ${error} with data ${data}`);
      response.status(500)
        .send(`Riak Error: ${error.message} with data ${data}`);
        return;
    }

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
