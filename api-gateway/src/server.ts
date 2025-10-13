import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import fastifyCors from '@fastify/cors';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Readable } from 'stream';
dotenv.config();

process.on('SIGHUP', () => {
  dotenv.config();
  console.log('Variables de entorno recargadas por SIGHUP');
});

// Redis connection setup
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || '';
let redis = new Redis({ host: redisHost, port: redisPort, password: redisPassword });

const fastify = Fastify({ logger: true });

const pump = promisify(pipeline);

(async () => {

  // Tournament Endpoints (proxy to db-service)
  const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:8000';
  // Proxy global para /api/tournaments -> db-service
  fastify.register(httpProxy, {
    upstream: DB_SERVICE_URL,
    prefix: '/api/tournaments',
    rewritePrefix: '/tournaments',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Register this before your other routes
  fastify.get('/avatars/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const res = await fetch(`http://auth-service:8000/avatars/${filename}`);
    if (!res.ok) {
      reply.code(res.status).send();
      return;
    }
    reply.header('Content-Type', res.headers.get('content-type') || 'application/octet-stream');
    // Do NOT set Content-Length manually

    let nodeStream;
    if (res.body && typeof (res.body as any).getReader === 'function') {
      nodeStream = Readable.fromWeb(res.body as any);
    } else if (res.body && typeof res.body.pipe === 'function') {
      nodeStream = res.body;
    } else {
      reply.code(500).send('No image stream');
      return;
    }

    return reply.send(nodeStream);
  });


  // Register CORS before proxies
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true
  });

  // Proxies to backend services
  const serviceConfigs = [
    { env: 'AUTH_SERVICE_URL', prefix: '/api/auth', rewritePrefix: '/auth', fallback: 'http://auth-service:8000' },
    { env: 'GAME_SERVICE_URL', prefix: '/api/game', rewritePrefix: '/game', fallback: 'http://game-service:8000' },
    { env: 'GAME_SERVICE_URL', prefix: '/api/games', rewritePrefix: '/api/games', fallback: 'http://game-service:8000' },
    { env: 'CHAT_SERVICE_URL', prefix: '/api/chat', rewritePrefix: '', fallback: 'http://chat-service:8000' },
  ];

  for (const svc of serviceConfigs) {
    const upstream = process.env[svc.env] || svc.fallback;
    fastify.register(httpProxy, {
      upstream,
      prefix: svc.prefix,
      rewritePrefix: svc.rewritePrefix,
      httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
  }

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      await redis.ping();
      return reply.send({ status: 'ok', redis: 'connected' });
    } catch (err: any) {
      reply.status(500).send({ status: 'fail', error: err?.message || String(err) });
    }
  });

  // Enqueue jobs
  fastify.post('/queue/job', async (request, reply) => {
    try {
      const job = request.body;
      await redis.lpush('job-queue', JSON.stringify(job));
      return reply.send({ queued: true });
    } catch (err: any) {
      reply.status(500).send({ error: 'Failed to queue job', detail: err?.message || String(err) });
    }
  });

  // Start server
  try {
    await redis.ping();
    fastify.log.info('Redis connection successfully established from .env or environment variables');
    await fastify.listen({ port: 8000, host: '0.0.0.0' });
    fastify.log.info('API Gateway listening on port 8000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();