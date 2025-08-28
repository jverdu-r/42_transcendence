// game-service/src/redis-client.ts
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Crear el cliente Redis
const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
  socket: {
    reconnectStrategy: (retries: number): number | Error => {
      if (retries >= 10) {
        console.error('❌ Demasiados intentos de reconexión a Redis. Deteniendo...');
        return new Error('Too many retry attempts');
      }
      return Math.min(retries * 100, 1000);
    }
  }
});

// Eventos
redis.on('error', (err: Error) => {
  console.error('❌ Redis client error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Función para conectar el cliente Redis. Debe llamarse al inicio del servicio.
export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

// Exportamos el cliente como default para importarlo fácilmente
export default redis;
