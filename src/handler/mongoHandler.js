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
		  MongoClient.connect(this.host, (error, client) => {
			  if(error) {
				  this.logger.error("Could not connect to MongoClient", error.message);
				  request.post('http://433-12.csse.rose-hulman.edu:15672/#/',
						  { json: {uuid:content.uuid, statuscode:"100", message:'REGISTRATION_DOWN'}},
						  function (error, response, body) {
							  if(!error && response.statusCode == 200) {
								  this.logger.info(body)
							  } else if (error) {
								  this.logger.error(error.message)
							  }
						  })
				  resolve(false);
				  return;
			  } else {
				  this.logger.info("connected to MongoClient");
			  }

			  const userdb = client.db('coursebook').collection('users')

			  switch (content.action) {
				  case 'REGISTRATION':
					  const datum = {
						  username:content.username,
						  password:content.password,
				  	  uuid:content.uuid,
              action:"REGISTRATION"
					  }
					  if (userdb.find({"username":datum.username}).count() > 0) {
						  request.post('http://433-12.csse.rose-hulman.edu:15672/#/',
								  { json: {uuid:datum.uuid, statuscode:"400", message:'REGISTRATION_FAILURE', username:datum.username, action:datum.action}},
								  function (error, response, body) {
									  if(!error && response.statusCode == 200) {
										  this.logger.info(body)
									  } else if (error) {
										  this.logger.error(error.message)
									  }
								  })
						  resolve(true);
					  } else {
            const writeresult = userdb.updateOne(
              {"username":datum.username},
             {
               $setOnInsert:
                    {"username":datum.username, "password":datum.password, "reviews":[], "subscriptions":[]}
             },
                    {upsert: true}
             )
             writeresult.then((result) => {
               console.log("\nThis is the json" + result + '\n')
               result
               //Result.upserted undefined for some reason
               console.log("\n" + result.upserted)
					  if (typeof result.upserted === "undefined") {
              console.log("\nThe upsert existed!\n")
						  request.post('http://433-12.csse.rose-hulman.edu:15672/#/',
								  { json: {uuid:datum.uuid, statuscode:"200",message:"REGISTRATION_SUCCESS",username:datum.username, action:datum.action}},
								  function (error, response, body) {
									  if(!error && response.statusCode == 200) {
										  this.logger.info(body)
									  } else if (error) {
										  this.logger.error(error.message)
									  }
								  })
					  } else {
              console.log("\nThe bleh existed!\n")
						  request.post('http://433-12.csse.rose-hulman.edu:15672/#/',
								  { json: {uuid:datum.uuid, statuscode:"500",message:"REGISTRATION_FAILURE",username:datum.username, action:datum.action}},
								  function (error, response, body) {
									  if(!error && response.statusCode == 200) {
										  this.logger.info(body)
									  } else if (error) {
										  this.logger.error(error.message)
									  }
								  })
					  }
					  resolve(true);
           })
			  }
			  }
		  })
	  })
  }
}

module.exports = MongoHandler;
