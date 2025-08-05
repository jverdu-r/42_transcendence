import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import fastifyCors from '@fastify/cors'; // 🟡 <-- CORS IMPORTADO
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// -- Redis connection setup from env --
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || '';
let redis = new Redis({ host: redisHost, port: redisPort, password: redisPassword });

// -- fastify instance --
const fastify = Fastify({ logger: true });

(async () => {
  // --- Tournament Endpoints (proxy to db-service) ---
  const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:8000';
  const fetch = (await import('node-fetch')).default;

  // List tournaments
  fastify.get('/api/tournaments', async (request, reply) => {
    try {
      const res = await fetch(`${DB_SERVICE_URL}/tournaments`);
      if (!res.ok) {
        return reply.code(res.status).send(await res.text());
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to fetch tournaments' });
    }
  });

  // Create tournament
  fastify.post('/api/tournaments', async (request, reply) => {
    try {
      const res = await fetch(`${DB_SERVICE_URL}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });
      if (!res.ok) {
        return reply.code(res.status).send(await res.text());
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to create tournament' });
    }
  });

  // Join tournament (example, adjust path/logic as needed)
  fastify.post('/api/tournaments/:id/join', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const res = await fetch(`${DB_SERVICE_URL}/tournaments/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });
      if (!res.ok) {
        return reply.code(res.status).send(await res.text());
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to join tournament' });
    }
  });
  // 🟡 REGISTRA CORS ANTES DE LOS PROXIES
  await fastify.register(fastifyCors, {
    origin: true, // Accept any origin for CORS (development only!)
    credentials: true
  });

  // -- Proxies to backend services --
  const serviceConfigs = [
    { env: 'AUTH_SERVICE_URL', prefix: '/api/auth', rewritePrefix: '/auth', fallback: 'http://auth-service:8000' },
    { env: 'GAME_SERVICE_URL', prefix: '/api/game', rewritePrefix: '/game', fallback: 'http://game-service:8000' },
    { env: 'CHAT_SERVICE_URL', prefix: '/api/chat', rewritePrefix: '/chat', fallback: 'http://chat-service:8000' },
  ];

  for (const svc of serviceConfigs) {
    const upstream = process.env[svc.env] || svc.fallback;
    fastify.register(httpProxy, {
      upstream,
      prefix: svc.prefix,
      rewritePrefix: svc.rewritePrefix,
      httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Añade OPTIONS por si acaso
    });
  }

  // -- Health check --
  fastify.get('/health', async (request, reply) => {
    try {
      await redis.ping();
      return reply.send({ status: 'ok', redis: 'connected' });
    } catch (err: any) {
      reply.status(500).send({ status: 'fail', error: err?.message || String(err) });
    }
  });

  // -- Enqueue jobs --
  fastify.post('/queue/job', async (request, reply) => {
    try {
      const job = request.body;
      await redis.lpush('job-queue', JSON.stringify(job));
      return reply.send({ queued: true });
    } catch (err: any) {
      reply.status(500).send({ error: 'Failed to queue job', detail: err?.message || String(err) });
    }
  });

  // -- Start server --
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
