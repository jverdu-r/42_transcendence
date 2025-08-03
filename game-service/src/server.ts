import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Simple in-memory game management
const activeGames = new Map();
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
            jugador1: { x: 20, y: 160 },
            jugador2: { x: 560, y: 160 }
          },
          pelota: { x: 300, y: 200, vx: 3, vy: 2, radio: 8 },
          puntuacion: { jugador1: 0, jugador2: 0 },
          palaAncho: 10,
          palaAlto: 80
        },
        createdAt: Date.now()
      };
      activeGames.set(gameId, game);
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
    
    // Broadcast game state
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
  
  // Ball collision with top/bottom walls
  if (state.pelota.y <= state.pelota.radio || state.pelota.y >= 400 - state.pelota.radio) {
    state.pelota.vy = -state.pelota.vy;
  }
  
  // Ball collision with paddles
  const ballLeft = state.pelota.x - state.pelota.radio;
  const ballRight = state.pelota.x + state.pelota.radio;
  const ballTop = state.pelota.y - state.pelota.radio;
  const ballBottom = state.pelota.y + state.pelota.radio;
  
  // Left paddle collision
  if (ballLeft <= state.palas.jugador1.x + state.palaAncho &&
      ballRight >= state.palas.jugador1.x &&
      ballBottom >= state.palas.jugador1.y &&
      ballTop <= state.palas.jugador1.y + state.palaAlto) {
    state.pelota.vx = Math.abs(state.pelota.vx);
  }
  
  // Right paddle collision
  if (ballRight >= state.palas.jugador2.x &&
      ballLeft <= state.palas.jugador2.x + state.palaAncho &&
      ballBottom >= state.palas.jugador2.y &&
      ballTop <= state.palas.jugador2.y + state.palaAlto) {
    state.pelota.vx = -Math.abs(state.pelota.vx);
  }
  
  // Score points
  if (state.pelota.x < 0) {
    state.puntuacion.jugador2++;
    resetBall(state);
  } else if (state.pelota.x > 600) {
    state.puntuacion.jugador1++;
    resetBall(state);
  }
}

function resetBall(state: any): void {
  state.pelota.x = 300;
  state.pelota.y = 200;
  state.pelota.vx = Math.random() > 0.5 ? 3 : -3;
  state.pelota.vy = Math.random() * 4 - 2;
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
    const game = {
      id: gameId,
      players: [],
      status: 'waiting',
      gameState: {
        palas: {
          jugador1: { x: 20, y: 160 },
          jugador2: { x: 560, y: 160 }
        },
        pelota: { x: 300, y: 200, vx: 3, vy: 2, radio: 8 },
        puntuacion: { jugador1: 0, jugador2: 0 },
        palaAncho: 10,
        palaAlto: 80
      },
      createdAt: Date.now()
    };
    
    activeGames.set(gameId, game);
    
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
      createdAt: game.createdAt
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
