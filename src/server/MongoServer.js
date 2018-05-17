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

    // TODO: specify endpoints
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
        });
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
            .then((mongoResponse) => {
              this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
              const body = {
                statusCode: 200,
                message: mongoResponse
              };
              response.status(200)
                .send(body);
            })
            .catch((error) => {
              this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                statusCode: 500,
                message: `There was an issue looking up for course with id ${courseId}`
              };
              response.status(200)
                .send(body);
            });
        });
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
            .then((mongoResponse) => {
              this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
              const body = {
                statusCode: 200,
                message: mongoResponse
              };
              response.status(200)
                .send(body);
            })
            .catch((error) => {
              this.logger.error(`[ ${logTag} ] ${error.message}`);
            const body = {
                statusCode: 500,
                message: `There was an issue looking up for wish with id ${wishId}`
            };
              response.status(200)
                .send(body);
            });
        });
    });


    app.get("/wish", (request, response) => {
      const logTag = "WISH_FETCH";

      this.logger.info(`[ ${logTag} ] retrieving all wish`);
      MongoClient.connect(this.host)
        .then((client) => {
          const wishdb = client.db("coursebook").collection("wish");
          const searchQuery = {};
          wishdb.find(searchQuery).toArray()
            .then((mongoResponse) => {
              this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
              const body = {
                statusCode: 200,
                message: mongoResponse
              };
              response.status(200)
                .send(body);
            })
            .catch((error) => {
              this.logger.error(`[ ${logTag} ] ${error.message}`);
            const body = {
                statusCode: 500,
                message: `There was an issue looking up for all wish`
            };
              response.status(200)
                .send(body);
            });
        });
    });


    app.get("/course", (request, response) => {
      const search = decodeURI(request.query.search);

      if(search === 'undefined'){
        const logTag = "COURSE_FETCH";
        this.logger.info(`[ ${logTag} ] retrieving all courses`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("courses");
            const searchQuery = {};
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => {
                this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
                const body = {
                  statusCode: 200,
                  message: mongoResponse
                };
                response.status(200)
                  .send(body);
              })
              .catch((error) => {
                this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                  statusCode: 500,
                  message: `There was an issue looking up for all courses`
              };
                response.status(200)
                  .send(body);
              });
          });
      }else{
        const logTag = "COURSE_SEARCH"
        this.logger.info(`[ ${logTag} ] searching all courses ${search}`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("courses");
            const searchQuery = {
              name: {
                $regex: `.*${search}.*`,
                $options: 'si'
              }
            };
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => {
                this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
                const body = {
                  statusCode: 200,
                  message: mongoResponse
                };
                response.status(200)
                  .send(body);
              })
              .catch((error) => {
                this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                  statusCode: 500,
                  message: `There was an issue looking up for the course search`
              };
                response.status(200)
                  .send(body);
              });
          });
        }
    });

    app.get("/users", (request, response) => {
      const search = decodeURI(request.query.search);

      if(search === 'undefined'){
        const logTag = "USER_FETCH";
        this.logger.info(`[ ${logTag} ] retrieving all users`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("users");
            const searchQuery = {};
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => {
                this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
                const body = {
                  statusCode: 200,
                  message: mongoResponse
                };
                response.status(200)
                  .send(body);
              })
              .catch((error) => {
                this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                  statusCode: 500,
                  message: `There was an issue looking up for all users`
              };
                response.status(200)
                  .send(body);
              });
          });
      }else{
        const logTag = "USER_SEARCH"
        this.logger.info(`[ ${logTag} ] searching all users ${search}`);
        MongoClient.connect(this.host)
          .then((client) => {
            const coursedb = client.db("coursebook").collection("users");
            const searchQuery = {
              name: {
                $regex: `.*${search}.*`,
                $options: 'si'
              }
            };
            coursedb.find(searchQuery).toArray()
              .then((mongoResponse) => {
                this.logger.info(`[ ${logTag} ] ${JSON.stringify(mongoResponse)}`);
                const body = {
                  statusCode: 200,
                  message: mongoResponse
                };
                response.status(200)
                  .send(body);
              })
              .catch((error) => {
                this.logger.error(`[ ${logTag} ] ${error.message}`);
              const body = {
                  statusCode: 500,
                  message: `There was an issue looking up for the users search`
              };
                response.status(200)
                  .send(body);
              });
          });
        }
    });

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
