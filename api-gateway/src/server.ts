// api-gateway/src/server.ts
import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const fastify = Fastify({ logger: true });

// Middleware global para autenticar JWT (excepto /auth/*)
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/auth')) return; // Excluir rutas públicas
  const auth = request.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ message: 'No autorizado' });
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;
    request.headers['x-user-id'] = String(payload.user_id);
  } catch {
    return reply.code(401).send({ message: 'Token inválido' });
  }
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

fastify.listen({ port: 8000, host: '0.0.0.0' }, err => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

