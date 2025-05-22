const Fastify = require('fastify');
const amqp = require('amqplib');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Initialize Fastify
const app = Fastify({
  logger: true // Enable logger for better development experience
});

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq'; //
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER'; //
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS'; //
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests'; //
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses'; //
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; //

let RABBITMQ_USER = 'default'; //
let RABBITMQ_PASS = 'default'; //

try {
  const fs = require('fs'); //
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim(); //
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim(); //
} catch (err) {
  app.log.error(`Error reading RabbitMQ credentials: ${err}`); // Use Fastify's logger
  // Handle appropriately.
}

let rabbitmqConnection; //
let rabbitmqChannel; //

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`; //
  try {
    rabbitmqConnection = await amqp.connect(connectionString); //
    rabbitmqChannel = await rabbitmqConnection.createChannel(); //
    app.log.info('Connected to RabbitMQ'); // Use Fastify's logger
    return rabbitmqChannel;
  } catch (error) {
    app.log.error('Error connecting to RabbitMQ:', error); // Use Fastify's logger
    throw error; //
  }
}

// --- Helper function to send requests to the db_requests queue ---
function sendDatabaseRequest(operation, data, correlationId) {
  const message = {
    operation,
    data,
  }; //
  rabbitmqChannel.sendToQueue(REQUEST_QUEUE, Buffer.from(JSON.stringify(message)), {
    correlationId: correlationId, // Include correlation ID
    replyTo: RESPONSE_QUEUE, // Tell backend-db-access where to send the response
  });
}

// --- Helper function to generate a JWT ---
function generateJWT(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' }); // Configure expiration
}

// --- Route: Register a new user ---
app.post('/register', async (request, reply) => { // Fastify uses request and reply
  const { username, email, password } = request.body; // Include password

  // Basic validation
  if (!username || !email || !password) { // Check for password
    return reply.status(400).send({ error: 'Username, email, and password are required' }); // Fastify uses .send()
  }

  const correlationId = uuidv4(); // Generate unique ID for the request
  sendDatabaseRequest('create_user', { username, email, password }, correlationId); // Send password

  // Return a promise that resolves when the RabbitMQ response is received
  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4(); // Generate a unique tag for this consumer
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          // Process the response
          const response = JSON.parse(msg.content.toString()); //
          if (response.error) { //
            if (response.error.includes('UNIQUE constraint failed')) { //
              reply.status(409).send({ error: 'Username or email already exists' }); // Conflict
            } else {
              reply.status(500).send({ error: response.error }); //
            }
            rabbitmqChannel.ack(msg); // Acknowledge the message
            rabbitmqChannel.cancel(consumerTag); // Cancel the consumer to stop listening
            resolve(); // Resolve the promise after sending the response
          } else {
            // Include a JWT in the response
            const token = generateJWT(response.id); //
            reply.status(201).send({ user: response, token }); // Send the token
            rabbitmqChannel.ack(msg); // Acknowledge the message
            rabbitmqChannel.cancel(consumerTag); // Cancel the consumer to stop listening
            resolve(); // Resolve the promise after sending the response
          }
        }
      },
      { noAck: false, consumerTag: consumerTag } // Set to false to manually acknowledge, assign consumer tag
    );
  });
});

// --- Route: Login ---
app.post('/login', async (request, reply) => {
  const { username, password } = request.body; // Get password

  if (!username || !password) { // Check password
    return reply.status(400).send({ error: 'Username and password are required' }); // Fastify uses .send()
  }

  const correlationId = uuidv4(); //
  sendDatabaseRequest('get_user', { username, password }, correlationId); // Send password

  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4();
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString()); //
          if (response.error) { //
            if (response.error === 'User not found') { //
              reply.status(401).send({ error: 'Invalid credentials' }); // Unauthorized
            } else {
              reply.status(500).send({ error: response.error }); //
            }
            rabbitmqChannel.ack(msg);
            rabbitmqChannel.cancel(consumerTag);
            resolve();
          } else {
            // Include JWT on successful login
            const token = generateJWT(response.id); //
            reply.status(200).send({ user: response, token }); // Send token
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

// --- Route: Get user by ID (example, protected with JWT) ---
app.get('/users/:userId', async (request, reply) => {
  // In a real app, you'd have middleware to verify the JWT here.
  const userId = parseInt(request.params.userId, 10); //

  const correlationId = uuidv4(); //
  sendDatabaseRequest('get_user', { user_id: userId }, correlationId); //

  return new Promise((resolve, reject) => {
    const consumerTag = uuidv4();
    rabbitmqChannel.consume(
      RESPONSE_QUEUE,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString()); //
          if (response.error) { //
            if (response.error === 'User not found') { //
              reply.status(404).send({ error: 'User not found' }); //
            } else {
              reply.status(500).send({ error: response.error }); //
            }
            rabbitmqChannel.ack(msg);
            rabbitmqChannel.cancel(consumerTag);
            resolve();
          } else {
            reply.status(200).send(response); //
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

// --- Start the server ---
async function startServer() {
  try {
    await connectToRabbitMQ(); //
    // No direct consuming here. We consume in the route handlers.
    await app.listen({ port: 8081, host: '0.0.0.0' }); // Use a different port than backend-db-access
    app.log.info('Authentication service is listening on port 8081'); // Use Fastify's logger
  } catch (error) {
    app.log.error('Failed to start server:', error); // Use Fastify's logger
    process.exit(1); //
  }
}

startServer();