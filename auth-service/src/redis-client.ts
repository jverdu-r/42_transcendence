// auth-service/src/redis-client.ts
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

export async function connectRedis() {
  try {
    if (redisClient.isOpen) {
        console.log('🔁 Redis ya estaba conectado');
        return;
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Conectado a Redis');
    }
  } catch (err) {
        console.error('Error conectando a Redis:', err);
    }
}

export default redisClient;