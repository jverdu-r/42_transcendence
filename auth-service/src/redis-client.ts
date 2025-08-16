// auth-service/src/redis-client.ts

import { createClient, RedisClientType } from 'redis'; // ✅ Importa tipos
import dotenv from 'dotenv';

dotenv.config();

// Tipado explícito
const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
  socket: {
    reconnectStrategy: (retries: number) => {
      const delay = Math.min(retries * 250, 5000);
      console.log(`🔁 Intento de reconexión ${retries}, esperando ${delay}ms`);
      return delay;
    }
  }
});

// Manejo de eventos
redisClient.on('error', (err: Error) => {
  console.error('❌ Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('🔌 Conectando a Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis listo para operaciones');
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
    throw err;
  }
}

export default redisClient;