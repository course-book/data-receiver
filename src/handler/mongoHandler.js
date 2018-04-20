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
					  if (userdb.find({"username":datum.username}).count() > 0) {
						  request.post('http://433-12.csse.rose-hulman.edu:15672/#/,
								  { json: {success:'REGISTRATION_FAILURE'}},
								  function (error, response, body) {
									  if(!error && response.statusCode == 200) {
										  this.logger.info(body)
									  } else if (error) {
										  this.logger.error(error.message)
									  }
								  }
						  resolve(true);
					  } else {
					  userdb.insert(datum);
					  request.post('http://433-12.csse.rose-hulman.edu:15672/#/,
							  { json: {success:'REGISTRATION_SUCCESS'}},
							  function (error, response, body) {
								  if(!error && response.statusCode == 200) {
									  this.logger.info(body)
								  } else if (error) {
									  this.logger.error(error.message)
								  }
							  }
					  resolve(true);
			  }
			  }
		  })
	  })
  }
}

module.exports = MongoHandler;
