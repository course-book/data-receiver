const dotenv = require("dotenv");
const MongoClient = require("mongodb");
const request = require("request");
dotenv.config();

class MongoHandler {
  constructor(host, logger) {
    this.host = host;
    this.logger = logger;
  }

  receiveMessage(content) {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this.host, (error, c) => {
        if (error) {
          this.logger.error("Could not connect to MongoClient", error.message);
          request.post('http://433-12.csse.rose-hulman.edu:15672/#/', {
            json: {
              uuid: content.uuid,
              statuscode: "100",
              message: 'REGISTRATION_DOWN'
            }
          }, (error, response, body) => {
            if (error) {
              this.logger.error(error.message);
            } else if (response.statusCode == 200) {
              this.logger.info(body);
            }
          });
          resolve(false);
          return;
        } else {
          this.logger.info("connected to MongoClient");
        }

        const userdb = c.collection('users');

        switch (content.action) {
          case 'REGISTRATION':
            const datum = {
              username: content.username,
              password: content.password,
              uuid: content.uuid
            };
            if (userdb.find({"username": datum.username}).count() > 0) {
              request.post('http://433-12.csse.rose-hulman.edu:15672/#/', {
                json: {
                  uuid: datum.uuid,
                  statuscode: "400",
                  message: 'REGISTRATION_FAILURE'
                }
              }, (error, response, body) => {
                if (error) {
                  this.logger.error(error.message)
                } else if (response.statusCode == 200) {
                  this.logger.info(body)
                }
                resolve(true);
                return;
              });
            } else {
              writeresult = userdb.insert(datum);
              if (writeresult.nInserted == 1) {
                request.post('http://433-12.csse.rose-hulman.edu:15672/#/', {
                  json: {
                    uuid: datum.uuid,
                    statuscode: "200",
                    message: "REGISTRATION_SUCCESS"
                  }
                }, (error, response, body) => {
                  if (error) {
                    this.logger.error(error.message)
                  } else if (response.statusCode == 200) {
                    this.logger.info(body)
                  }
                });
              } else {
                request.post('http://433-12.csse.rose-hulman.edu:15672/#/', {
                  json: {
                    uuid: datum.uuid,
                    statuscode: "500",
                    message: "REGISTRATION_FAILURE"
                  }
                }, (error, response, body) => {
                  if (error) {
                    this.logger.error(error.message)
                  } else if (response.statusCode == 200) {
                    this.logger.info(body)
                  }
                });
              }
              resolve(true);
            }
          default:
            this.logger.warn(`Unexpected type ${content.action}.`);
            return resolve(true);
        }
      });
    });
  }
}

module.exports = MongoHandler;
