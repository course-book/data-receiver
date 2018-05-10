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
          const wishdb = client.db("coursebook").collection("wish");
          const coursedb = client.db("coursebook").collection("courses");

          switch (content.action) {
            case "REGISTRATION":
              const userdb = client.db("coursebook").collection("users");
              this.handleRegistration(userdb, content, resolve);
              break;
            case "COURSE_CREATE":
              this.handleCourseCreation(coursedb, wishdb, content, resolve);
              break;
            case "COURSE_UPDATE":
              this.handleCourseUpdate(coursedb, content, resolve);
              break;
            case "COURSE_DELETE":
              this.handleCourseDelete(coursedb, wishdb, content, resolve);
              break;
            case "WISH_CREATE":
              this.handleWishCreation(wishdb, content, resolve);
              break;
            case "WISH_UPDATE":
              this.handleWishUpdate(wishdb, content, resolve);
              break;
            case "WISH_DELETE":
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

  handleCourseCreation(coursedb, wishdb, content, resolve) {
    const logTag = "COURSE_CREATE"
    this.logger.info(`[ ${logTag} ] handling course creation`);
    const searchQuery = {name: content.name, author: content.author};
    var updateQuery = {};
    updateQuery = {
      $setOnInsert: {
        name: content.name,
        author: content.author,
        shortDescription: content.shortDescription,
        description: content.description,
        sources: content.sources,
        reviews: [],
        wish: content.wish
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
          if (content.wish !== "") {
            const options = {upsert: false};
            const wishsearch = {_id: new MongoClient.ObjectId(content.wish)};
            const wishupdate = {
              $set:{
                complete:true
              }
            };
            wishdb.updateOne(wishsearch,wishupdate, options)
              .then((wishresponse) => {
                this.respond(logTag, body, resolve);
              });
          } else {
            this.respond(logTag, body, resolve);
          }
        }
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleCourseUpdate(coursedb, content, resolve) {
    const searchQuery = {_id: new MongoClient.ObjectId(content.courseId)};
    const updateQuery = {
      $set: {
        name: content.name,
        shortDescription: content.shortDescription,
        description: content.description,
        sources: content.sources,
       }
    };
    const options = {upsert: false};

    coursedb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        if(response.nModified === 0) {
          this.logger.info(`course ${content.name} by ${content.author} already exists`);
          resolve(true);
        } else {
          this.logger.info(`updated course ${content.name} by ${content.author}`);
          resolve(true);
        }
      })
      .catch((error) => {
        this.logger.error(`Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleCourseDelete(coursedb, wishdb, content, resolve) {
    const logTag = "COURSE_DELETE"
    this.logger.info(`[ ${logTag} ] handling course deletion`);
    const searchQuery = {_id : new MongoClient.ObjectId(content.courseId)};

    var isWished = true;
    var wishId = "";
    const checkQuery = { _id : new MongoClient.ObjectId(content.courseId)};
    const showQuery = {wish: 1, _id: 0};

    coursedb.findOne(checkQuery,showQuery)
      .then((response) => {
        if(response.wish === ""){
          isWished = false;
        }else{
          wishId = response.wish;
        }
        coursedb.deleteOne(searchQuery)
          .then((response) => {
            if (response.deletedCount === 0) {
              this.logger.info(`[ ${logTag} ] Course with id ${content.courseId} does not exist`);
            } else {
              this.logger.info(`[ ${logTag} ] SUPERUPERUPE ${isWished} andandand ${wishId}`);
              if(isWished){
                const options = {upsert: true};
                const wishsearch = {_id: new MongoClient.ObjectId(wishId)};
                const wishupdate = {
                  $set:{
                    complete:false
                  }
                };
                wishdb.updateOne(wishsearch,wishupdate, options);
              }
              this.logger.info(`[ ${logTag} ] Deleted course with id ${content.courseId}`);
            }
            resolve(true);
          })
          .catch((error) => {
            this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
            resolve(false);
          });
    });
  }

  handleCourseDelete(wishdb, content, resolve) {
    const logTag = "WISH"
    this.logger.info(`[ ${logTag} ] handling wish deletion`);
    const searchQuery = {_id : content.courseId};
    coursedb.deleteOne(searchQuery)
      .then((response) => {
        if (response.deletedCount === 0) {
          this.logger.info(`[ ${logTag} ] Course with id ${content.courseId} does not exist`);
        } else {
          this.logger.info(`[ ${logTag} ] Deleted course with id ${content.courseId}`);
        }
        resolve(true);
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
        name: content.name,
        details: content.details,
        wisher: content.wisher
       }
    };
    const options = {upsert: true};

    wishdb.updateOne(searchQuery, updateQuery, options)
      .then((response) => {
        const body = {
            uuid: content.uuid,
            action: content.action
        };
        if (response.upsertedCount === 0) {
          this.logger.info(`[ ${logTag} ] wish ${content.name} by ${content.wisher} already exists`);
          body.statusCode = 409;
          body.message = "Wish by that name and author already exists. Please try another.";
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
    const logTag = "WISH_UPDATE"
    this.logger.info(`[ ${logTag} ] handling wish update`);
    const searchQuery = {_id: new MongoClient.ObjectId(content.wishId)};
    const updateQuery = {
      $set: {
        name : content.name,
        details: content.details
       }
    };
    const options = {upsert: false};
    wishdb.updateOne(searchQuery,updateQuery, options)
      .then((response) => {
        if (response.modifiedCount === 0) {
          this.logger.info(`[ ${logTag} ] wish ${content.name} by ${content.wishId} doesn't exist with id ${content.wishId}`);
          resolve(true);
        } else {
          this.logger.info(`[ ${logTag} ] Updated wish ${content.name} by ${content.wisher} with id ${content.wishId}`);
          resolve(true);
        }
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleWishDelete(wishdb, content, resolve) {
    const logTag = "WISH_DELETE"
    this.logger.info(`[ ${logTag} ] handling wish deletion`);
    const searchQuery = {_id : new MongoClient.ObjectId(content.wishId)};
    wishdb.deleteOne(searchQuery)
      .then((response) => {
        if (response.deletedCount === 0) {
          this.logger.info(`[ ${logTag} ] Wish with id ${content.wishId} does not exist`);
        } else {
          this.logger.info(`[ ${logTag} ] Deleted wish with id ${content.wishId}`);
        }
        resolve(true);
      })
      .catch((error) => {
        this.logger.error(`[ ${logTag} ] Mongo failed update query: ${JSON.stringify(error.message)}`);
        resolve(false);
      });
  }

  handleMongoDown(content, error, resolve) {
    const logTag = "DOWN";
    this.logger.error(`[ ${logTag} ] Could not connect to MongoClient. Message: ${error.message}`);
    const body = {
      json: {
        uuid: content.uuid,
        statuscode: 102,
        message: "Registration is down. The registration request will be processed once it is back up."
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

module.exports = MongoHandler;
