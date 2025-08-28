// db-service/src/server.ts

import Fastify from 'fastify';
import { initializeDb } from './database';
import { connectRedis } from './redis-client';
import userRoutes from './routes/user.routes';
import gameRoutes from './routes/game.routes';
import friendsRoutes from './routes/friends.routes';
import miscRoutes from './routes/misc.routes';

const fastify = Fastify({ logger: true });

// Registrar rutas
console.log('📍 Registrando rutas...');

// Agregar ruta de prueba simple
fastify.get('/test', async (request, reply) => {
  return { message: 'Test route works!' };
});

fastify.register(userRoutes);
console.log('✅ userRoutes registradas');
fastify.register(gameRoutes);
console.log('✅ gameRoutes registradas');
fastify.register(friendsRoutes);
console.log('✅ friendsRoutes registradas');
fastify.register(miscRoutes);
console.log('✅ miscRoutes registradas');

// Inicializar base de datos y Redis
fastify.ready(async (err) => {
  if (err) {
    // ✅ Usa { err }
    fastify.log.error({ err }, 'Error durante la inicialización de Fastify');
    process.exit(1);
  }
  try {
    await initializeDb();
    await connectRedis();
    console.log('✅ Base de datos y Redis inicializados');
  } catch (err) {
    // ✅ Usa { err }
    fastify.log.error({ err }, 'Error al inicializar servicios');
    process.exit(1);
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 8000, host: '0.0.0.0' });
    console.log('✅ db-service escuchando en el puerto 8000');
  } catch (err) {
    // ✅ Usa { err }
    fastify.log.error({ err }, 'Error al iniciar el servidor');
    process.exit(1);
  }
};

start();

process.on('SIGINT', async () => {
  await fastify.close();
  process.exit();
});