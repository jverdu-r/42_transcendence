const express = require('express');
const amqp = require('amqplib');
const { json } = require('body-parser');
const jwt = require('jsonwebtoken'); // For JWT (if you use it)
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
app.use(json());

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER';
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests'; // Use the same request queue
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses'; //  Use the same response queue
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; //  Use a strong, *externalized* secret!

let RABBITMQ_USER = 'default';
let RABBITMQ_PASS = 'default';

try {
  const fs = require('fs');
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim();
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim();
} catch (err) {
  console.error(`Error reading RabbitMQ credentials: ${err}`);
  //  Handle appropriately.
}

let rabbitmqConnection;
let rabbitmqChannel;

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`;
  try {
    rabbitmqConnection = await amqp.connect(connectionString);
    rabbitmqChannel = await rabbitmqConnection.createChannel();
    // We only send to the request queue.  backend-db-access sends to the response queue.
    console.log('Connected to RabbitMQ');
    return rabbitmqChannel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
}

// --- Helper function to send requests to the db_requests queue ---
function sendDatabaseRequest(operation, data, correlationId) {
  const message = {
    operation,
    data,
  };
  rabbitmqChannel.sendToQueue(REQUEST_QUEUE, Buffer.from(JSON.stringify(message)), {
    correlationId: correlationId, // Include correlation ID
    replyTo: RESPONSE_QUEUE, // Tell backend-db-access where to send the response
  });
}

// --- Helper function to generate a JWT ---
function generateJWT(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' }); //  Configure expiration
}

// --- Route: Register a new user ---
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body; //  Include password

  //  Basic validation
  if (!username || !email || !password) { //  Check for password
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const correlationId = uuidv4(); // Generate unique ID for the request
  sendDatabaseRequest('create_user', { username, email, password }, correlationId); // Send password

  // Set up a consumer to receive the response
  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        //  Process the response
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          if (response.error.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists' }); // Conflict
          }
          return res.status(500).json({ error: response.error });
        }
        //  Include a JWT in the response
        const token = generateJWT(response.id);
        res.status(201).json({ user: response, token }); //  Send the token
      }
    },
    { noAck: true } //  Important:  ack the message.
  );
});

// --- Route: Login ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body; //  Get password

  if (!username || !password) { //  Check password
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const correlationId = uuidv4();
  sendDatabaseRequest('get_user', { username, password }, correlationId); //  Send password

  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          if (response.error === 'User not found') {
            return res.status(401).json({ error: 'Invalid credentials' }); // Unauthorized
          }
          return res.status(500).json({ error: response.error });
        }
        //  Include JWT on successful login
        const token = generateJWT(response.id);
        res.status(200).json({ user: response, token }); //  Send token
      }
    },
    { noAck: true }
  );
});

// --- Route: Get user by ID (example, protected with JWT) ---
app.get('/users/:userId', async (req, res) => {
  //  In a real app, you'd have middleware to verify the JWT here.
  const userId = parseInt(req.params.userId, 10);

  const correlationId = uuidv4();
  sendDatabaseRequest('get_user', { user_id: userId }, correlationId);

  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          if (response.error === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
          }
          return res.status(500).json({ error: response.error });
        }
        res.status(200).json(response);
      }
    },
    { noAck: true }
  );
});

// --- Start the server ---
async function startServer() {
  try {
    await connectToRabbitMQ();
    //  No direct consuming here.  We consume in the route handlers.
    app.listen(8081, () => { //  Use a different port than backend-db-access
      console.log('Authentication service is listening on port 8081');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
