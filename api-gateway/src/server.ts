import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// -- Redis connection setup from env --
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || '';
let redis = new Redis({ host: redisHost, port: redisPort, password: redisPassword });

// -- fastify and other setup below --

const fastify = Fastify({
    logger: true
});

const serviceConfigs = [
    { env: 'AUTH_SERVICE_URL', prefix: '/api/auth', rewritePrefix: '/auth', fallback: 'http://auth-service:8000' },
    { env: 'GAME_SERVICE_URL', prefix: '/api/game', rewritePrefix: '/game', fallback: 'http://game-service:8000' },
    { env: 'CHAT_SERVICE_URL', prefix: '/api/chat', rewritePrefix: '/chat', fallback: 'http://chat-service:8000' },
    // Add more services here as needed
];
for (const svc of serviceConfigs) {
    const upstream = process.env[svc.env] || svc.fallback;
        fastify.register(httpProxy, {
        upstream,
        prefix: svc.prefix,
        rewritePrefix: svc.rewritePrefix,
        httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    });
}

// -- Health check route (verifies Redis connection) --
fastify.get('/health', async (request, reply) => {
    try {
        await redis.ping();
        reply.send({ status: 'ok', redis: 'connected' });
    } catch (err: any) {
        reply.status(500).send({ status: 'fail', error: (err && err.message) ? err.message : String(err) });
    }
});

// -- Basic queue enqueue route (for SQLite processing tasks, etc) --
fastify.post('/queue/job', async (request, reply) => {
    try {
        const job = request.body;
        await redis.lpush('job-queue', JSON.stringify(job));
        reply.send({ queued: true });
    } catch (err: any) {
        reply.status(500).send({ error: 'Failed to queue job', detail: (err && err.message) ? err.message : String(err) });
    }
});

// -- Start server --
const start = async () => {
    try {
        // Test redis connection on startup
        await redis.ping();
        fastify.log.info('Redis connection successfully established from .env or environment variables');
        
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        fastify.log.info('API Gateway listening on port 8000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
