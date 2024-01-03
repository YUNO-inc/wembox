const Redis = require('ioredis');

const { REDIS_PORT, REDIS_HOST, NODE_ENV, REDIS_URL } = process.env;
const redis = new Redis(
  NODE_ENV === 'production'
    ? {
        host: REDIS_HOST,
        port: REDIS_PORT,
      }
    : REDIS_URL
);

module.exports = redis;
