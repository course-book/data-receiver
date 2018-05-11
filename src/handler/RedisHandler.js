
const redis = require("redis");
const dotenv = require("dotenv");
dotenv.config();

class RedisHandler {
  constructor(host, logger) {
    this.host = host;
    this.logger = logger;
    this.client = redis.createClient(host);
    this.logger.info("[ REDIS ] connected to client");

    this.receiveMessage = this.receiveMessage.bind(this);
  }

  receiveMessage(content) {
    return new Promise((resolve, reject) => {
      switch (content.action) {
        case "COURSE_DELETE":
        case "COURSE_UPDATE":
        case "WISH_DELETE":
        case "WISH_UPDATE":
          this.handleUpdateOrDelete(this.client, content, resolve);
          break;
        default:
          this.logger.warn(`Unsupported action ${content.action}`);
          resolve(true);
      }
    });
  }

  handleUpdateOrDelete(client, content, resolve) {
    const logTag = "INVALIDATE";
    this.logger.info(`[ ${logTag} ] invalidating`)
    const key = content.id;
    client.del(key, (err, res) => {
      if (err) {
        if (err.code === "NR_CLOSED") {
          resolve(false);
          return;
        }
        this.logger.error(`[ ${logTag} ] client passed invalid command ${err.command} with code ${err.code}`);
      } else {
        if (res === 1) {
            this.logger.info(`[ ${logTag} ] ${content.action} invalidated with id ${key}`);
        } else {
            this.logger.info(`[ ${logTag} ] ${content.action} with id ${key} not found`);
        }
      }
    });
    resolve(true);
  }
}

module.exports = RedisHandler;
