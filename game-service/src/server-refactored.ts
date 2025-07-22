/**
 * Main server application - refactored with clean architecture
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

// Import refactored modules
import { ServerConfig } from './config/index.js';
import { GameManager } from './game/index.js';
import { 
  ConnectionService, 
  GameBroadcastService, 
  ApiResponseService 
} from './services/index.js';
import { 
  WebSocketController, 
  ApiController, 
  HealthController 
} from './controllers/index.js';
import { 
  SERVER_CONFIG, 
  LOG_LEVELS, 
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES 
} from './constants/index.js';

// Initialize server configuration
const serverConfig = ServerConfig.getInstance();
const fastify = Fastify({
  logger: {
    level: LOG_LEVELS.INFO,
  },
});

// Initialize core services
const gameManager = new GameManager();
const connectionService = new ConnectionService();
const broadcastService = new GameBroadcastService(connectionService, gameManager);
const apiResponseService = new ApiResponseService();

// Initialize controllers
const webSocketController = new WebSocketController(
  fastify,
  connectionService,
  broadcastService,
  gameManager
);
const apiController = new ApiController(fastify, gameManager, apiResponseService);
const healthController = new HealthController(gameManager, connectionService);

// Register plugins
await fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: serverConfig.getMaxPayload(),
    verifyClient: (info: any) => {
      fastify.log.info('WebSocket client attempting to connect', { origin: info.origin });
      return true;
    },
  },
});

await fastify.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// WebSocket routes
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const clientId = connectionService.addConnection(connection.socket);
    
    fastify.log.info(`🔗 Client connected: ${clientId}`);
    
    // Send connection confirmation
    connectionService.sendToClient(clientId, {
      type: MESSAGE_TYPES.CONNECTION,
      data: { clientId, message: 'Connected to game server' },
    });

    connection.socket.on(WEBSOCKET_EVENTS.MESSAGE, async (message) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info(`📨 Message from ${clientId}:`, data);
        
        await webSocketController.handleClientMessage(clientId, data);
      } catch (error) {
        fastify.log.error('Error processing message:', error);
        broadcastService.sendError(clientId, 'Invalid message format');
      }
    });

    connection.socket.on(WEBSOCKET_EVENTS.CLOSE, () => {
      fastify.log.info(`🔌 Client disconnected: ${clientId}`);
      webSocketController.handleClientDisconnect(clientId);
    });

    connection.socket.on(WEBSOCKET_EVENTS.ERROR, (error) => {
      fastify.log.error(`❌ WebSocket error for client ${clientId}:`, error);
    });
  });
});

// WebSocket route for specific games
fastify.register(async function (fastify) {
  fastify.get('/pong/:gameId', { websocket: true }, (connection, request: any) => {
    const gameId = request.params.gameId;
    const clientId = connectionService.addConnection(connection.socket);
    
    fastify.log.info(`🔗 Client connected to game ${gameId}: ${clientId}`);
    
    connectionService.sendToClient(clientId, {
      type: MESSAGE_TYPES.CONNECTION,
      data: { clientId, gameId, message: `Connected to game ${gameId}` },
    });

    connection.socket.on(WEBSOCKET_EVENTS.MESSAGE, async (message) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info(`📨 Message from ${clientId} in game ${gameId}:`, data);
        
        await webSocketController.handleClientMessage(clientId, { ...data, gameId });
      } catch (error) {
        fastify.log.error('Error processing message:', error);
        broadcastService.sendError(clientId, 'Invalid message format');
      }
    });

    connection.socket.on(WEBSOCKET_EVENTS.CLOSE, () => {
      fastify.log.info(`🔌 Client disconnected from game ${gameId}: ${clientId}`);
      webSocketController.handleClientDisconnect(clientId);
    });

    connection.socket.on(WEBSOCKET_EVENTS.ERROR, (error) => {
      fastify.log.error(`❌ WebSocket error for client ${clientId} in game ${gameId}:`, error);
    });
  });
});

// Health and statistics endpoints
fastify.get('/health', healthController.getHealthCheck.bind(healthController));
fastify.get('/stats', healthController.getStats.bind(healthController));

// Game management API endpoints
fastify.get('/', apiController.getAllGames.bind(apiController));
fastify.get('/:gameId', apiController.getGameById.bind(apiController));
fastify.post('/', apiController.createGame.bind(apiController));
fastify.post('/:gameId/join', apiController.joinGame.bind(apiController));

// API routes with /api prefix
fastify.get('/api/games', apiController.getApiGames.bind(apiController));
fastify.get('/api/games/:gameId', apiController.getApiGameById.bind(apiController));
fastify.post('/api/games', apiController.createApiGame.bind(apiController));

// Graceful shutdown
const handleShutdown = (signal: string) => {
  fastify.log.info(`🛑 Received ${signal}, shutting down gracefully...`);
  gameManager.cleanup();
  connectionService.cleanup();
  fastify.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start the server
const start = async (): Promise<void> => {
  try {
    const port = serverConfig.getPort();
    const host = serverConfig.getHost();
    
    await fastify.listen({ port, host });
    fastify.log.info(`🎮 Game Service running on ${host}:${port}`);
    fastify.log.info(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`);
    fastify.log.info(`❤️ Health check: http://${host}:${port}/health`);
    fastify.log.info(`📊 Stats endpoint: http://${host}:${port}/stats`);
  } catch (err) {
    fastify.log.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

// Start the application
start();
