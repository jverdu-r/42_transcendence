// auth-service/src/redis-client.ts

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 2) {
        console.error('❌ Demasiados intentos de reconexión a Redis. Deteniendo...');
        return new Error('Too many retry attempts');
      }
      // Reintenta cada 100ms, 200ms, 400ms... hasta 1s
      return Math.min(retries * 250, 2500);
    }
  }
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Reconectando a Redis...');
});

// Función para conectar (llamada manualmente)
export async function connectRedis() {
  try {
    if (redisClient.isOpen) {
      console.log('🔁 Redis ya estaba conectado');
      return;
    }

    await redisClient.connect();
    console.log('✅ Conectado a Redis');
  } catch (err) {
    console.error('❌ Error conectando a Redis:', err);
    throw err; // Para que el servicio falle si no puede conectar
  }
}

export default redisClient;