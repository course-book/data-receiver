
const redis = require("redis")
const dotenv = require("dotenv");
dotenv.config();

class RedisHandler {
  constructor(host, responseEndpoint, logger) {
    this.host = host;
    this.logger = logger;
    this.responseEndpoint = responseEndpoint;
    this.client = redis.createClient(host);
    this.logger.info("[ REDIS ] connected to client")

    this.handleRedisDown = this.handleRedisDown.bind(this);
    this.respond = this.respond.bind(this);
  }

  recieveMessage(message) {
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
  }

  handleCourseUpdate(client, content, resolve) {
    const logTag = "COURSE_INVALIDATE";
    this.logger.info(`[ ${logTag} ] invalidating my course`)
    key = content.courseId;
    client.del(key, (err, res) => {
      if(err) {
        if(err.code === "NR_CLOSED") {
          resolve(false);
          return;
        }
        this.logger.error(`[ ${logTag} ] client passed invalid command ${err.command} with code ${err.code}`)
      } else {
        if(res = 1) {
            this.logger.info(`[ ${logTag} ] course invalidated with id ${content.uuid}`);
        } else {
            this.logger.info(`[ ${logTag} ] Course with id ${content.courseId} not found`);
        }
      }
    };
    resolve(true);
  }

  handleWishUpdate(client, content, resolve) {
    const logTag = "WISH_INVALIDATE";
    this.logger.info(`[ ${logTag} ] invalidating my course`)
    key = content.wishId;
    client.del(key, (err, res) => {
      if(err) {
        if(err.code === "NR_CLOSED") {
          resolve(false);
          return;
        }
        this.logger.error(`[ ${logTag} ] client passed invalid command ${err.command} with code ${err.code}`)
      } else {
        if(res = 1) {
            this.logger.info(`[ ${logTag} ] wish invalidated with id ${content.uuid}`);
        } else {
            this.logger.info(`[ ${logTag} ] wish with id ${content.courseId} not found`);
        }
      }
    };
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
