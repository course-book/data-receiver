
const redis = require("redis")
const dotenv = require("dotenv");
dotenv.config();

class RedisHandler {
  constructor(host, responseEndpoint, logger) {
    this.host = host;
    this.logger = logger;
    this.responseEndpoint = responseEndpoint;

    this.handleRedisDown = this.handleRedisDown.bind(this);
    this.respond = this.respond.bind(this);
  }

  recieveMessage(message) {
    return new Promise((resolve, reject) => {
      redis.createClient(this.host)
        .then((client) => {
          this.logger.info("[ REDIS ] connected to client");

          switch (content.action) {
            case "COURSE_UPDATE":
              dbset = "course";
              this.handleCourseUpdate(client, content, resolve);
              break;
            case "WISH_UPDATE":
              dbset = "wish";
              this.handleWishUpdate(client, dbset content, resolve);
              break;
            default:
              this.logger.warn(`Unsupported action ${content.action}`);
              resolve(true);
          }
        })
    });
  }

  handleCourseCreation(client, dbset, content, resolve) {
    const logTag = "COURSE_CREATE"
    this.logger.info(`[ ${logTag} ] handling course creation`);
    key = "courses.name:"+content.name+":author:"+content.author;
    exists = client.sismember(courses, key);
    if(exists === 1) {
        this.logger.info(`[ ${logTag} ] course ${content.name} by ${content.author} already exists`);
        body.statusCode = 409;
        body.message = "Course by that title already exists. Please try another.";
    } else {
        this.logger.info(`[ ${logTag} ] created course ${content.name} by ${content.author}`);
        body.statusCode = 201;
        body.message = "Course was successfully created.";
        client.multi();
        client.hmset(key, name, content.name, author, content.author, shortDescription, content.shortDescription,
              description, content.description, sources, content.sources, reviews, [],
              wish, content.wish);
        client.sadd(dbset, key);
        client.exec();
        this.respond(logTag, body, resolve);
    }
  };

  handleCourseUpdate(client, content, resolve) {
    const logTag = "COURSE_INVALIDATE";
    this.logger.info(`[ ${logTag} ] invalidating my course`)
    key = content.uuid;
    client.srem("courses", key);
    success = client.del(key);
    if(success = 1) {
        this.logger.info(`[ ${logTag} ] course invalidated with id ${content.uuid}`);
    } else {
        this.logger.info(`[ ${logTag} ] Course with id ${content.courseId} not found`);
    }
    resolve(true);
  }

  handleWishUpdate(client, content, resolve) {
    const logTag = "WISH_INVALIDATE";
    this.logger.info(`[ ${logTag} ] invalidating my wish`)
    key = content.uuid;
    client.srem("wishes", key);
    success = client.del(key);
    if(success = 1) {
        this.logger.info(`[ ${logTag} ] wish invalidated with id ${content.uuid}`);
    } else {
        this.logger.info(`[ ${logTag} ] wish with id ${content.courseId} not found`);
    }
    resolve(true);
  }

  handleRedisDown(content, error, resolve) {
    this.logger.error(`[ DOWN ] Could not connect to RedisClient. Message: ${error.message}`);
    const body = {
      json: {
        uuid: content.uuid,
        statuscode: 102,
        message: "Cache is down"
      }
    };
    this.respond(logTag, body, resolve);
  }

  respond(logTag, body, resolve) {
    const options = {
      method: "POST",
      uri: this.responseEndpoint,
      body: body,
      json: true
    };
    rp(options)
      .then((body) => {
        this.logger.info(`[ ${logTag} ] response success: ${body}`);
        resolve(true);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] response error ${error.message}`);
        resolve(false);
      });
  }
}

module.exports = RedisHandler;
