const express = require("express");
const redis = require("redis");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const rp = require("request-promise");
dotenv.config();

const MONGO_SERVER = process.env.MONGO_SERVER;

class RedisServer {
  constructor(host, port, logger) {
    this.client = redis.createClient(host);
    this.port = port;
    this.logger = logger;
    this.DEFAULT_EX = 300;
    this.listen = this.listen.bind(this);
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    app.get("/course/:courseId", (request, response) => {
      const logTag = "COURSE";
      const courseId = request.params.courseId;
      const uri = encodeURI(`${MONGO_SERVER}/course/${courseId}`);
      fetchData(logTag, "COURSE", courseId, uri, response);
    });

    app.get("/wish/:wishId", (request, response) => {
      const logTag = "WISH";
      const wishId = request.params.wishId;
      const uri = encodeURI(`${MONGO_SERVER}/wish/${id}`);
      fetchData(logTag, "WISH", wishId, uri, response);
    });

    const fetchData = (logTag, type, id, uri, response) => {
      this.logger.info(`[ ${logTag} ] retrieving ${type} with id ${id}`);
      this.client.get(id, (err, res) => {
        this.logger.info(`[ ${logTag} ] response ${res}`);
        if (err || res === null) {
          fetchDataFromMongo(logTag, id, uri, response);
        } else {
          response.status(200)
            .send({statusCode: 200, data: res});
        }
      });
    }

    const fetchDataFromMongo = (logTag, id, uri, response) => {
      const options = {
        method: "GET",
        uri: uri,
        json: true
      };
      rp(options)
        .then((mongoResponse) => {
          this.logger.info(`[ ${logTag} ] mongo responded with ${JSON.stringify(mongoResponse)}`);
          const message = JSON.stringify(mongoResponse.message);
          this.client.set(id, message, "EX", this.DEFAULT_EX);
          response.status(mongoResponse.statusCode)
            .send(mongoResponse);
        })
        .catch((error) => {
          this.logger.error(`[ ${logTag} ] ${error.message}`);
          response.status(500)
            .send({message : error.message});
        });
    };

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`Failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`RedisServer LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = RedisServer;
