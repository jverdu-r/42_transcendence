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
      const clientId = playerToClient.get(player.id);
      if (clientId) {
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

    // Add player to game
    const playerNumber = game.players.length + 1;
    if (playerNumber <= 2) {
      const player = {
        id: clientId,
        nombre: username,
        numero: playerNumber,
        isConnected: true
      };
      
      game.players.push(player);
      playerToClient.set(clientId, clientId);
      clientToPlayer.set(clientId, clientId);
      
      // Send welcome message
      sendToClient(clientId, {
        tipo: 'bienvenida',
        numero: playerNumber,
        jugadores: game.players,
        gameId: gameId
      });
      
      // Notify all players about player update
      broadcastToGame(gameId, {
        tipo: 'jugadores_actualizados',
        jugadores: game.players
      });
      
      // If we have 2 players, start countdown
      if (game.players.length === 2) {
        game.status = 'starting';
        startCountdown(gameId);
      }
    } else {
      sendToClient(clientId, {
        tipo: 'error',
        mensaje: 'La partida está llena'
      });
      connection.socket.close();
      return;
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
  if (!game) return;
  
  let countdown = 3;
  
  const countdownInterval = setInterval(() => {
    broadcastToGame(gameId, {
      tipo: 'cuenta_atras',
      valor: countdown
    });
    
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      startGame(gameId);
    }
  }, 1000);
}

function startGame(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  game.status = 'playing';
  
  broadcastToGame(gameId, {
    tipo: 'juego_iniciado',
    gameId: gameId
  });
  
  // Start game loop
  startGameLoop(gameId);
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
      tipo: 'estado',
      juego: currentGame.gameState
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
  
  const winner = game.gameState.puntuacion.jugador1 > game.gameState.puntuacion.jugador2 ? 1 : 2;
  
  broadcastToGame(gameId, {
    tipo: 'juego_finalizado',
    ganador: winner,
    juego: game.gameState,
    mensaje: `¡Fin de la partida! Jugador ${winner} gana!`
  });
}

function handleGameMessage(clientId: string, gameId: string, data: any): void {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  switch (data.tipo) {
    case 'mover':
      handlePlayerMove(clientId, gameId, data);
      break;
    case 'listo':
      // Handle ready state if needed
      break;
  }
}

function handlePlayerMove(clientId: string, gameId: string, data: any): void {
  const game = activeGames.get(gameId);
  if (!game || game.status !== 'playing') return;
  
  const player = game.players.find((p: any) => p.id === clientId);
  if (!player) return;
  
  const paddle = player.numero === 1 ? game.gameState.palas.jugador1 : game.gameState.palas.jugador2;
  
  if (data.direccion === 'up' || data.y < 0) {
    paddle.y = Math.max(0, paddle.y - 8);
  } else if (data.direccion === 'down' || data.y > 0) {
    paddle.y = Math.min(400 - game.gameState.palaAlto, paddle.y + 8);
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
      tipo: 'jugador_desconectado',
      mensaje: 'Un jugador se ha desconectado'
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
    
    reply.send({ success: true, games });
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
    
    reply.send(formattedGame);
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
    
    reply.send(formattedGame);
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
