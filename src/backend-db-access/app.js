const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Use the verbose mode for more detailed error messages
const amqp = require('amqplib');
const { json } = require('body-parser');
const { open } = require('sqlite'); // Use the async version of sqlite

const app = express();
app.use(json());

// --- Database Configuration (SQLite) ---
const DB_FILE = process.env.DATABASE_URL || '/app/data/shared.sqlite'; // Use the DATABASE_URL

let db; // Will hold the database connection

async function connectToDatabase() {
  try {
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });
    console.log('Connected to SQLite database:', DB_FILE);
    await db.exec('PRAGMA journal_mode=WAL;'); // Use WAL mode for better concurrency
    await db.exec('PRAGMA foreign_keys = ON;'); //Enforce foreign key constraints
    return db;
  } catch (error) {
    console.error('Error connecting to SQLite database:', error);
    throw error; // Re-throw to be caught by the caller.
  }
}

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER';
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests';
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses';

let RABBITMQ_USER = 'default';
let RABBITMQ_PASS = 'default';

try {
  const fs = require('fs');
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim();
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim();
} catch (err) {
  console.error(`Error reading RabbitMQ credentials: ${err}`);
  //  Handle the error appropriately.
}

let rabbitmqConnection;
let rabbitmqChannel;

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`;
  try {
    rabbitmqConnection = await amqp.connect(connectionString);
    rabbitmqChannel = await rabbitmqConnection.createChannel();
    await rabbitmqChannel.assertQueue(REQUEST_QUEUE, { durable: true });
    await rabbitmqChannel.assertQueue(RESPONSE_QUEUE, { durable: true });
    console.log('Connected to RabbitMQ');
    return rabbitmqChannel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
}

// --- Helper function to send responses ---
function sendResponse(correlationId, body) {
  rabbitmqChannel.sendToQueue(RESPONSE_QUEUE, Buffer.from(body), {
    correlationId: correlationId,
  });
}

// --- Message processing function ---
async function processRequest(msg) {
  try {
    const requestData = JSON.parse(msg.content.toString());
    console.log('Received request:', requestData);

    const operation = requestData.operation;
    const data = requestData.data || {};

    let responseData = {};
    let statusCode = 200;

    if (operation === 'create_user') {
      try {
        const result = await db.run(
          'INSERT INTO users (username, email) VALUES (?, ?) RETURNING id',
          [data.username, data.email]
        );
        const userId = result.lastID;
        const newUser = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]);
        responseData = newUser;
        statusCode = 201;
      } catch (error) {
        await db.run('ROLLBACK'); // SQLite doesn't have a direct ROLLBACK function.
        responseData = { error: error.message };
        statusCode = 500;
      }
    } else if (operation === 'get_user') {
      const userId = data.user_id;
      if (userId) {
        try {
          const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]);
          if (user) {
            responseData = user;
          } else {
            responseData = { error: 'User not found' };
            statusCode = 404;
          }
        } catch (error) {
          responseData = { error: error.message };
          statusCode = 500;
        }
      } else {
        responseData = { error: 'User ID is required' };
        statusCode = 400;
      }
    } else if (operation === 'get_all_users') {
        try{
            const users = await db.all('SELECT id, username, email FROM users');
            responseData = users;
        } catch(error){
            responseData = {error: error.message};
            statusCode = 500;
        }
    } else {
      responseData = { error: 'Invalid operation' };
      statusCode = 400;
    }

    // Send response back
    if (msg.properties.correlationId) {
      const responseMessage = JSON.stringify(responseData);
      sendResponse(msg.properties.correlationId, responseMessage);
    }

    rabbitmqChannel.ack(msg);
  } catch (error) {
    console.error('Error processing request:', error);
    if (msg.properties.correlationId) {
      sendResponse(msg.properties.correlationId, JSON.stringify({ error: `Internal server error: ${error.message}` }));
    }
    rabbitmqChannel.nack(msg, false, true);
  }
}

// --- Flask API Endpoints (Optional) ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/users/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error("Error getting user", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Start the server ---
async function startServer() {
  try {
    await connectToDatabase();
    await connectToRabbitMQ();
    rabbitmqChannel.consume(REQUEST_QUEUE, processRequest);
    console.log('Waiting for messages...');

     app.listen(8080, () => {
      console.log('Server is listening on port 8080');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();