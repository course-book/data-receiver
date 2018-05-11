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

    // TODO: specify endpoints

    app.get("/course/:courseId", (request, response) => {
      const logTag = "COURSE";
      const courseId = request.params.courseId;

      this.logger.info(`[ ${logTag} ] retrieving course with id ${courseId}`);
      this.client.get(courseId, (err, res) => {
        this.logger.info(`[ ${logTag} ] response ${res}`);
        if (err || res === null){
          handleMongoCourse(logTag, courseId, response)
        } else {
          response.status(200).send({statusCode: 200, data: res});
        }
        });
      });


    app.get("/wish/:wishId", (request, response) => {
      const logTag = "WISH";
      const wishId = request.params.wishId;

      this.logger.info(`[ ${logTag} ] retrieving wish with id ${wishId}`);
      this.client.get(wishId, (err, res) => {
        this.logger.info(`[ ${logTag} ] response ${res}`);
        if(err || res === null){
          handleMongoWish(logTag, wishId, response)
        } else {
          response.status(200).send({statusCode: 200, data: res});
        }
        });
      });

    const handleMongoCourse = (logTag, courseId, response) => {
      const options = {
        method: "GET",
        uri: encodeURI(`${MONGO_SERVER}/course/${courseId}`),
        json: true
      }
      rp(options)
        .then((mongoResponse) => {
          this.logger.info(`[ ${logTag} ] mongo responded with ${JSON.stringify(mongoResponse)}`);
          let message = JSON.stringify(mongoResponse.message);
          this.client.set(courseId, message, "EX", this.DEFAULT_EX)
          response.status(mongoResponse.statusCode)
            .send(mongoResponse);
        })
        .catch((error) => {
          this.logger.error(`[ ${logTag} ] ${error.message}`);
          response.status(500).send({message : error.message});
        })
    }

    const handleMongoWish = (logTag, wishId, response) => {
      const options = {
        method: "GET",
        uri: encodeURI(`${MONGO_SERVER}/wish/${wishId}`),
        json: true
      }
      rp(options)
        .then((mongoResponse) => {
          this.logger.info(`[ ${logTag} ] mongo responded with ${mongoResponse}`);
          let message = JSON.stringify(mongoResponse.message);
          this.client.set(courseId, message, "EX", this.DEFAULT_EX)
          response.status(mongoResponse.statusCode)
            .send(mongoResponse);
        })
        .catch((error) => {
          this.logger.error(`[ ${logTag} ] ${error.message}`);
          response.status(500).send({message : error.message});
        })
    }

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
