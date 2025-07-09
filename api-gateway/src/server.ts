import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';

const fastify = Fastify({
    logger: true
});

fastify.register(httpProxy, {
    upstream: process.env.AUTH_SERVICE_URL || 'http://auth-service:8000',
    prefix: '/auth',
    rewritePrefix: '/auth',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
});

fastify.register(httpProxy, {
    upstream: process.env.GAME_SERVICE_URL || 'http://game-service:8000',
    prefix: '/game',
    rewritePrefix: '/game',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
});

fastify.register(httpProxy, {
    upstream: process.env.CHAT_SERVICE_URL || 'http://chat-service:8000',
    prefix: '/chat',
    rewritePrefix: '/chat',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' }); // Escucha en el puerto 8000
        console.log('API Gateway escuchando en el puerto 8000');
        console.log('Proxies configurados: /auth, /game, /chat');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
