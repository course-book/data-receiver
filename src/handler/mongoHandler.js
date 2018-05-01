const MongoClient = require("mongodb");
const rp = require("request-promise");

class MongoHandler {
  constructor(host, responseEndpoint, logger) {
    this.host = host;
    this.logger = logger;
    this.responseEndpoint = responseEndpoint;

    this.handleMongoDown = this.handleMongoDown.bind(this);
    this.respond = this.respond.bind(this);
  }

  receiveMessage(content) {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this.host)
        .then((client) => {
          this.logger.info("[ MONGO ] connected to client");

          switch (content.action) {
            case "REGISTRATION":
              const userdb = client.db("coursebook").collection("users");
              this.handleRegistration(userdb, content, resolve);
              break;
            case "COURSE_CREATE":
              const coursedb = client.db("coursebook").collection("courses");
              this.handleCourseCreation(coursedb, content, resolve);
              break;
            case "WISH_CREATE":
              const wishdb = client.db("coursebook").collection("wishes");
              this.handleWishCreation(wishdb, content, resolve);
              break;
            case "WISH_UPDATE":
              const wishdb = client.db("coursebook").collection("wishes");
              this.handleWishUpdate(wishdb, content, resolve);
              break;
            case "WISH_DELETE":
              const wishdb = client.db("coursebook").collection("wishes");
              this.handleWishDelete(wishdb, content, resolve);
              break;
            default:
              this.logger.warn(`Unsupported action ${content.action}`);
              resolve(true);
          }
        })
        .catch((error) => this.handleMongoDown(content, error, resolve));
    });
  }

  handleMongoCreate(db, content, resolve, logTag, searchQuery, updateQuery, callback) {
    const logTag = logTag
    this.logger.info(`[ ${logTag} ] handling ${content.action}`);
    const options = {upsert: true};
    coursedb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        if (response.upsertedCount === 0) {
          this.logger.info(`[ ${logTag} ] failMessage`);
          resolve(false);
        } else {
          this.logger.info(`[ ${logTag} ] passMessage`);
          resolve(true);
        }
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleMongoRemove(db, content, resolve, logTag, searchQuery, failMessage, passMessage) {
      const logTag = logTag
      this.logger.info(`[ ${logTag} ] handling ${content.action}`);
      coursedb.deleteOne(searchQuery)
        .then((response) => {
          if (response.deletedCount === 0) {
            this.logger.info(`[ ${logTag} ] failMessage`);
          } else {
            this.logger.info(`[ ${logTag} ] passMessage`);
          }
          resolve(true);
        })
        .catch((error) => {
          this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
          resolve(false);
        });
  }

  handleWishCreation(wishdb, content, resolve) {
    const logTag = "WISH"
    this.logger.info(`[ ${logTag} ] handling wish creation`);
    const searchQuery = {name: content.name, wisher: content.wisher};
    const updateQuery = {
      $setOnInsert: {
        name: content.name,
        details: content.details,
        wisher: content.wisher
       }
    };
    const options = {upsert: true};
    coursedb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        const body = {
            uuid: content.uuid,
            action: content.action
        };
        if (response.upsertedCount === 0) {
          this.logger.info(`[ ${logTag} ] wish ${content.name} by ${content.wisher} already exists`);
          body.statusCode = 409;
          body.message = "Wish by that title for this user already exists. Please try again.";
        } else {
          this.logger.info(`[ ${logTag} ] created wish ${content.name} by ${content.wisher}`);
          body.statusCode = 201;
          body.message = "Wish was successfully created.";
        }
        this.respond(logTag, body, resolve);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleWishUpdate(wishdb, content, resolve) {
    const logTag = "WISH"
    this.logger.info(`[ ${logTag} ] handling wish update`);
    const searchQuery = {_id: content.wishId};
    const updateQuery = {
      $set: {
        name : content.name,
        details: content.details
       }
    };
    const options = {upsert: false};
    coursedb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        if (response.modifiedCount === 0) {
          this.logger.info(`[ ${logTag} ] wish ${content.name} by ${content.wisher} doesn't exist with id ${content.wishId}`);
          resolve(false);
        } else {
          this.logger.info(`[ ${logTag} ] Updated wish ${content.name} by ${content.wisher} with id ${content.wishId}`);
          resolve(true);
        }
        this.respond(logTag, body, resolve);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleWishDelete(wishdb, content, resolve) {
    const logTag = "WISH"
    this.logger.info(`[ ${logTag} ] handling wish deletion`);
    const searchQuery = {_id : content.wishId};
    coursedb.deleteOne(searchQuery)
      .then((response) => {
        if (response.deletedCount === 0) {
          this.logger.info(`[ ${logTag} ] Wish with id ${content.wishId} does not exist`);
          resolve(false);
        } else {
          this.logger.info(`[ ${logTag} ] Deleted wish with id ${content.wishId}`);
          resolve(true);
        }
        this.respond(logTag, body, resolve);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleMongoDown(content, error, resolve) {
    this.logger.error(`[ DOWN ] Could not connect to MongoClient. Message: ${error.message}`);
    const body = {
      json: {
        uuid: content.uuid,
        statuscode: 102,
        message: "Registration is down. The registration request will be processed once it is back up."
      }
    };
    this.respond(logTag, body, resolve);
  }

  handleRegistration(userdb, content, resolve) {
    const logTag = "REGISTRATION";
    const searchQuery = {username: content.username};
    const updateQuery = {
      $setOnInsert: {
        username: content.username,
        password: content.password,
        reviews: [],
        subscriptions: []
      }
    };
    const options = {upsert: true};
    userdb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        const body = {
          uuid: content.uuid,
          username: content.username,
          action: content.action
        };
        if (response.upsertedCount === 0) {
          this.logger.info(`[ ${logTag} ] user ${content.username} already exists`);
          body.statusCode = 409;
          body.message = "Username already exists. Please try another.";
        } else {
          this.logger.info(`[ ${logTag} ] created user ${content.username}`);
          body.statusCode = 201;
          body.message = "User was successfully created.";
        }
        this.respond(logTag, body, resolve);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleCourseCreation(coursedb, content, resolve) {
    const logTag = "COURSE"
    this.logger.info(`[ ${logTag} ] handling course creation`);
    const searchQuery = {name: content.name, author: content.author};
    const updateQuery = {
      $setOnInsert: {
        name: content.name,
        author: content.author,
        shortDescription: content.shortDescription,
        description: content.description,
        sources: content.sources,
        reviews: [],
        wish: []
       }
    };
    const options = {upsert: true};
    coursedb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        const body = {
            uuid: content.uuid,
            action: content.action
        };
        if (response.upsertedCount === 0) {
          this.logger.info(`[ ${logTag} ] course ${content.name} by ${content.author} already exists`);
          body.statusCode = 409;
          body.message = "Course by that title already exists. Please try another.";
        } else {
          this.logger.info(`[ ${logTag} ] created course ${content.name} by ${content.author}`);
          body.statusCode = 201;
          body.message = "Course was successfully created.";
        }
        this.respond(logTag, body, resolve);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
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

module.exports = MongoHandler;
