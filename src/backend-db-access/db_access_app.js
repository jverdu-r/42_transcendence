const Fastify = require('fastify');
const sqlite3 = require('sqlite3').verbose();
const amqp = require('amqplib');
const { open } = require('sqlite');

// Initialize Fastify
const app = Fastify({
  logger: true // Enable logger for better development experience
});

// --- Database Configuration (SQLite) ---
const DB_FILE = process.env.DATABASE_URL || '/app/data/shared.sqlite'; //

let db; // Will hold the database connection

async function connectToDatabase() {
  try {
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });
    app.log.info('Connected to SQLite database:', DB_FILE); // Use Fastify's logger instead of console.log
    await db.exec('PRAGMA journal_mode=WAL;'); // Use WAL mode for better concurrency
    await db.exec('PRAGMA foreign_keys = ON;'); // Enforce foreign key constraints
    return db;
  } catch (error) {
    app.log.error('Error connecting to SQLite database:', error); // Use Fastify's logger
    throw error; // Re-throw to be caught by the caller.
  }
}

// --- RabbitMQ Configuration ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq'; //
const RABBITMQ_USER_FILE = process.env.RABBITMQ_USER_FILE || '/run/secrets/RABBITMQ_USER'; //
const RABBITMQ_PASS_FILE = process.env.RABBITMQ_PASS_FILE || '/run/secrets/RABBITMQ_PASS'; //
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'db_requests'; //
const RESPONSE_QUEUE = process.env.RESPONSE_QUEUE || 'db_responses'; //

let RABBITMQ_USER = 'default'; //
let RABBITMQ_PASS = 'default'; //

try {
  const fs = require('fs'); //
  RABBITMQ_USER = fs.readFileSync(RABBITMQ_USER_FILE, 'utf8').trim(); //
  RABBITMQ_PASS = fs.readFileSync(RABBITMQ_PASS_FILE, 'utf8').trim(); //
} catch (err) {
  app.log.error(`Error reading RabbitMQ credentials: ${err}`); // Use Fastify's logger
  // Handle the error appropriately.
}

let rabbitmqConnection; //
let rabbitmqChannel; //

async function connectToRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`; //
  try {
    rabbitmqConnection = await amqp.connect(connectionString); //
    rabbitmqChannel = await rabbitmqConnection.createChannel(); //
    await rabbitmqChannel.assertQueue(REQUEST_QUEUE, { durable: true }); //
    await rabbitmqChannel.assertQueue(RESPONSE_QUEUE, { durable: true }); //
    app.log.info('Connected to RabbitMQ'); // Use Fastify's logger
    return rabbitmqChannel;
  } catch (error) {
    app.log.error('Error connecting to RabbitMQ:', error); // Use Fastify's logger
    throw error; //
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
    const requestData = JSON.parse(msg.content.toString()); //
    app.log.info('Received request:', requestData); // Use Fastify's logger

    const operation = requestData.operation; //
    const data = requestData.data || {}; //

    let responseData = {};
    // let statusCode = 200; // Not directly used when sending RabbitMQ responses

    if (operation === 'create_user') { //
      try {
        const result = await db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [data.username, data.email, data.password]
        ); //
        const userId = result.lastID; //
        const newUser = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]); //
        responseData = newUser; //
      } catch (error) {
        // Corrected: SQLite doesn't have a direct 'ROLLBACK' function for individual `run` calls.
        // For simple inserts, the error itself prevents the insert.
        responseData = { error: error.message }; //
      }
    } else if (operation === 'get_user') { //
      const userId = data.user_id; //
      if (userId) { //
        try {
          const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]); //
          if (user) { //
            responseData = user; //
          } else {
            responseData = { error: 'User not found' }; //
          }
        } catch (error) {
          responseData = { error: error.message }; //
        }
      } else if (data.username && data.password) { // Handle login scenario
        try {
          // In a real application, you'd hash and compare passwords securely.
          // For this example, assuming a simple username/password check.
          const user = await db.get('SELECT id, username, email FROM users WHERE username = ? AND password = ?', [data.username, data.password]);
          if (user) {
            responseData = user;
          } else {
            responseData = { error: 'User not found' };
          }
        } catch (error) {
          responseData = { error: error.message };
        }
      }
      else {
        responseData = { error: 'User ID or username/password is required' };
      }
    } else if (operation === 'get_all_users') { //
        try{
            const users = await db.all('SELECT id, username, email FROM users'); //
            responseData = users; //
        } catch(error){
            responseData = {error: error.message}; //
        }
    } else if (operation === 'store_game_state') {
        try {
            const { gameId, gameState } = data;
            await db.run('INSERT OR REPLACE INTO game_states (game_id, state_data) VALUES (?, ?)', [gameId, JSON.stringify(gameState)]);
            responseData = { message: 'Game state stored successfully', gameId };
        } catch (error) {
            responseData = { error: error.message };
        }
    } else if (operation === 'get_game_state') {
        try {
            const { gameId } = data;
            const result = await db.get('SELECT state_data FROM game_states WHERE game_id = ?', [gameId]);
            if (result) {
                responseData = JSON.parse(result.state_data);
            } else {
                responseData = { error: 'Game state not found' };
            }
        } catch (error) {
            responseData = { error: error.message };
        }
    } else if (operation === 'add_game_history') {
        try {
            const { gameId, historyEntry } = data;
            await db.run('INSERT INTO game_history (game_id, history_entry) VALUES (?, ?)', [gameId, JSON.stringify(historyEntry)]);
            responseData = { message: 'Game history added successfully', gameId };
        } catch (error) {
            responseData = { error: error.message };
        }
    } else if (operation === 'get_game_history') {
        try {
            const { gameId } = data;
            const results = await db.all('SELECT history_entry FROM game_history WHERE game_id = ? ORDER BY timestamp ASC', [gameId]);
            responseData = results.map(row => JSON.parse(row.history_entry));
        } catch (error) {
            responseData = { error: error.message };
        }
    }
    else {
      responseData = { error: 'Invalid operation' }; //
    }

    // Send response back
    if (msg.properties.correlationId) { //
      const responseMessage = JSON.stringify(responseData); //
      sendResponse(msg.properties.correlationId, responseMessage); //
    }

    rabbitmqChannel.ack(msg); //
  } catch (error) {
    app.log.error('Error processing request:', error); // Use Fastify's logger
    if (msg.properties.correlationId) { //
      sendResponse(msg.properties.correlationId, JSON.stringify({ error: `Internal server error: ${error.message}` })); //
    }
    rabbitmqChannel.nack(msg, false, true); //
  }
}

// --- API Endpoints (Optional, these would directly interact with the DB) ---
// Note: In a microservices architecture, direct API endpoints to the database
// are often avoided. Requests usually go through a gateway or other services.
app.get('/health', (request, reply) => { // Fastify uses request and reply
  reply.status(200).send({ status: 'ok' }); // Fastify uses .send()
});

app.get('/users/:userId', async (request, reply) => { // Fastify uses request and reply
  const userId = parseInt(request.params.userId, 10); //
  try {
    const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId]); //
    if (user) { //
      reply.status(200).send(user); // Fastify uses .send()
    } else {
      reply.status(404).send({ error: 'User not found' }); // Fastify uses .send()
    }
  } catch (error) {
    app.log.error("Error getting user", error); // Use Fastify's logger
    reply.status(500).send({ error: error.message }); // Fastify uses .send()
  }
});

// --- Start the server ---
async function startServer() {
  try {
    await connectToDatabase(); //
    await connectToRabbitMQ(); //
    rabbitmqChannel.consume(REQUEST_QUEUE, processRequest, { noAck: false }); // Ensure manual ack is set here
    app.log.info('Waiting for messages...'); // Use Fastify's logger

    await app.listen({ port: 8080, host: '0.0.0.0' }); // Listen on all interfaces
    app.log.info('Database service is listening on port 8080'); // Use Fastify's logger

  } catch (error) {
    app.log.error('Failed to start server:', error); // Use Fastify's logger
    process.exit(1); //
  }
}

startServer();

// Added: Database table