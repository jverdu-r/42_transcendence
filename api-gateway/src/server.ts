import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
    logger: true
});

// Enable CORS
fastify.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// Proxy para auth service
fastify.register(httpProxy, {
    upstream: 'http://auth-service:8000',
    prefix: '/api/auth',
    rewritePrefix: '/auth',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Proxy para game stats (db-service)
fastify.register(httpProxy, {
    upstream: 'http://db-service:8000',
    prefix: '/api/game',
    rewritePrefix: '/game',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Health check route
fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'ok', service: 'api-gateway' });
});

// Start server
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
