import Fastify from 'fastify';
import { connectRedis } from './redis-client';
import { initializeDb } from './database';

const fastify = Fastify({
    logger: true
});

// Registrar rutas
import userRoutes from './routes/user.routes';
import miscRoutes from './routes/misc.routes';
import gameRoutes from './routes/game.routes';
import friendsRoutes from './routes/friends.routes';

fastify.register(userRoutes, { prefix: '' });
fastify.register(miscRoutes, { prefix: '' });
fastify.register(gameRoutes, { prefix: '' });
fastify.register(friendsRoutes, { prefix: '' });

// Inicializar base de datos y Redis
fastify.ready(async (err) => {
    if (err) {
        fastify.log.error({ err }, 'Error durante la inicialización de Fastify');
        process.exit(1);
    }
    try {
        await initializeDb();
        await connectRedis();
        console.log('✅ Base de datos y Redis inicializados');
    } catch (err) {
        fastify.log.error({ err }, 'Error al iniciar el servidor');
        process.exit(1);
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        console.log('✅ db-service escuchando en el puerto 8000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

process.on('SIGINT', async () => {
  await fastify.close();
  process.exit();
});

