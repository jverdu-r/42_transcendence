const express = require('express');
const amqp = require('amqplib');
const { json } = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
app.use(json());

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER';
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests'; // Use the same queue
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses'; // Use the same queue

let RABBITMQ_USER = 'default';
let RABBITMQ_PASS = 'default';

try {
  const fs = require('fs');
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim();
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim();
} catch (err) {
  console.error(`Error reading RabbitMQ credentials: ${err}`);
  // Handle the error.
}

let rabbitmqConnection;
let rabbitmqChannel;

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`;
  try {
    rabbitmqConnection = await amqp.connect(connectionString);
    rabbitmqChannel = await rabbitmqConnection.createChannel();
    console.log('Connected to RabbitMQ');
    return rabbitmqChannel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
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

// --- Example: Store Game State ---
app.post('/game/:gameId/state', async (req, res) => {
  const gameId = req.params.gameId;
  const gameState = req.body; //  The game state data

  const correlationId = uuidv4();
  sendDatabaseRequest('store_game_state', { gameId, gameState }, correlationId);

  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          return res.status(500).json({ error: response.error });
        }
        res.status(200).json(response); //  Send back the stored state, or an "ok"
      }
    },
    { noAck: true }
  );
});

// --- Example: Get Game State ---
app.get('/game/:gameId/state', async (req, res) => {
  const gameId = req.params.gameId;

  const correlationId = uuidv4();
  sendDatabaseRequest('get_game_state', { gameId }, correlationId);

  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          if (response.error === 'Game state not found') {
            return res.status(404).json({ error: 'Game state not found' });
          }
          return res.status(500).json({ error: response.error });
        }
        res.status(200).json(response);
      }
    },
    { noAck: true }
  );
});

// --- Example: Store Game History ---
app.post('/game/:gameId/history', async (req, res) => {
  const gameId = req.params.gameId;
  const historyEntry = req.body;

  const correlationId = uuidv4();
  sendDatabaseRequest('add_game_history', { gameId, historyEntry }, correlationId);

  rabbitmqChannel.consume(
    RESPONSE_QUEUE,
    (msg) => {
      if (msg.properties.correlationId === correlationId) {
        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          return res.status(500).json({ error: response.error });
        }
        res.status(200).json(response);
      }
    },
    { noAck: true }
  );
});

// --- Example: Get Game History ---
  app.get('/game/:gameId/history', async (req, res) => {
     const gameId = req.params.gameId;
     const correlationId = uuidv4();

     sendDatabaseRequest('get_game_history', { gameId }, correlationId);

     rabbitmqChannel.consume(
         RESPONSE_QUEUE,
         (msg) => {
             if(msg.properties.correlationId === correlationId){
                 const response = JSON.parse(msg.content.toString());
                 if(response.error){
                     return res.status(500).json({error: response.error});
                 }
                 res.status(200).json(response);
             }
         },
         {noAck: true}
     );
  });

// --- Start the server ---
async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(8082, () => {  // Use a different port
      console.log('Game service is listening on port 8082');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
