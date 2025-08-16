import Fastify from 'fastify';
import { initializeDb, openDb } from './database';
import redisClient from './redis-client';

const fastify = Fastify({
    logger: true
});

// Usar fastify.ready() en lugar de fastify.onReady()
fastify.ready(async (err) => {
    if (err) {
        fastify.log.error('Error durante la inicialización de Fastify:', err as any);
        process.exit(1);
    }
    await initializeDb();
});

fastify.get('/users', async (request, reply) => {
    const db = await openDb();
    try {
        const users = await db.all('SELECT id, username, email FROM users');
        return users;
    } finally {
        await db.close();
    }
});

fastify.post('/users', async (request, reply) => {
    const { username, password_hash, email } = request.body as any;
    if (!username || !password_hash || !email) {
        reply.code(400).send({ message: 'Missing required fields' });
        return;
    }
    const db = await openDb();
    try {
        const result = await redisClient().rPush('sqlite_write_queue', JSON.stringify({
            sql: 'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
            params: [username, password_hash, email]
        }));
        reply.code(201).send({ message: 'User created' });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            reply.code(409).send({ message: 'Username or email already exists' });
        } else {
            fastify.log.error(error);
            reply.code(500).send({ message: 'Internal Server Error' });
        }
    } finally {
        await db.close();
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' }); // Escucha en el puerto 8000
        console.log('db-service escuchando en el puerto 8000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
