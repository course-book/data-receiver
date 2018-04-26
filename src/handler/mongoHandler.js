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
          this.logger.info("connected to MongoClient");

          switch (content.action) {
            case "REGISTRATION":
              const userdb = client.db("coursebook").collection("users");
              this.handleRegistration(userdb, content, resolve);
              break;
            case "COURSE_CREATE":
              const userdb = client.db("coursebook").collection("courses");
              this.handleCourseCreation(userdb, content, resolve);
              break;
            default:
              this.logger.warn(`Unsupported action ${content.action}`);
              resolve(true);
          }
        })
        .catch((error) => this.handleMongoDown(content, error, resolve));
    });
  }

  handleMongoDown(content, error, resolve) {
    this.logger.error(`Could not connect to MongoClient. Message: ${error.message}`);
    const body = {
      json: {
        uuid: content.uuid,
        statuscode: 102,
        message: "Registration is down. The registration request will be processed once it is back up."
      }
    };
    this.respond(body, resolve);
  }

  handleCourseCreation(userdb, content, resolve) {
    const searchQuery = {coursename: content.coursename, username: content.username};
    const updateQuery = {
      $setOnInsert: {
        coursename: content.coursename,
        username: content.username,
        shortdesc: content.shortdescription,
        description: content.description,
        reviews: [],
        wish: []
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
        if(response.upsertedCount === 0) {
          this.logger.info(`course ${content.coursename} by ${content.username} already exists`);
          body.statusCode = 409;
          body.message = "Course by that title already exists. Please try another.";
        } else {
          this.logger.info(`created course ${content.coursename} by ${content.username}`);
          body.statusCode = 201;
          body.message = "Course was successfully created.";
        }
        this.respond(body, resolve);
      })
      .catch((error) => {
        this.logger.error(`Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleRegistration(userdb, content, resolve) {
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
          this.logger.info(`user ${content.username} already exists`);
          body.statusCode = 409;
          body.message = "Username already exists. Please try another.";
        } else {
          this.logger.info(`created user ${content.username}`);
          body.statusCode = 201;
          body.message = "User was successfully created.";
        }
        this.respond(body, resolve);
      })
      .catch((error) => {
        this.logger.error(`Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  respond(body, resolve) {
    const options = {
      method: "POST",
      uri: this.responseEndpoint,
      body: body,
      json: true
    };
    rp(options)
      .then((body) => {
        this.logger.info(`Response success.`);
        resolve(true);
      })
      .catch((error) => {
        this.logger.error(`Response error ${error.message}`);
        resolve(false);
      });
  }
}

module.exports = MongoHandler;
