/**
 * Unified Game Server - Servidor con físicas idénticas al frontend
 * Utiliza el motor unificado para garantizar consistencia total
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { WebSocket } from 'ws';
import { UnifiedGameManager } from './game/unified-game-manager.js';
import { notifyGameFinished } from './services/game-api-client.js';

const fastify = Fastify({
  logger: { level: 'info' }
});

// Instancia del manager de juegos unificado
const gameManager = new UnifiedGameManager();

// Conexiones WebSocket activas
const connections = new Map<string, WebSocket>();
const playerConnections = new Map<string, string>(); // playerId -> connectionId

// Configurar broadcast callback
gameManager.setBroadcastCallback((gameId: string, message: any) => {
  broadcastToGame(gameId, message);
});

// Registro de plugins
fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1048576,
    verifyClient: (info: any) => {
      fastify.log.info('WebSocket conectando', { origin: info.origin });
      return true;
    }
  }
});

fastify.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Funciones auxiliares
function sendToConnection(connectionId: string, message: any): void {
  const connection = connections.get(connectionId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

function broadcastToGame(gameId: string, message: any): void {
  const game = gameManager.getGame(gameId);
  if (game) {
    const players = game.getPlayers();
    players.forEach(player => {
      const connectionId = playerConnections.get(player.id);
      if (connectionId) {
        sendToConnection(connectionId, message);
      }
    });
  }
}

// Ruta WebSocket principal
fastify.register(async function (fastify) {
  fastify.get('/pong/:gameId', { websocket: true }, async (connection, request: any) => {
    const gameId = request.params.gameId;
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtener username del query parameter
    const username = request.query.username || 'Usuario';
    
    fastify.log.info(`🔌 Nueva conexión WebSocket: ${connectionId} para juego ${gameId}`);
    
    // Registrar conexión
    connections.set(connectionId, connection.socket);
    
    // Obtener o crear juego
    let game = gameManager.getGame(gameId);
    if (!game) {
      // Crear nuevo juego
      const newGameId = gameManager.createGame(username, 'pvp');
      if (newGameId === gameId) {
        game = gameManager.getGame(gameId);
        fastify.log.info(`🎮 Juego creado: ${gameId} por ${username}`);
      } else {
        fastify.log.error(`❌ Error creando juego: ${gameId}`);
        connection.socket.close();
        return;
      }
    } else {
      // Unirse a juego existente
      const success = gameManager.joinGame(gameId, username);
      if (!success) {
        fastify.log.warn(`❌ No se pudo unir al juego: ${gameId}`);
        sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'No se pudo unir al juego' }
        });
        connection.socket.close();
        return;
      }
      fastify.log.info(`👥 ${username} se unió al juego ${gameId}`);
    }

    // Asociar conexión con jugador
    if (game) {
      const players = game.getPlayers();
      const player = players.find(p => p.name === username);
      if (player) {
        playerConnections.set(player.id, connectionId);
      }
    }

    // Enviar estado inicial
    if (game) {
      const gameState = game.getGameState();
      sendToConnection(connectionId, {
        type: 'gameJoined',
        data: {
          gameId,
          playerNumber: game.getPlayers().length,
          gameState
        }
      });

      // Si hay 2 jugadores, iniciar countdown
      if (game.getPlayers().length === 2) {
        setTimeout(() => {
          const success = gameManager.startGame(gameId);
          if (success) {
            broadcastToGame(gameId, {
              type: 'gameStarted',
              data: { gameState: game!.getGameState() }
            });
            fastify.log.info(`🚀 Juego iniciado: ${gameId}`);
          }
        }, 1000);
      }
    }

    // Manejo de mensajes
    connection.socket.on('message', async (messageBuffer) => {
      try {
        const message = JSON.parse(messageBuffer.toString());
        const { type, data } = message;

        switch (type) {
          case 'playerMove':
            // Manejar movimiento del jugador - RESPUESTA INMEDIATA
            if (game) {
              const players = game.getPlayers();
              const player = players.find(p => p.name === username);
              if (player) {
                game.handlePlayerInput(player.id, {
                  direction: data.direction,
                  type: 'move'
                });
              }
            }
            break;

          case 'ping':
            // Responder ping para mantener conexión
            sendToConnection(connectionId, {
              type: 'pong',
              data: { timestamp: Date.now() }
            });
            break;

          default:
            fastify.log.warn(`⚠️ Mensaje desconocido: ${type}`);
        }
      } catch (error) {
        fastify.log.error('❌ Error procesando mensaje:', error);
      }
    });

    // Manejo de desconexión
    connection.socket.on('close', () => {
      fastify.log.info(`🔌 Desconexión: ${connectionId} del juego ${gameId}`);
      
      // Limpiar conexión
      connections.delete(connectionId);
      
      // Limpiar asociación jugador-conexión
      for (const [playerId, connId] of playerConnections.entries()) {
        if (connId === connectionId) {
          playerConnections.delete(playerId);
          
          // Remover jugador del juego
          if (game) {
            gameManager.removePlayerFromGame(gameId, playerId);
            
            // Notificar a otros jugadores
            broadcastToGame(gameId, {
              type: 'playerLeft',
              data: { playerId, message: 'Un jugador ha abandonado el juego' }
            });
          }
          break;
        }
      }
    });

    connection.socket.on('error', (error) => {
      fastify.log.error('❌ Error WebSocket:', error);
    });
  });
});

// Ruta de estado de salud
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeGames: gameManager.getAllGames().length,
    connections: connections.size
  };
});

// Ruta para listar juegos activos
fastify.get('/games', async (request, reply) => {
  const games = gameManager.getAllGames().map(game => ({
    id: game.getId(),
    name: game.getName(),
    status: game.getStatus(),
    players: game.getPlayers().length,
    maxPlayers: 2
  }));
  
  return { games };
});

// Inicializar servidor
const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`
🚀 Servidor Unified Game iniciado correctamente
📍 Puerto: ${port}
🌐 Host: ${host}
🎮 Motor: UnifiedGame con físicas idénticas al frontend
⚡ Framerate: 60 FPS
🔗 WebSocket: /pong/:gameId
    `);
  } catch (err) {
    fastify.log.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
};

// Manejo de señales de cierre
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor...');
  await fastify.close();
  process.exit(0);
});

// Iniciar
start();
