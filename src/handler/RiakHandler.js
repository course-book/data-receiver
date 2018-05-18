const Riak = require("basho-riak-client");

class RiakHandler {
  constructor(nodes, logger) {
    this.nodes = nodes;
    this.logger = logger;

    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleRegistration = this.handleRegistration.bind(this);
    this.handleCreateOrDelete = this.handleCreateOrDelete.bind(this);
    this.handleFetchOrUpdate = this.handleFetchOrUpdate.bind(this);
    this.updateCounter = this.updateCounter.bind(this);
  }

  stop(logTag, client) {
    client.stop((error, result) => {
      if (error) {
        this.logger.error(`[ ${logTag} ] failed to stop Riak client: ${error.message}`);
      } else {
        this.logger.info(`[ ${logTag} ] successfully stopped Riak client: ${result}`);
      }
    });
  }

  receiveMessage(content) {
    this.logger.info(content);
    return new Promise((resolve, reject) => {
      const client = new Riak.Client(this.nodes, (error, c) => {
        if (error) {
          this.logger.error(`[ RIAK ] failed to connect: ${error}`);
          resolve(false);
          return;
        }
        this.logger.info("Successfully connected to Riak");

        switch (content.action) {
          case "LOGIN":
            return this.handleLogin(content, c)
              .then((result) => resolve(result));
          case "REGISTRATION":
            return this.handleRegistration(content, c)
              .then((result) => resolve(result));
          case "COURSE_CREATE":
          case "COURSE_DELETE":
            return this.handleCreateOrDelete("COURSE", content, c)
              .then((result) => resolve(result));
          case "COURSE_FETCH":
          case "COURSE_UPDATE":
            return this.handleFetchOrUpdate("COURSE", content, c)
              .then((result) => resolve(result));
          case "WISH_CREATE":
          case "WISH_DELETE":
            return this.handleCreateOrDelete("WISH", content, c)
              .then((result) => resolve(result));
          case "WISH_UPDATE":
          case "WISH_FETCH":
            return this.handleFetchOrUpdate("WISH", content, c)
              .then((result) => resolve(result));
          default:
            this.logger.warn(`[ RIAK ] Unexpected type ${content.action}.`);
            return resolve(true);
        }
      });
    });
  }

  handleLogin(content, client) {
    return new Promise((resolve, reject) => {
      const logTag = "LOGIN";
      this.logger.info(`[ ${logTag} ] handling login`);
      const mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation();
      mapOp.incrementCounter(content.username, 1);
      const datum = {
        bucketType: "maps",
        bucket: content.action,
        key: content.ip,
        op: mapOp
      };
      client.updateMap(datum, (error, result) => {
        let status;
        if (error) {
          this.logger.error(`[ ${logTag} ] failed to store value ${error}`);
          status = false;
        } else {
          this.logger.info(`[ ${logTag} ] successfully stored value ${JSON.stringify(result)}`);
          status = true;
        }
        this.stop(logTag, client);
        resolve(status);
      });
    });
  }

  handleRegistration(content, client) {
    return new Promise((resolve, reject) => {
      const logTag = "REGISTRATION";
      const datum = {
        bucketType: "counters",
        bucket: content.action,
        key: content.ip,
        increment: 1
      };
      this.updateCounter(logTag, client, datum, resolve, reject);
    });
  }

  handleCreateOrDelete(logTag, content, client) {
    return new Promise((resolve, reject) => {
      const datum = {
        bucketType: "counters",
        bucket: content.action,
        key: content.username,
        increment: 1
      };
      this.updateCounter(logTag, client, datum, resolve, reject);
    });
  }

  handleFetchOrUpdate(logTag, content, client) {
    return new Promise((resolve, reject) => {
      const datum = {
        bucketType: "counters",
        bucket: content.action,
        key: content.id,
        increment: 1
      };
      this.updateCounter(logTag, client, datum, resolve, reject);
    });
  }

  updateCounter(logTag, client, datum, resolve, reject) {
    // NOTE: resolve is a Promise resolve callback.
    client.updateCounter(datum, (error, result) => {
      let status;
      if (error) {
        this.logger.error(`[ ${logTag} ] failed to store value ${error}`);
        status = false;
      } else {
        this.logger.info(`[ ${logTag} ] successfully stored value ${JSON.stringify(result)}`);
        status = true;
      }
      this.stop(logTag, client);
      resolve(status);
    });
  }
}

module.exports = RiakHandler;
