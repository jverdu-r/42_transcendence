import Fastify from 'fastify';

const fastify = Fastify({
    logger: true
});

fastify.get('/', async (request, reply) => {
    return { service: 'chat-service', message: 'Hello from chat-service!' };
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' }); // Escucha en el puerto 8000
        console.log(`chat-service escuchando en el puerto 8000`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
