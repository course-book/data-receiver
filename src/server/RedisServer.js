const express = require("express");
const redis = require("redis");
const bodyParser = require("body-parser");

class RedisServer {
  constructor(host, port, logger) {
    this.client = redis.createClient(port, host);
    this.logger = logger;
    this.DEFAULT_EX = 300;
    this.listen = this.listen.bind(this);
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    // TODO: specify endpoints

    app.get("/course/fetch/:courseId", (request, response) => {
      const logTag = "COURSE";
      const courseId = request.params.courseId;

      this.logger.info(`[ ${logTag} ] retrieving course with id ${courseId}`);
      this.client.get(courseId, (err, res) => {
        if(err || res === null){
          handleMongoCourse(logTag, courseId, response)
        } else {
          response.status(200).send(JSON.parse(res));
        }
        });
      });


    app.get("/wish/fetch/:wishId", (request, response) => {
      const logTag = "WISH";
      const wishId = request.params.wishId;

      this.logger.info(`[ ${logTag} ] retrieving wish with id ${wishId}`);
      this.client.get(wishId, (err, res) => {
        if(err || res === null){
          handleMongoWish(logTag, wishId, response)
        } else {
          response.status(200).send(JSON.parse(res));
        }
        });
      });

    const handleMongoCourse = (logTag, courseId, response) => {
      const options = {
        method: "GET",
        uri: encodeURI(`${MONGO_HOST}/course/${courseId}`),
        json = true
      }
      rp(options)
        .then((mongoResponse) => {
          logger.info(`[ ${logTag} ] mongo responded with ${mongoResponse}`);
          let message = mongoResponse;
          client.set(courseId, mongoResponse.message, this.DEFAULT_EX)
          response.status(mongoResponse.statusCode)
            .send({message : mongoResponse.message});
        })
        .catch((error) => {
          logger.error(`[ ${logTag} ] ${error.message}`);
          response.status(500).send({message : error.message});
        })
    }

    const handleMongoWish = (logTag, wishId, response) => {
      const options = {
        method: "GET",
        uri: encodeURI(`${MONGO_HOST}/wish/${wishId}`),
        json = true
      }
      rp(options)
        .then((mongoResponse) => {
          logger.info(`[ ${logTag} ] mongo responded with ${mongoResponse}`);
          let message = mongoResponse;
          client.set(courseId, mongoResponse.message, this.DEFAULT_EX)
          response.status(mongoResponse.statusCode)
            .send({message : mongoResponse.message});
        })
        .catch((error) => {
          logger.error(`[ ${logTag} ] ${error.message}`);
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
