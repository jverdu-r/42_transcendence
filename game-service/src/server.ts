import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import redis from './redis-client.js';

const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Simple in-memory game management
const activeGames = new Map();
const orphanedGameTimeouts = new Map();
const connections = new Map();
const playerToClient = new Map();
const clientToPlayer = new Map();
const spectators = new Map();

// Register plugins
fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1048576,
    verifyClient: (info: any) => {
      fastify.log.info('WebSocket client attempting to connect', { origin: info.origin });
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

// Helper functions
function sendToClient(clientId: string, message: any): void {
  const connection = connections.get(clientId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

function broadcastToGame(gameId: string, message: any): void {
  const game = activeGames.get(gameId);
  if (game && game.players) {
    game.players.forEach((player: any) => {
      // player.id is the clientId in our current implementation
      const clientId = player.id;
      if (clientId && connections.has(clientId)) {
        sendToClient(clientId, message);
      }
    });
  }
}

// WebSocket route for game lobbies
fastify.register(async function (fastify) {
  fastify.get('/pong/:gameId', { websocket: true }, (connection, request: any) => {
    const gameId = request.params.gameId;
    const clientId = uuidv4();
    const username = new URL(request.url, 'http://localhost').searchParams.get('username') || 'Usuario';
    
    connections.set(clientId, connection.socket);
    
    fastify.log.info(`🔗 Client ${username} connected to game ${gameId}: ${clientId}`);
    
    // Get or create game
    let game = activeGames.get(gameId);
    if (!game) {
      game = {
        id: gameId,
        players: [],
        status: 'waiting',
        gameState: {
          palas: {
            jugador1: { x: 30, y: 250 },
            jugador2: { x: 755, y: 250 }
          },
          pelota: { x: 400, y: 300, vx: 4, vy: 2, radio: 8 },
          puntuacion: { jugador1: 0, jugador2: 0 },
          palaAncho: 15,
          palaAlto: 100
        },
        createdAt: Date.now()
      };
      activeGames.set(gameId, game);
    }
    // If a player joins, clear the orphaned timeout
    if (orphanedGameTimeouts.has(gameId)) {
      clearTimeout(orphanedGameTimeouts.get(gameId));
      orphanedGameTimeouts.delete(gameId);
    }
    // Check if player already exists by username
    const existingPlayer = game.players.find((p: any) => p.nombre === username);
    let playerNumber;
    let isNewPlayer = false;
    
    if (existingPlayer) {
      // Reconnecting player
      playerNumber = existingPlayer.numero;
      existingPlayer.id = clientId;
      existingPlayer.isConnected = true;
      fastify.log.info(`🔄 Player ${username} reconnected to game ${gameId}`);
    } else {
      // New player
      playerNumber = game.players.length + 1;
      if (playerNumber <= 2) {
        const player = {
          id: clientId,
          nombre: username,
          numero: playerNumber,
          isConnected: true
        };
        
        game.players.push(player);
        isNewPlayer = true;
        fastify.log.info(`➕ New player ${username} joined game ${gameId} as player ${playerNumber}`);
      } else {
        sendToClient(clientId, {
          type: 'error',
          message: 'La partida está llena'
        });
        connection.socket.close();
        return;
      }
    }
    
    // Update mappings - Map player ID to client ID for broadcasting
    playerToClient.set(clientId, clientId);
    clientToPlayer.set(clientId, clientId);
    
    // Send welcome message
    sendToClient(clientId, {
      type: 'gameJoined',
      gameId: gameId,
      playerNumber: playerNumber,
      playersConnected: game.players.length,
      playerName: username
    });
    
    // Notify all players about player update
    broadcastToGame(gameId, {
      type: 'playerJoined',
      playersConnected: game.players.length,
      playerName: username,
      playerNumber: playerNumber
    });
    
    // If we have 2 unique players and game isn't already starting, start countdown
    if (game.players.length === 2 && game.status === 'waiting' && isNewPlayer) {
      game.status = 'starting';
      fastify.log.info(`🚀 Starting countdown for game ${gameId} with ${game.players.length} players`);
      setTimeout(() => startCountdown(gameId), 500); // Small delay to ensure all messages are sent
    }

    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info(`📨 Message from ${clientId}:`, data);
        
        handleGameMessage(clientId, gameId, data);
      } catch (error) {
        fastify.log.error('Error processing message:', error);
      }
    });

    connection.socket.on('close', () => {
      fastify.log.info(`🔌 Client disconnected: ${clientId}`);
      handleClientDisconnect(clientId, gameId);
    });

    connection.socket.on('error', (error) => {
      fastify.log.error(`❌ WebSocket error for client ${clientId}:`, error);
    });
  });
});

function startCountdown(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) {
    fastify.log.error(`❌ Cannot start countdown: Game ${gameId} not found`);
    return;
  }
  
  fastify.log.info(`⏰ Starting countdown for game ${gameId}`);
  let countdown = 3;
  
  // Notificar inicio de cuenta atrás
  try {
    broadcastToGame(gameId, {
      type: 'countdownStart'
    });
    fastify.log.info(`📢 Sent countdownStart to game ${gameId}`);
  } catch (error) {
    fastify.log.error(`❌ Error sending countdownStart:`, error);
  }
  
  const countdownInterval = setInterval(() => {
    try {
      fastify.log.info(`⏰ Countdown ${countdown} for game ${gameId}`);
      broadcastToGame(gameId, {
        type: 'countdownUpdate',
        count: countdown
      });
      
      countdown--;
      
      if (countdown < 0) {
        clearInterval(countdownInterval);
        fastify.log.info(`🚀 Countdown finished, starting game ${gameId}`);
        startGame(gameId);
      }
    } catch (error) {
      fastify.log.error(`❌ Error in countdown interval:`, error);
      clearInterval(countdownInterval);
    }
  }, 1000);
}

function startGame(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) {
    fastify.log.error(`❌ Cannot start game: Game ${gameId} not found`);
    return;
  }
  
  fastify.log.info(`🎮 Starting game ${gameId} with ${game.players.length} players`);
  game.status = 'playing';
  
  try {
    broadcastToGame(gameId, {
      type: 'gameStarted',
      gameId: gameId
    });
    fastify.log.info(`📢 Sent gameStarted message to game ${gameId}`);
    
    // Start game loop
    startGameLoop(gameId);
    fastify.log.info(`🔄 Game loop started for game ${gameId}`);
  } catch (error) {
    fastify.log.error(`❌ Error starting game ${gameId}:`, error);
  }
}

function startGameLoop(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  const gameLoop = setInterval(() => {
    const currentGame = activeGames.get(gameId);
    if (!currentGame || currentGame.status !== 'playing') {
      clearInterval(gameLoop);
      return;
    }
    
    // Update game physics
    updateGamePhysics(currentGame);
    
    // Broadcast game state con nombres de ambos jugadores
    broadcastToGame(gameId, {
      type: 'gameState',
      data: {
        gameState: {
          ball: {
            x: currentGame.gameState.pelota.x,
            y: currentGame.gameState.pelota.y,
            vx: currentGame.gameState.pelota.vx,
            vy: currentGame.gameState.pelota.vy,
            radius: currentGame.gameState.pelota.radio
          },
          paddles: {
            left: {
              x: currentGame.gameState.palas.jugador1.x,
              y: currentGame.gameState.palas.jugador1.y,
              width: currentGame.gameState.palaAncho,
              height: currentGame.gameState.palaAlto
            },
            right: {
              x: currentGame.gameState.palas.jugador2.x,
              y: currentGame.gameState.palas.jugador2.y,
              width: currentGame.gameState.palaAncho,
              height: currentGame.gameState.palaAlto
            }
          },
          score: {
            left: currentGame.gameState.puntuacion.jugador1,
            right: currentGame.gameState.puntuacion.jugador2
          },
          playerNames: {
            left: (currentGame.players.find((p: any) => p.numero === 1)?.nombre) || 'Jugador 1',
            right: (currentGame.players.find((p: any) => p.numero === 2)?.nombre) || 'Jugador 2'
          },
          gameRunning: true,
          canvas: { width: 800, height: 600 },
          maxScore: 5,
          rallieCount: 0
        }
      }
    });
    
    // Check for game end
    if (currentGame.gameState.puntuacion.jugador1 >= 5 || currentGame.gameState.puntuacion.jugador2 >= 5) {
      endGame(gameId);
      clearInterval(gameLoop);
    }
  }, 1000 / 60); // 60 FPS
}

function updateGamePhysics(game: any): void {
  const state = game.gameState;
  
  // Move ball
  state.pelota.x += state.pelota.vx;
  state.pelota.y += state.pelota.vy;

  // Ball collision with top/bottom walls (mejorado)
  if (state.pelota.y <= state.pelota.radio) {
    state.pelota.y = state.pelota.radio;
    state.pelota.vy = -state.pelota.vy;
  } else if (state.pelota.y >= 600 - state.pelota.radio) {
    state.pelota.y = 600 - state.pelota.radio;
    state.pelota.vy = -state.pelota.vy;
  }

  // Ball collision with paddles (física mejorada)
  const ballLeft = state.pelota.x - state.pelota.radio;
  const ballRight = state.pelota.x + state.pelota.radio;
  const ballTop = state.pelota.y - state.pelota.radio;
  const ballBottom = state.pelota.y + state.pelota.radio;

  // Helper para rebote con ángulo
  function calcBounce(ballY: number, paddleY: number, paddleHeight: number) {
    const relativeIntersectY = (paddleY + paddleHeight / 2) - ballY;
    const normalized = relativeIntersectY / (paddleHeight / 2);
    const maxBounceAngle = Math.PI / 3; // 60 grados
    return normalized * maxBounceAngle;
  }

  // Left paddle collision (mejorado)
  if (
    ballLeft <= state.palas.jugador1.x + state.palaAncho &&
    ballRight >= state.palas.jugador1.x &&
    ballBottom >= state.palas.jugador1.y &&
    ballTop <= state.palas.jugador1.y + state.palaAlto &&
    state.pelota.vx < 0
  ) {
    const angle = calcBounce(state.pelota.y, state.palas.jugador1.y, state.palaAlto);
    const speed = Math.min(Math.sqrt(state.pelota.vx ** 2 + state.pelota.vy ** 2) * 1.07, 14);
    state.pelota.vx = Math.abs(Math.cos(angle) * speed);
    state.pelota.vy = -Math.sin(angle) * speed;
    state.pelota.x = state.palas.jugador1.x + state.palaAncho + state.pelota.radio + 1;
  }

  // Right paddle collision (mejorado)
  if (
    ballRight >= state.palas.jugador2.x &&
    ballLeft <= state.palas.jugador2.x + state.palaAncho &&
    ballBottom >= state.palas.jugador2.y &&
    ballTop <= state.palas.jugador2.y + state.palaAlto &&
    state.pelota.vx > 0
  ) {
    const angle = calcBounce(state.pelota.y, state.palas.jugador2.y, state.palaAlto);
    const speed = Math.min(Math.sqrt(state.pelota.vx ** 2 + state.pelota.vy ** 2) * 1.07, 14);
    state.pelota.vx = -Math.abs(Math.cos(angle) * speed);
    state.pelota.vy = -Math.sin(angle) * speed;
    state.pelota.x = state.palas.jugador2.x - state.pelota.radio - 1;
  }

  // Score points
  if (state.pelota.x < 0) {
    state.puntuacion.jugador2++;
    resetBall(state, 1);
  } else if (state.pelota.x > 800) {
    state.puntuacion.jugador1++;
    resetBall(state, -1);
  }
}

function resetBall(state: any, direction = 1): void {
  state.pelota.x = 400;
  state.pelota.y = 300;
  const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 a 30 grados
  const speed = 5;
  state.pelota.vx = Math.cos(angle) * speed * direction;
  state.pelota.vy = Math.sin(angle) * speed;
}

function endGame(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  game.status = 'finished';

  const winnerPlayer = game.gameState.puntuacion.jugador1 > game.gameState.puntuacion.jugador2 ? 1 : 2;
  const winnerName = game.players.find((p: any) => p.numero === winnerPlayer)?.nombre || `Jugador ${winnerPlayer}`;

  broadcastToGame(gameId, {
    type: 'gameEnded',
    data: {
      winner: winnerName,
      score: {
        left: game.gameState.puntuacion.jugador1,
        right: game.gameState.puntuacion.jugador2
      },
      message: `¡Fin de la partida! ${winnerName} gana!`
    }
  });

  // Clean up: remove game, timeout, and mappings
  activeGames.delete(gameId);
  if (orphanedGameTimeouts.has(gameId)) {
    clearTimeout(orphanedGameTimeouts.get(gameId));
    orphanedGameTimeouts.delete(gameId);
  }
  // Remove all player mappings for this game
  if (game.players) {
    for (const player of game.players) {
      playerToClient.delete(player.id);
      clientToPlayer.delete(player.id);
      connections.delete(player.id);
    }
  }
  spectators.delete(gameId);
  fastify.log.info(`🧹 Game ${gameId} cleaned up after finish.`);
}

function handleGameMessage(clientId: string, gameId: string, data: any): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  console.log(`[handleGameMessage] from clientId=${clientId}, gameId=${gameId}, data=`, data);
  
  switch (data.type) {
    case 'playerMove':
      console.log(`[handleGameMessage] playerMove from clientId=${clientId}, direction=`, data.data?.direction);
      handlePlayerMove(clientId, gameId, data.data);
      break;
    case 'ready':
      // Handle ready state if needed
      break;
  }
}

function handlePlayerMove(clientId: string, gameId: string, data: any): void {
  const game = activeGames.get(gameId);
  if (!game || game.status !== 'playing') {
    console.log(`[handlePlayerMove] Game not found or not playing for clientId=${clientId}, gameId=${gameId}`);
    return;
  }

  const player = game.players.find((p: any) => p.id === clientId);
  if (!player) {
    console.log(`[handlePlayerMove] No player found for clientId=${clientId} in gameId=${gameId}`);
    return;
  }

  const paddle = player.numero === 1 ? game.gameState.palas.jugador1 : game.gameState.palas.jugador2;
  const speed = 8;
  console.log(`[handlePlayerMove] Moving paddle for player ${player.numero} (${player.nombre}), direction=${data.direction}, originalY=${paddle.y}`);

  if (data.direction === 'up' && paddle.y > 0) {
    paddle.y = Math.max(0, paddle.y - speed);
    console.log(`[handlePlayerMove] Paddle moved up. New y=${paddle.y}`);
  } else if (data.direction === 'down' && paddle.y < 600 - game.gameState.palaAlto) {
    paddle.y = Math.min(600 - game.gameState.palaAlto, paddle.y + speed);
    console.log(`[handlePlayerMove] Paddle moved down. New y=${paddle.y}`);
  } else {
    console.log(`[handlePlayerMove] No movement. direction=${data.direction}, y=${paddle.y}`);
  }
}

function handleClientDisconnect(clientId: string, gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  // Remove player from game
  game.players = game.players.filter((p: any) => p.id !== clientId);
  
  // Clean up mappings
  playerToClient.delete(clientId);
  clientToPlayer.delete(clientId);
  
  // If no players left, remove game
  if (game.players.length === 0) {
    activeGames.delete(gameId);
  } else {
    // Notify remaining players
    broadcastToGame(gameId, {
      type: 'playerLeft',
      data: {
        message: 'Un jugador se ha desconectado'
      }
    });
  }
  
  connections.delete(clientId);
}

// API Routes for game management
fastify.get("/api/games", async (request, reply) => {
  try {
    const games = Array.from(activeGames.values()).map(game => ({
      id: game.id,
      nombre: `Partida ${game.id.substring(0, 8)}`,
      jugadores: game.players.map((p: any) => ({ nombre: p.nombre, numero: p.numero })),
      jugadoresConectados: game.players.length,
      capacidadMaxima: 2,
      estado: game.status,
      enJuego: game.status === 'playing',
      gameMode: 'pvp',
      puntuacion: game.gameState ? {
        jugador1: game.gameState.puntuacion.jugador1,
        jugador2: game.gameState.puntuacion.jugador2
      } : { jugador1: 0, jugador2: 0 },
      tipoJuego: 'pong',
      espectadores: 0,
      puedeUnirse: game.players.length < 2 && game.status === 'waiting',
      puedeObservar: game.status === 'playing',
      createdAt: game.createdAt
    }));
    
    return reply.send({ success: true, games });
  } catch (error) {
    fastify.log.error("Error getting API games:", error);
    reply.status(500).send({ success: false, error: "Failed to get games list" });
  }
});

fastify.post("/api/games", async (request: any, reply) => {
  try {
    const { nombre, gameMode = "pvp", maxPlayers = 2, playerName } = request.body;
    const finalPlayerName = playerName || "Jugador1";
    const gameId = uuidv4();
    const now = Date.now();
    const game = {
      id: gameId,
      players: [],
      status: 'waiting',
      gameState: {
        palas: {
          jugador1: { x: 30, y: 250 },
          jugador2: { x: 755, y: 250 }
        },
        pelota: { x: 400, y: 300, vx: 4, vy: 2, radio: 8 },
        puntuacion: { jugador1: 0, jugador2: 0 },
        palaAncho: 15,
        palaAlto: 100
      },
      createdAt: now
    };
    // Store in memory for fast gameplay
    activeGames.set(gameId, game);
    // Set a timeout to clean up orphaned games if no player connects via WebSocket
    const timeout = setTimeout(() => {
      const g = activeGames.get(gameId);
      if (g && (!g.players || g.players.length === 0)) {
        activeGames.delete(gameId);
        orphanedGameTimeouts.delete(gameId);
        fastify.log.info(`🗑️ Orphaned game ${gameId} deleted after timeout (no player joined via WebSocket)`);
      }
    }, 30000); // 30 seconds
    orphanedGameTimeouts.set(gameId, timeout);

    // Push to Redis for DB persistence (async, fire-and-forget)
    try {
      await redis.rPush('sqlite_write_queue', JSON.stringify({
        sql: 'INSERT INTO games (id, nombre, status, created_at, game_mode, max_players) VALUES (?, ?, ?, ?, ?, ?)',
        params: [gameId, nombre || `Partida de ${finalPlayerName}`, 'waiting', new Date(now).toISOString(), gameMode, maxPlayers]
      }));
    } catch (err) {
      fastify.log.error('Error pushing game creation to Redis queue:', err);
      // Do not fail the request, just log
    }

    const formattedGame = {
      id: gameId,
      nombre: nombre || `Partida de ${finalPlayerName}`,
      jugadores: [],
      jugadoresConectados: 0,
      capacidadMaxima: maxPlayers,
      estado: 'waiting',
      enJuego: false,
      gameMode: gameMode,
      puntuacion: { jugador1: 0, jugador2: 0 },
      tipoJuego: "pong",
      espectadores: 0,
      puedeUnirse: true,
      puedeObservar: false,
      createdAt: now
    };
    return reply.send(formattedGame);
  } catch (error) {
    fastify.log.error("Error creating API game:", error);
    reply.status(500).send({ success: false, error: "Failed to create game" });
  }
});

fastify.get("/api/games/:gameId", async (request: any, reply) => {
  try {
    const { gameId } = request.params;
    const game = activeGames.get(gameId);
    
    if (!game) {
      return reply.status(404).send({ success: false, error: "Game not found" });
    }
    
    const formattedGame = {
      id: game.id,
      nombre: `Partida ${game.id.substring(0, 8)}`,
      jugadores: game.players.map((p: any) => ({ nombre: p.nombre, numero: p.numero })),
      jugadoresConectados: game.players.length,
      capacidadMaxima: 2,
      estado: game.status,
      enJuego: game.status === 'playing',
      gameMode: 'pvp',
      puntuacion: {
        jugador1: game.gameState.puntuacion.jugador1,
        jugador2: game.gameState.puntuacion.jugador2
      },
      tipoJuego: "pong",
      espectadores: 0,
      puedeUnirse: game.players.length < 2 && game.status === 'waiting',
      puedeObservar: game.status === 'playing',
      createdAt: game.createdAt
    };
    
    return reply.send(formattedGame);
  } catch (error) {
    fastify.log.error("Error getting API game:", error);
    reply.status(500).send({ success: false, error: "Failed to get game" });
  }
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'game-service',
    timestamp: new Date().toISOString(),
    games: {
      total: activeGames.size,
      active: Array.from(activeGames.values()).filter(g => g.status === 'playing').length,
      waiting: Array.from(activeGames.values()).filter(g => g.status === 'waiting').length
    },
    connections: {
      total: connections.size,
      players: clientToPlayer.size,
      spectators: Array.from(spectators.values()).reduce((sum, set) => sum + set.size, 0)
    }
  };
});

// Game statistics endpoint
fastify.get('/stats', async (request, reply) => {
  return {
    totalGames: activeGames.size,
    activeGames: Array.from(activeGames.values()).filter(g => g.status === 'playing').length,
    waitingGames: Array.from(activeGames.values()).filter(g => g.status === 'waiting').length,
    connectedClients: connections.size,
    activePlayers: clientToPlayer.size,
    totalSpectators: Array.from(spectators.values()).reduce((sum, set) => sum + set.size, 0),
    spectatedGames: spectators.size
  };
});

// Graceful shutdown
process.on('SIGTERM', () => {
  fastify.log.info('🛑 Received SIGTERM, shutting down gracefully...');
  fastify.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  fastify.log.info('🛑 Received SIGINT, shutting down gracefully...');
  fastify.close(() => {
    process.exit(0);
  });
});

// Start the server
const start = async () => {
  try {
    const port = process.env.PORT || 8000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port: Number(port), host });
    fastify.log.info(`🎮 Game Service running on ${host}:${port}`);
    fastify.log.info(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`);
    fastify.log.info(`🎯 Game WebSocket: ws://${host}:${port}/pong/{gameId}`);
    fastify.log.info(`❤️ Health check: http://${host}:${port}/health`);
    fastify.log.info(`📊 Stats endpoint: http://${host}:${port}/stats`);
  } catch (err) {
    fastify.log.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

start();
