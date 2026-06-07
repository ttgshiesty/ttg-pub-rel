const Redis = require('ioredis');

// Initializing the connection to speranza
const redis = new Redis({
  host: 'speranza-5xvrtm.serverless.use2.cache.amazonaws.com',
  port: 6379,
  tls: {}, // Critical for AWS Serverless
  connectTimeout: 10000,
  keepAlive: 1000,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('DB: Connected to Speranza Cache'));
redis.on('error', (err) => console.error('DB: Redis Connection Error', err));

module.exports = redis;
