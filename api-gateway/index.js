// index.js
const fastify = require('fastify')({ logger: true })
const fastifyHttpProxy = require('@fastify/http-proxy')
const Redis = require('ioredis')

// Use environment variables or defaults for config
env = process.env;
const redisHost = env.REDIS_HOST || 'redis';
const redisPort = env.REDIS_PORT || 6379;
const services = {
  // Service name: target URL
  users: env.USERS_SERVICE_URL    || 'http://users:3001',
  games: env.GAMES_SERVICE_URL    || 'http://games:3002',
  scores: env.SCORES_SERVICE_URL  || 'http://scores:3003',
  // Add more as needed
}

// Redis client for queue management
const redis = new Redis({ host: redisHost, port: redisPort })

// Healthcheck route
fastify.get('/health', async (req, reply) => {
  try {
    await redis.ping()
    reply.send({ status: 'ok', redis: 'connected' })
  } catch (err) {
    reply.status(500).send({ status: 'fail', err: err.message })
  }
})

// Example: Proxy routes for each microservice
typeof services === 'object' && Object.entries(services).forEach(([svc, url]) => {
  fastify.register(fastifyHttpProxy, {
    upstream: url,
    prefix: `/api/${svc}`,
    rewritePrefix: '/'
  })
})

// Add queueing endpoints or logic as needed
// Example stub:
// fastify.post('/queue/job', async (req, reply) => {
//   await redis.lpush('job-queue', JSON.stringify(req.body))
//   reply.send({ queued: true })
// })

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
