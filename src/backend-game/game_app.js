const Fastify = require('fastify');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// Initialize Fastify
const app = Fastify({
  logger: true // Enable logger for better development experience
});

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER';
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests'; // Use the same queue as other services
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses'; // Use the same queue for responses

let RABBITMQ_USER = 'default';
let RABBITMQ_PASS = 'default';

try {
  const fs = require('fs');
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim();
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim();
} catch (err) {
  app.log.error(`Error reading RabbitMQ credentials: ${err}`); // Use Fastify's logger
  // Handle the error.
}

let rabbitmqConnection;
let rabbitmqChannel;

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`;
  try {
    rabbitmqConnection = await amqp.connect(connectionString);
    rabbitmqChannel = await rabbitmqConnection.createChannel();
    // Ensure the queues exist. While db_access_app asserts them, it's good practice here too.
    await rabbitmqChannel.assertQueue(REQUEST_QUEUE, { durable: true });
    await rabbitmqChannel.assertQueue(RESPONSE_QUEUE, { durable: true });
    app.log.info('Connected to RabbitMQ'); // Use Fastify's logger
    return rabbitmqChannel;
  } catch (error) {
    app.log.error('Error connecting to RabbitMQ:', error); // Use Fastify's logger
    throw error;
  }
}

// --- Helper function to send requests to the database service ---
function sendDatabaseRequest(operation, data, correlationId) {
  const message = {
    operation,
    data,
  };
  rabbitmqChannel.sendToQueue(REQUEST_QUEUE, Buffer.from(JSON.stringify(message)), {
    correlationId: correlationId,
    replyTo: RESPONSE_QUEUE,
  });
}

// --- Route: Store Game State ---
app.post('/game/:gameId/state', async (request, reply) => { // Fastify uses request and reply
  const gameId = request.params.gameId;
  const gameState = request.body; // The game state data

  const correlationId = uuidv4();
  sendDatabaseRequest('store_game_state', { gameId, gameState }, correlationId);

  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4();
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          if (response.error) {
            reply.status(500).send({ error: response.error }); // Fastify uses .send()
          } else {
            reply.status(200).send(response); // Send back the stored state, or an "ok"
          }
          rabbitmqChannel.ack(msg); // Acknowledge the message
          rabbitmqChannel.cancel(consumerTag); // Cancel the consumer
          resolve();
        }
      },
      { noAck: false, consumerTag: consumerTag } // Set to false to manually acknowledge
    );
  });
});

// --- Route: Get Game State ---
app.get('/game/:gameId/state', async (request, reply) => {
  const gameId = request.params.gameId;

  const correlationId = uuidv4();
  sendDatabaseRequest('get_game_state', { gameId }, correlationId);

  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4();
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          if (response.error) {
            if (response.error === 'Game state not found') {
              reply.status(404).send({ error: 'Game state not found' });
            } else {
              reply.status(500).send({ error: response.error });
            }
            rabbitmqChannel.ack(msg);
            rabbitmqChannel.cancel(consumerTag);
            resolve();
          } else {
            reply.status(200).send(response);
            rabbitmqChannel.ack(msg);
            rabbitmqChannel.cancel(consumerTag);
            resolve();
          }
        }
      },
      { noAck: false, consumerTag: consumerTag }
    );
  });
});

// --- Route: Store Game History ---
app.post('/game/:gameId/history', async (request, reply) => {
  const gameId = request.params.gameId;
  const historyEntry = request.body;

  const correlationId = uuidv4();
  sendDatabaseRequest('add_game_history', { gameId, historyEntry }, correlationId);

  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4();
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          if (response.error) {
            reply.status(500).send({ error: response.error });
          } else {
            reply.status(200).send(response);
          }
          rabbitmqChannel.ack(msg);
          rabbitmqChannel.cancel(consumerTag);
          resolve();
        }
      },
      { noAck: false, consumerTag: consumerTag }
    );
  });
});

// --- Route: Get Game History ---
app.get('/game/:gameId/history', async (request, reply) => {
   const gameId = request.params.gameId;
   const correlationId = uuidv4();

   sendDatabaseRequest('get_game_history', { gameId }, correlationId);

   return new Promise((resolve, reject) => {
     const consumerTag = uuidv4();
     rabbitmqChannel.consume(
         RESPONSE_QUEUE,
         (msg) => {
             if(msg.properties.correlationId === correlationId){
                 const response = JSON.parse(msg.content.toString());
                 if(response.error){
                     reply.status(500).send({error: response.error});
                 } else {
                     reply.status(200).send(response);
                 }
                 rabbitmqChannel.ack(msg);
                 rabbitmqChannel.cancel(consumerTag);
                 resolve();
             }
         },
         {noAck: false, consumerTag: consumerTag}
     );
  });
});

// --- Health check endpoint ---
app.get('/health', async (request, reply) => {
  return reply.status(200).send({ status: 'ok', service: 'backend-game' });
});

// --- Start the server ---
async function startServer() {
  try {
    await connectToRabbitMQ();
    // Start the API server on port 8082
    await app.listen({ port: 8082, host: '0.0.0.0' });
    app.log.info('Game service API is listening on port 8082');
    
    // TODO: Also start WebSocket server on port 3000 for real-time game communication
    // This would require a separate WebSocket implementation
    app.log.info('WebSocket server should be implemented on port 3000 for real-time game');
  } catch (error) {
    app.log.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
