// auth-service/src/redis-client.ts

import { createClient } from 'redis';

import dotenv from 'dotenv';
dotenv.config();

const redis = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

(async () => {
  try {
    await redis.connect();
    console.log('Redis client connected');
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

export default redis;
