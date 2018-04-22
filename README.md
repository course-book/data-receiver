# Course-Book's Generalized RabbitMQ Listener

## Description
This listens to course-book's specific queues and handles the data accordingly. If needed, it will
notify the course-book web server directly.

In addition to having listeners processing messages on RabbitMQ, this also contains server endpoints
for read requests.

## Development
Ensure you have a `.env` file setup. Run `yarn install` or `npm install`.

Run the following to start development servers and listeners:
### Mongo
`yarn devMongo`

### Redis
`yarn devRedis`

### Riak
`yarn devRiak`

## Production
Run the following to start production servers and listeners:
### Mongo
`yarn mongo`

### Redis
`yarn redis`

### Riak
`yarn riak`
