// auth-service/src/redis-client.ts

import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://default@redis:6379'
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
