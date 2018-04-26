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
      const body = request.body;
      const username = body.username;
      const password = body.password;

      this.logger.info(`[ LOGIN ] ${request.ip}`);

      MongoClient.connect(this.host)
        .then((client) => {
          const userdb = client.db("coursebook").collection("users");
          const searchQuery = {username, password};
          userdb.findOne(searchQuery)
            .then((mongoResponse) => {
              this.logger.info(`[ LOGIN ] ${JSON.stringify(mongoResponse)}`);
              if (mongoResponse) {
                const body = {
                  authorized: true,
                  statusCode: 200,
                  message: `User authorized.`
                };
                response.status(200)
                  .send(body);
              } else {
                const body = {
                  authorized: false,
                  statusCode: 401,
                  message: `Username or password is incorrect.`
                };
                response.status(200)
                  .send(body);
              }
            })
            .catch((error) => {
              this.logger.error(`[ LOGIN ] ${error.message}`);
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

    app.listen(this.port, (error) => {
      if (error) {
        this.logger.error(`Failed to start server: ${error.message}`);
        return;
      } else {
        this.logger.info(`MongoServer LIVE on port ${this.port}`);
      }
    });
  }
}

module.exports = MongoServer;
