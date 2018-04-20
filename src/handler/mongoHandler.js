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
	  return new Promise((resolve reject) => {
		  MongoClient.connect(this.host, (error, c) => {
			  if(error) {
				  this.logger.error("Could not connect to MongoClient", error.message);
				  resolve(false);
				  return;
			  } else {
				  this.logger.info("connected to MongoClient");
			  }
			  
			  const userdb = c.collection('users')
			  
			  switch (content.type) {
				  case 'REGISTRATION':
					  const datum = {
						  username:content.username;
						  password:content.password;
					  }
					  userdb.insert(datum);
					  resolve(true);
			  }
		  })
	  })
  }
}

module.exports = MongoHandler;
