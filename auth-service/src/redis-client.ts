// auth-service/src/redis-client.ts

import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env (generado por Vault Agent)
dotenv.config({ path: '.env' });
dotenv.config(); // También cargar el .env por defecto si existe

const redis: RedisClientType = createClient({
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

// Exportamos la función para conectar manualmente
export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

// Exportamos el cliente
export default redis;