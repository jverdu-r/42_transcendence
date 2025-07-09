import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import Redis from 'ioredis';

// Here, environment variables and secrets (like microservice URLs, Redis credentials, certificates)
// should be dynamically retrieved from HashiCorp Vault on startup in a production setup.
// For dev purposes, .env or docker-compose envs are typically used.

// -- Redis connection --
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redis = new Redis({ host: redisHost, port: redisPort });

const fastify = Fastify({
    logger: true
});

// -- Dynamic proxy setup --
const serviceConfigs = [
    { env: 'AUTH_SERVICE_URL',    prefix: '/auth', fallback: 'http://auth-service:8000' },
    { env: 'GAME_SERVICE_URL',    prefix: '/game', fallback: 'http://game-service:8000' },
    { env: 'CHAT_SERVICE_URL',    prefix: '/chat', fallback: 'http://chat-service:8000' },
    // Add more services here as needed
];

for (const svc of serviceConfigs) {
    const upstream = process.env[svc.env] || svc.fallback;
    fastify.register(httpProxy, {
        upstream,
        prefix: svc.prefix,
        rewritePrefix: svc.prefix,
        httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    });
}

// -- Health check route (verifies Redis connection) --
fastify.get('/health', async (request, reply) => {
    try {
        await redis.ping();
        reply.send({ status: 'ok', redis: 'connected' });
    } catch (err) {
        reply.status(500).send({ status: 'fail', error: err.message });
    }
});

// -- Basic queue enqueue route (for SQLite processing tasks, etc) --
fastify.post('/queue/job', async (request, reply) => {
    try {
        const job = request.body;
        await redis.lpush('job-queue', JSON.stringify(job));
        reply.send({ queued: true });
    } catch (err) {
        reply.status(500).send({ error: 'Failed to queue job', detail: err.message });
    }
});

// -- Start server --
const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        fastify.log.info('API Gateway listening on port 8000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
