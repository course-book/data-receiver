const express = require("express");
const MongoClient = require("mongodb");
const bodyParser = require("body-parser");

class MongoServer {
  constructor(host, port, logger) {
    this.host = host;
    this.port = port;
    this.logger = logger;

    this.listen = this.listen.bind(this);
  }

  listen() {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    app.post("/login", (request, response) => {
      const logTag = "LOGIN";
      const body = request.body;
      const username = body.username;
      const password = body.password;

      this.logger.info(`[ ${logTag} ] ${request.ip}`);

      MongoClient.connect(this.host)
        .then((client) => {
          const userdb = client.db("coursebook").collection("users");
          const searchQuery = {username, password};
          userdb.findOne(searchQuery)
            .then((mongoResponse) => {
              this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
              let body;
              if (mongoResponse) {
                body = {
                  authorized: true,
                  statusCode: 200,
                  message: `User authorized.`
                };
              } else {
                body = {
                  authorized: false,
                  statusCode: 401,
                  message: `Username or password is incorrect.`
                };
              }
              response.status(200)
                .send(body);
            })
            .catch((error) => {
              this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                authorized: false,
                statusCode: 500,
                message: `There was an issue authorizing user ${username}.`
              };
              response.status(200)
                .send(body);
            });
        })
        .catch((error) => handleMongoDown(logTag, error, response));
    });

    app.get("/course/:id", (request, response) => {
      const logTag = "COURSE";
      const courseId = request.params.id;

      this.logger.info(`[ ${logTag} ] retrieving course with id ${courseId}`);
      MongoClient.connect(this.host)
        .then((client) => {
          const coursedb = client.db("coursebook").collection("courses");
          const objectId = new MongoClient.ObjectId(courseId);
          const searchQuery = {_id: objectId};
          coursedb.findOne(searchQuery)
            .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
            .catch((error) => handleError(logTag, error, `There was an issue looking up for course with id ${courseId}`, response));
        })
        .catch((error) => handleMongoDown(logTag, error, response));
    });

    app.get("/wish/:id", (request, response) => {
      const logTag = "WISH";
      const wishId = request.params.id;

      this.logger.info(`[ ${logTag} ] retrieving wish with id ${wishId}`);
      MongoClient.connect(this.host)
        .then((client) => {
          const wishdb = client.db("coursebook").collection("wish");
          const objectId = new MongoClient.ObjectId(wishId);
          const searchQuery = {_id: objectId};
          wishdb.findOne(searchQuery)
            .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
            .catch((error) => handleError(logTag, error, `There was an issue looking up for wish with id ${wishId}`, response));
        })
        .catch((error) => handleMongoDown(logTag, error, response));
    });

    app.get("/wish", (request, response) => {
      const search = decodeURI(request.query.search);

      if (search == "undefined"){
        const logTag = "WISH_FETCH";

        this.logger.info(`[ ${logTag} ] retrieving all wish`);
        MongoClient.connect(this.host)
          .then((client) => {
            const wishdb = client.db("coursebook").collection("wish");
            const searchQuery = {};
            wishdb.find(searchQuery).toArray()
              .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
              .catch((error) => handleError(logTag, error, "There was an issue searching for all wishes", response));
          });
      } else {
        const logTag = "WISH_SEARCH";

        this.logger.info(`[ ${logTag} ] searching all wishes ${search}`);
        MongoClient.connect(this.host)
          .then((client) => {
            const wishdb = client.db("coursebook").collection("wish");
            const searchQuery = {
              name: {
                    $regex: `.*${search}.*`,
                    $options: "si"
              }
            };
            wishdb.find(searchQuery).toArray()
              .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
              .catch((error) => handleError(logTag, error, `There was an issue searching for wish ${search}`, response));
          });
      }
    });

    app.get("/wish/user/:username", (request, response) => {
      const logTag = "WISH_MATCH";
      const username = request.params.username;

      this.logger.info(`[ ${logTag} ] matching all completed but not notified wishes for ${username}`);
      MongoClient.connect(this.host)
        .then((client) => {
          const wishdb = client.db("coursebook").collection("wish");
          const searchQuery = {
            wisher: username,
            complete: true,
            notify: false
          };
          wishdb.find(searchQuery).toArray()
            .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
            .catch((error) => handleError(logTag, error, `There was an issue looking up for the completed but not notified wishes for user ${username}`, response));
        });
    });

    app.get("/course", (request, response) => {
      const search = decodeURI(request.query.search);

      if (search === "undefined") {
        const logTag = "COURSE_FETCH";
        this.logger.info(`[ ${logTag} ] retrieving all courses`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("courses");
            const searchQuery = {};
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
              .catch((error) => handleError(logTag, error, "There was an issue fetching all courses", response));
          })
          .catch((error) => handleMongoDown(logTag, error, response));
      } else {
        const logTag = "COURSE_SEARCH"
        this.logger.info(`[ ${logTag} ] searching all courses ${search}`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("courses");
            const searchQuery = {$or:
              [
                {
                  name: {
                    $regex: `.*${search}.*`,
                    $options: "si"
                  }
                },
                {
                  author:{
                      $regex: `.*${search}.*`,
                      $options: "si"
                  }
                }
              ]
            };
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
              .catch((error) => handleError(logTag, error, `There was an issue searching for course ${search}`, response));
          })
          .catch((error) => handleMongoDown(logTag, error, response));
        }
    });

    app.get("/users", (request, response) => {
      const search = decodeURI(request.query.search);

      if (search !== "undefined"){
        const logTag = "USER_SEARCH"
        this.logger.info(`[ ${logTag} ] searching all users ${search}`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("users");
            const searchQuery = {
              username: {
                $regex: `.*${search}.*`,
                $options: "si"
              }
            };
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => handleResponse(logTag, mongoResponse, response))
              .catch((error) => handleError(logTag, error, "There was an issue searching for users", response));
          })
          .catch((error) => handleMongoDown(logTag, error, response));
        }
    });

    const handleResponse = (logTag, message, response) => {
      this.logger.info(`[ ${logTag} ] ${JSON.stringify(message)}`);
      const body = {
        statusCode: 200,
        message: message
      };
      response.status(200)
        .send(body);
    };

    const handleError = (logTag, error, message, response) => {
      this.logger.error(`[ ${logTag} ] ${error.message}`);
      const body = {
          statusCode: 500,
          message: message
      };
      response.status(200)
        .send(body);
    };

    const handleMongoDown = (logTag, error, response) => {
      handleError(logTag, error, "Mongo is down", response);
    };

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`[ INIT ] failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`[ INIT ] mongo server LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = MongoServer;
