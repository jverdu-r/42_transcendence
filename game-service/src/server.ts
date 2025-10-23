import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import redis from './redis-client.js';
import { notifyGameFinished } from './services/game-api-client.js';

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

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
const disconnectionTimeouts = new Map(); // Para manejar reconexiones

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
  fastify.get('/pong/:gameId', { websocket: true }, async (connection, request: any) => {
    const gameId = request.params.gameId;
    const clientId = uuidv4();
    
    // Obtener user_id desde la autorización (token JWT o parámetro)
    let userId: string | null = null;
    let username = 'Usuario';
    
    // Intentar obtener del token JWT
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (token) {
      try {
        // Verificar token con auth-service
        const response = await fetch('http://auth-service:3000/api/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          userId = userData.user_id.toString();
          username = userData.username;
        }
      } catch (error) {
        fastify.log.warn('Error verifying token:', error);
      }
    }
    
    // Fallback a parámetro URL si no hay token válido
    if (!userId) {
      const urlParams = new URL(request.url, 'http://localhost').searchParams;
      username = urlParams.get('username') || 'Usuario';
      userId = urlParams.get('user_id') || null;
    }
    
    connections.set(clientId, connection.socket);
    
    fastify.log.info(`🔗 Client ${username} (ID: ${userId}) connected to game ${gameId}: ${clientId}`);
    
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
          palaAlto: 100,
          rallieCount: 0
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
      
      // Cancel disconnection timeout if exists
      const oldClientId = game.players.find((p: any) => p.nombre === username && !p.isConnected)?.id;
      if (oldClientId) {
        const timeoutKey = `${gameId}-${oldClientId}`;
        if (disconnectionTimeouts.has(timeoutKey)) {
          clearTimeout(disconnectionTimeouts.get(timeoutKey));
          disconnectionTimeouts.delete(timeoutKey);
          fastify.log.info(`✅ Cancelled disconnection timeout for ${username}`);
        }
      }
      
      // Send welcome back message
      const otherPlayer = game.players.find((p: any) => p.numero !== playerNumber);
      sendToClient(clientId, {
        type: 'gameJoined',
        gameId: gameId,
        playerNumber: playerNumber,
        playersConnected: game.players.length,
        playerName: username,
        reconnected: true,
        gameStatus: game.status, // Send current game status
        gameStarted: game.status === 'playing' || game.status === 'countdown', // If game already started
        opponentName: otherPlayer?.nombre || null // Send opponent name for reconnection
      });
      
      // Notify all players about reconnection
      broadcastToGame(gameId, {
        type: 'playerReconnected',
        playerName: username,
        playerNumber: playerNumber,
        playersConnected: game.players.length
      });
      
      // If game was paused due to disconnect, resume it
      if (game.status === 'paused') {
        game.status = 'countdown';
        setTimeout(() => startCountdown(gameId), 500);
      }
      
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
    
    // Broadcast game state con nombres de ambos jugadores y colores de palas
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
              height: currentGame.gameState.palaAlto,
              color: '#00ff00' // Verde para jugador 1
            },
            right: {
              x: currentGame.gameState.palas.jugador2.x,
              y: currentGame.gameState.palas.jugador2.y,
              width: currentGame.gameState.palaAncho,
              height: currentGame.gameState.palaAlto,
              color: '#ff0000' // Rojo para jugador 2
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
          rallieCount: currentGame.gameState.rallieCount || 0
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

  // Ball collision with top/bottom walls (física realista como frontend)
  if (state.pelota.y <= state.pelota.radio) {
    state.pelota.y = state.pelota.radio;
    state.pelota.vy = Math.abs(state.pelota.vy); // Asegurar rebote hacia abajo
  } else if (state.pelota.y >= 600 - state.pelota.radio) {
    state.pelota.y = 600 - state.pelota.radio;
    state.pelota.vy = -Math.abs(state.pelota.vy); // Asegurar rebote hacia arriba
  }

  // Advanced paddle collision detection (como frontend)
  const leftPaddle = state.palas.jugador1;
  const rightPaddle = state.palas.jugador2;
  
  // Left paddle collision (mejorado como frontend)
  if (state.pelota.vx < 0 && // Solo si se mueve hacia la izquierda
      state.pelota.x - state.pelota.radio <= leftPaddle.x + state.palaAncho &&
      state.pelota.x - state.pelota.radio >= leftPaddle.x &&
      state.pelota.y >= leftPaddle.y - state.pelota.radio &&
      state.pelota.y <= leftPaddle.y + state.palaAlto + state.pelota.radio) {
    
    handlePaddleCollision(state, leftPaddle, 'left');
  }
  
  // Right paddle collision (mejorado como frontend)
  if (state.pelota.vx > 0 && // Solo si se mueve hacia la derecha
      state.pelota.x + state.pelota.radio >= rightPaddle.x &&
      state.pelota.x + state.pelota.radio <= rightPaddle.x + state.palaAncho &&
      state.pelota.y >= rightPaddle.y - state.pelota.radio &&
      state.pelota.y <= rightPaddle.y + state.palaAlto + state.pelota.radio) {
    
    handlePaddleCollision(state, rightPaddle, 'right');
  }

  // Score points
  if (state.pelota.x < 0) {
    state.puntuacion.jugador2++;
    resetBall(state);
    state.rallieCount = 0;
  } else if (state.pelota.x > 800) {
    state.puntuacion.jugador1++;
    resetBall(state);
    state.rallieCount = 0;
  }
}

// Nueva función para manejo de colisiones realistas (como frontend)
function handlePaddleCollision(state: any, paddle: any, side: 'left' | 'right'): void {
  // Calcular el punto de contacto relativo en la pala (0 = arriba, 1 = abajo)
  const contactPoint = (state.pelota.y - paddle.y) / state.palaAlto;
  const normalizedContact = Math.max(0, Math.min(1, contactPoint)); // Clamp entre 0 y 1
  
  // Calcular el ángulo de rebote basado en el punto de contacto
  // En el centro (0.5) = ángulo 0, en los extremos = ángulo máximo
  const maxAngle = Math.PI / 3; // 60 grados máximo
  const angle = (normalizedContact - 0.5) * maxAngle;
  
  // Calcular la velocidad actual de la pelota
  const currentSpeed = Math.sqrt(state.pelota.vx * state.pelota.vx + 
                               state.pelota.vy * state.pelota.vy);
  
  // Incrementar ligeramente la velocidad con cada rebote (como en el frontend)
  const speedIncrease = 1.05;
  const newSpeed = Math.min(currentSpeed * speedIncrease, 12); // Límite máximo de velocidad
  
  // Calcular nuevas velocidades basadas en el ángulo
  if (side === 'left') {
    state.pelota.vx = newSpeed * Math.cos(angle);
    state.pelota.vy = newSpeed * Math.sin(angle);
    // Asegurar que la pelota se mueva hacia la derecha
    state.pelota.vx = Math.abs(state.pelota.vx);
    // Posicionar la pelota justo fuera de la pala para evitar colisiones múltiples
    state.pelota.x = paddle.x + state.palaAncho + state.pelota.radio;
  } else {
    state.pelota.vx = -newSpeed * Math.cos(angle);
    state.pelota.vy = newSpeed * Math.sin(angle);
    // Asegurar que la pelota se mueva hacia la izquierda
    state.pelota.vx = -Math.abs(state.pelota.vx);
    // Posicionar la pelota justo fuera de la pala para evitar colisiones múltiples
    state.pelota.x = paddle.x - state.pelota.radio;
  }
  
  // Incrementar contador de rallies
  state.rallieCount = (state.rallieCount || 0) + 1;
}

function resetBall(state: any): void {
  state.pelota.x = 400; // Centro horizontal
  state.pelota.y = 300; // Centro vertical
  // Velocidad aleatoria como en el frontend
  state.pelota.vx = Math.random() > 0.5 ? 5 : -5;
  state.pelota.vy = (Math.random() - 0.5) * 6;
}

// Function to get user ID from username
async function getUserId(username: string): Promise<number | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/games/user-id?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.userId || null;
  } catch (error) {
    fastify.log.error(`Error getting user ID for ${username}:`, error);
    return null;
  }
}

// Function to save game statistics to database
async function saveGameStats(gameId: string, game: any, winnerPlayer: number, winnerName: string, loserName: string): Promise<void> {
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';
  const player1 = game.players?.find((p: any) => p.numero === 1);
  const player2 = game.players?.find((p: any) => p.numero === 2);

  // Obtener userId real usando la función getUserId si no existe
  let player1Id = player1?.userId || null;
  let player2Id = player2?.userId || null;
  if (!player1Id && player1?.nombre) {
    player1Id = await getUserId(player1.nombre);
  }
  if (!player2Id && player2?.nombre) {
    player2Id = await getUserId(player2.nombre);
  }

  let score1 = game.gameState?.puntuacion?.jugador1 ?? 0;
  let score2 = game.gameState?.puntuacion?.jugador2 ?? 0;
  
  // CORRECCIÓN PARA TORNEOS: Reordenar scores según el orden de la BD
  // En torneos, el db-service espera score1=participants[0] y score2=participants[1]
  // pero en WebSocket, jugador1=quien se conectó primero, jugador2=quien se conectó segundo
  if (game.tournamentInfo) {
    const p1Name = player1?.nombre;
    const p2Name = player2?.nombre;
    const dbPlayer1Name = game.tournamentInfo.player1_name;
    const dbPlayer2Name = game.tournamentInfo.player2_name;
    
    // Verificar si el orden de jugadores en WebSocket es inverso al orden en BD
    if (p1Name === dbPlayer2Name && p2Name === dbPlayer1Name) {
      // Los jugadores están invertidos → intercambiar scores
      fastify.log.info(`🔄 TORNEO ${gameId}: Invirtiendo scores (WebSocket: [${p1Name}=${score1}, ${p2Name}=${score2}] → BD: [${dbPlayer1Name}=${score2}, ${dbPlayer2Name}=${score1}])`);
      [score1, score2] = [score2, score1];  // Swap scores
    } else {
      fastify.log.info(`✅ TORNEO ${gameId}: Scores en orden correcto (WebSocket: [${p1Name}=${score1}, ${p2Name}=${score2}] → BD: [${dbPlayer1Name}=${score1}, ${dbPlayer2Name}=${score2}])`);
    }
  }
  
  const start_time = game.startedAt || new Date().toISOString();
  const end_time = new Date().toISOString();
  const winner_player = winnerPlayer; // 1 or 2
  const winnerTeam = winnerPlayer === 1 ? 'Team A' : 'Team B';

  try {
    if (gameId) {
      await fetch(`${AUTH_SERVICE_URL}/api/games/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          winnerTeam
        })
      });

      await fetch(`${AUTH_SERVICE_URL}/api/games/create-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1_id: player1Id,
          player2_id: player2Id,
          winner_player,
          score1,
          score2,
          start_time,
          end_time,
          gameId,
          tournament_id: game.tournamentId ?? null
        })
      });
    } else {
      await fetch(`${AUTH_SERVICE_URL}/api/games/create-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1_id: player1Id,
          player2_id: player2Id,
          winner_player,
          score1,
          score2,
          start_time,
          end_time
        })
      });
    }
  } catch (err) {
    console.error('Error reporting game stats to auth-service:', err);
  }
}

function endGame(gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  game.status = 'finished';

  const winnerPlayer = game.gameState.puntuacion.jugador1 > game.gameState.puntuacion.jugador2 ? 1 : 2;
  const winnerName = game.players.find((p: any) => p.numero === winnerPlayer)?.nombre || `Jugador ${winnerPlayer}`;
  const loserName = game.players.find((p: any) => p.numero !== winnerPlayer)?.nombre || `Jugador ${winnerPlayer === 1 ? 2 : 1}`;

  // Save game statistics to database via db-service
  saveGameStats(gameId, game, winnerPlayer, winnerName, loserName).catch(err => {
    fastify.log.error(`Error saving game stats for ${gameId}:`, err);
  });

  broadcastToGame(gameId, {
    type: 'gameEnded',
    data: {
      winner: winnerName,
      loser: loserName,
      score: {
        left: game.gameState.puntuacion.jugador1,
        right: game.gameState.puntuacion.jugador2,
        winner: winnerPlayer === 1 ? game.gameState.puntuacion.jugador1 : game.gameState.puntuacion.jugador2,
        loser: winnerPlayer === 1 ? game.gameState.puntuacion.jugador2 : game.gameState.puntuacion.jugador1
      },
      message: `¡Fin de la partida!`,
      showReturnButton: true,
      finalStats: {
        winnerName,
        loserName,
        finalScore: `${winnerName}: ${winnerPlayer === 1 ? game.gameState.puntuacion.jugador1 : game.gameState.puntuacion.jugador2} - ${loserName}: ${winnerPlayer === 1 ? game.gameState.puntuacion.jugador2 : game.gameState.puntuacion.jugador1}`,
        gameDuration: Date.now() - game.createdAt
      }
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
  const speed = 12; // Aumentado para mejor responsividad
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
  if (!game) {
    connections.delete(clientId);
    return;
  }
  
  fastify.log.info(`🔌 Client ${clientId} disconnected from game ${gameId}`);
  
  // Find the disconnected player
  const disconnectedPlayer = game.players.find((p: any) => p.id === clientId);
  
  if (!disconnectedPlayer) {
    connections.delete(clientId);
    return;
  }
  
  // Mark player as temporarily disconnected
  disconnectedPlayer.isConnected = false;
  disconnectedPlayer.disconnectedAt = Date.now();
  
  // If the game was in progress (playing or countdown), give time to reconnect
  if ((game.status === 'playing' || game.status === 'countdown') && game.players.length === 2) {
    const remainingPlayer = game.players.find((p: any) => p.id !== clientId);
    
    if (remainingPlayer) {
      fastify.log.info(`⏳ Waiting 5 seconds for ${disconnectedPlayer.nombre} to reconnect...`);
      
      // Notify remaining player that opponent disconnected
      sendToClient(remainingPlayer.id, {
        type: 'playerDisconnected',
        data: {
          playerName: disconnectedPlayer.nombre,
          message: `${disconnectedPlayer.nombre} se ha desconectado. Esperando reconexión...`,
          waitingForReconnection: true
        }
      });
      
      // Set a timeout to award victory if not reconnected
      const timeoutKey = `${gameId}-${clientId}`;
      const timeout = setTimeout(() => {
        // Check if player reconnected in the meantime
        const currentGame = activeGames.get(gameId);
        const currentPlayer = currentGame?.players.find((p: any) => p.nombre === disconnectedPlayer.nombre);
        
        if (currentPlayer && !currentPlayer.isConnected) {
          // Player did not reconnect - award victory
          fastify.log.info(`🏆 Awarding victory to ${remainingPlayer.nombre} - ${disconnectedPlayer.nombre} did not reconnect`);
          
          // Set final scores - winner gets max score
          if (remainingPlayer.numero === 1) {
            currentGame.gameState.puntuacion.jugador1 = 5;
            currentGame.gameState.puntuacion.jugador2 = currentGame.gameState.puntuacion.jugador2 || 0;
          } else {
            currentGame.gameState.puntuacion.jugador2 = 5;
            currentGame.gameState.puntuacion.jugador1 = currentGame.gameState.puntuacion.jugador1 || 0;
          }
          
          currentGame.status = 'finished';
          
          // Save game stats
          saveGameStats(
            gameId, 
            currentGame, 
            remainingPlayer.numero, 
            remainingPlayer.nombre, 
            disconnectedPlayer.nombre
          ).catch(err => {
            fastify.log.error(`Error saving game stats after disconnect:`, err);
          });
          
          // Notify the remaining player of victory
          sendToClient(remainingPlayer.id, {
            type: 'gameEnded',
            data: {
              winner: remainingPlayer.nombre,
              loser: disconnectedPlayer.nombre,
              reason: 'opponent_disconnected',
              score: {
                left: currentGame.gameState.puntuacion.jugador1,
                right: currentGame.gameState.puntuacion.jugador2,
                winner: remainingPlayer.numero === 1 ? currentGame.gameState.puntuacion.jugador1 : currentGame.gameState.puntuacion.jugador2,
                loser: remainingPlayer.numero === 1 ? currentGame.gameState.puntuacion.jugador2 : currentGame.gameState.puntuacion.jugador1
              },
              message: `¡Victoria! ${disconnectedPlayer.nombre} ha abandonado la partida`,
              showReturnButton: true,
              finalStats: {
                winnerName: remainingPlayer.nombre,
                loserName: disconnectedPlayer.nombre,
                finalScore: `${remainingPlayer.nombre}: 5 (Victoria por abandono)`,
                gameDuration: Date.now() - currentGame.createdAt,
                disconnection: true
              }
            }
          });
          
          // Clean up game after a delay to ensure message is received
          setTimeout(() => {
            activeGames.delete(gameId);
            if (orphanedGameTimeouts.has(gameId)) {
              clearTimeout(orphanedGameTimeouts.get(gameId));
              orphanedGameTimeouts.delete(gameId);
            }
            // Remove all player mappings for this game
            if (currentGame.players) {
              for (const player of currentGame.players) {
                playerToClient.delete(player.id);
                clientToPlayer.delete(player.id);
                connections.delete(player.id);
              }
            }
            spectators.delete(gameId);
            fastify.log.info(`🧹 Game ${gameId} cleaned up after disconnect`);
          }, 1000);
        }
        
        disconnectionTimeouts.delete(timeoutKey);
      }, 5000); // 5 seconds to reconnect
      
      disconnectionTimeouts.set(timeoutKey, timeout);
      
      connections.delete(clientId);
      return;
    }
  }
  
  // If game wasn't in progress or only one player, just remove player
  game.players = game.players.filter((p: any) => p.id !== clientId);
  
  // Clean up mappings
  playerToClient.delete(clientId);
  clientToPlayer.delete(clientId);
  
  // If no players left, remove game
  if (game.players.length === 0) {
    activeGames.delete(gameId);
    if (orphanedGameTimeouts.has(gameId)) {
      clearTimeout(orphanedGameTimeouts.get(gameId));
      orphanedGameTimeouts.delete(gameId);
    }
    fastify.log.info(`🗑️ Game ${gameId} removed - no players left`);
  } else {
    // Notify remaining players that someone left (but game wasn't in progress)
    broadcastToGame(gameId, {
      type: 'playerLeft',
      data: {
        message: 'Un jugador se ha desconectado',
        playerName: disconnectedPlayer?.nombre || 'Unknown'
      }
    });
  }
  
  connections.delete(clientId);
}

// API Routes for game management
fastify.get("/api/games", async (request, reply) => {
  try {
    // Filter out tournament games - only show non-tournament games in online mode
    const games = Array.from(activeGames.values())
      .filter(game => !game.tournamentId)  // Exclude games associated with tournaments
      .map(game => ({
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
    const { 
      nombre, 
      gameMode = "pvp", 
      maxPlayers = 2, 
      playerName, 
      customGameId,
      tournamentId,
      player1_id,
      player2_id,
      player1_name,
      player2_name
    } = request.body;
    const finalPlayerName = playerName || "Jugador1";
    const gameId = customGameId || uuidv4(); // Use custom ID if provided (for challenges)
    const now = Date.now();
    const game = {
      id: gameId,
      players: [],
      status: 'waiting',
      tournamentId: tournamentId || null,  // Track tournament association
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
      createdAt: now,
      // Guardar información del torneo para mantener el orden de jugadores
      tournamentInfo: tournamentId ? {
        tournamentId,
        player1_id,
        player2_id,
        player1_name,
        player2_name
      } : null
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
