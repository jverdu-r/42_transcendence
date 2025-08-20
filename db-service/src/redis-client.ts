// auth-service/src/redis-client.ts

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();


let redis = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 10) {
        console.error('❌ Demasiados intentos de reconexión a Redis. Deteniendo...');
        return new Error('Too many retry attempts');
      }
      return Math.min(retries * 100, 1000);
    }
  }
});

redis.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});


// Conectar automáticamente
(async () => {
  try {
    await redis.connect();
    console.log('✅ Redis client connected');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }
})();

// Reconexión tras SIGHUP
process.on('SIGHUP', async () => {
  dotenv.config();
  try {
    await redis.quit();
    redis = createClient({
      url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= 10) {
            console.error('❌ Demasiados intentos de reconexión a Redis. Deteniendo...');
            return new Error('Too many retry attempts');
          }
          return Math.min(retries * 100, 1000);
        }
      }
    });
    await redis.connect();
    console.log('🔄 Redis client reconectado tras SIGHUP');
  } catch (err) {
    console.error('❌ Error al reconectar Redis tras SIGHUP:', err);
  }
});

export default redis;
