// db-service/src/redis-client.ts

import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Definimos el tipo del cliente Redis
let redis: RedisClientType | null = null;

// Función para configurar eventos en el cliente
function setupRedisClient(client: RedisClientType) {
  client.on('error', (err: Error) => {
    console.error('❌ Redis client error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  client.on('ready', () => {
    console.log('🟢 Redis ready');
  });

  return client;
}

// Función para crear, configurar y conectar el cliente
async function connectRedis(): Promise<RedisClientType> {
  const client = createClient({
    url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || ''}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
    socket: {
      reconnectStrategy: (retries: number) => {
        const delay = Math.min(retries * 250, 5000);
        console.log(`🔁 Intento de reconexión ${retries}, esperando ${delay}ms`);
        return delay;
      }
    }
  }) as RedisClientType;

  setupRedisClient(client);

  try {
    await client.connect();
    console.log('✅ Redis conectado');
  } catch (err) {
    console.error('❌ Error al conectar Redis:', err);
    throw err;
  }

  return client;
}

// Conectar al iniciar
(async () => {
  try {
    redis = await connectRedis();
  } catch (err) {
    console.error('❌ Fallo crítico al conectar Redis:', err);
    process.exit(1);
  }
})();

// Reconexión tras SIGHUP
process.on('SIGHUP', async () => {
  dotenv.config();
  if (redis) {
    await redis.quit().catch(console.error);
  }
  try {
    redis = await connectRedis();
    console.log('🔄 Redis reconectado tras SIGHUP');
  } catch (err) {
    console.error('❌ Error al reconectar tras SIGHUP:', err);
    process.exit(1);
  }
});

// Exportamos el cliente como una función que devuelve el cliente actual
export default (): RedisClientType => {
  if (!redis) {
    throw new Error('Redis client no está inicializado');
  }
  return redis;
};