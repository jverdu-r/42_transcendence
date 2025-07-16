import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

const fastify = Fastify({
  logger: true
});

// Registrar el plugin de WebSocket
fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1048576,
    verifyClient: (info) => {
      console.log('WebSocket client attempting to connect:', info.origin);
      return true;
    }
  }
});

// Configurar CORS
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
});

// Interfaces para manejar conexiones
interface ClientConnection {
  id: string;
  ws: WebSocket;
  gameId?: string;
  playerNumber?: 1 | 2;
  isAI?: boolean;
}

interface GameConnections {
  [gameId: string]: {
    players: ClientConnection[];
    gameState: GameState;
  };
}

// Almacenar las conexiones de los clientes
const connections: Map<string, ClientConnection> = new Map();
const gameConnections: GameConnections = {};

// Función para enviar mensaje a un cliente específico
function sendToClient(clientId: string, message: any): void {
  const connection = connections.get(clientId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.send(JSON.stringify(message));
  }
}

// Función para enviar mensaje a todos los clientes de un juego
function sendToGameClients(gameId: string, message: any): void {
  const gameConnection = gameConnections[gameId];
  if (gameConnection) {
    gameConnection.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }
}

// Función para generar posición aleatoria de pelota
function randomBallPosition() {
  return {
    x: 400,
    y: 300,
    vx: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2),
    vy: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
    radio: 10
  };
}

// Función para resetear pelota
function resetBall(gameState: GameState) {
  const newBall = randomBallPosition();
  gameState.pelota = newBall;
  gameState.rallyCount = 0;
}

// Función para generar un ID único para el juego
function generateGameId(): string {
  return uuidv4();
}

// Función para crear un nuevo estado de juego
function createGameState(gameId: string, gameMode: 'pvp' | 'pve' | 'multiplayer' = 'pvp'): GameState {
  return new GameState(gameId, gameMode);
}

// Función para obtener o crear un juego
function getOrCreateGame(gameId?: string, gameMode: 'pvp' | 'pve' | 'multiplayer' = 'pvp'): { gameId: string; gameState: GameState } {
  if (gameId && gameConnections[gameId]) {
    return { gameId, gameState: gameConnections[gameId].gameState };
  }
  
  const newGameId = gameId || generateGameId();
  const newGameState = createGameState(newGameId, gameMode);
  gameConnections[newGameId] = {
    players: [],
    gameState: newGameState
  };
  return { gameId: newGameId, gameState: newGameState };
}

// Función para detectar colisiones
function detectCollision(pelota: any, pala: any, gameState: GameState): boolean {
  return (
    pelota.x - pelota.radio < pala.x + gameState.palaAncho &&
    pelota.x + pelota.radio > pala.x &&
    pelota.y - pelota.radio < pala.y + gameState.palaAlto &&
    pelota.y + pelota.radio > pala.y
  );
}

// Función para manejar el rebote en las palas
function handlePaddleCollision(pelota: any, pala: any, gameState: GameState): void {
  // Calcular el punto de impacto relativo en la pala (-1 a 1)
  const impactPoint = (pelota.y - (pala.y + gameState.palaAlto / 2)) / (gameState.palaAlto / 2);
  
  // Cambiar dirección horizontal
  pelota.vx = -pelota.vx;
  
  // Ajustar velocidad vertical basada en el punto de impacto
  const maxAngle = Math.PI / 3; // 60 grados máximo
  const angle = impactPoint * maxAngle;
  
  // Aumentar velocidad ligeramente para hacer el juego más dinámico
  const currentSpeed = Math.sqrt(pelota.vx * pelota.vx + pelota.vy * pelota.vy);
  const newSpeed = Math.min(currentSpeed * 1.05, 8); // Limitar velocidad máxima
  
  pelota.vx = Math.cos(angle) * newSpeed * (pelota.vx > 0 ? 1 : -1);
  pelota.vy = Math.sin(angle) * newSpeed;
  
  // Incrementar contador de rally
  gameState.rallyCount++;
}

// Función para actualizar la física del juego
function updateGamePhysics(gameState: GameState): void {
  if (!gameState.enJuego) return;

  const pelota = gameState.pelota;
  const palas = gameState.palas;

  // Actualizar posición de la pelota
  pelota.x += pelota.vx;
  pelota.y += pelota.vy;

  // Rebote en paredes superior e inferior
  if (pelota.y - pelota.radio <= 0 || pelota.y + pelota.radio >= gameState.alto) {
    pelota.vy = -pelota.vy;
    pelota.y = Math.max(pelota.radio, Math.min(gameState.alto - pelota.radio, pelota.y));
  }

  // Detectar colisiones con las palas
  if (detectCollision(pelota, palas.jugador1, gameState)) {
    handlePaddleCollision(pelota, palas.jugador1, gameState);
    pelota.x = palas.jugador1.x + gameState.palaAncho + pelota.radio; // Evitar que se pegue
  } else if (detectCollision(pelota, palas.jugador2, gameState)) {
    handlePaddleCollision(pelota, palas.jugador2, gameState);
    pelota.x = palas.jugador2.x - pelota.radio; // Evitar que se pegue
  }

  // Detectar puntos (pelota sale por los lados)
  if (pelota.x < 0) {
    gameState.puntuacion.jugador2++;
    resetBall(gameState);
    sendToGameClients(gameState.id, {
      tipo: 'puntuacion',
      puntuacion: gameState.puntuacion
    });
  } else if (pelota.x > gameState.ancho) {
    gameState.puntuacion.jugador1++;
    resetBall(gameState);
    sendToGameClients(gameState.id, {
      tipo: 'puntuacion',
      puntuacion: gameState.puntuacion
    });
  }

  // Enviar estado actualizado a todos los clientes
  sendToGameClients(gameState.id, {
    tipo: 'estado',
    estado: {
      pelota: gameState.pelota,
      palas: gameState.palas,
      puntuacion: gameState.puntuacion,
      rallyCount: gameState.rallyCount
    }
  });
}

// Función para iniciar el bucle del juego
function startGameLoop(gameState: GameState): void {
  if (gameState.intervalId) {
    clearInterval(gameState.intervalId);
  }
  
  gameState.intervalId = setInterval(() => {
    updateGamePhysics(gameState);
  }, 16); // ~60 FPS
}

// Función para detener el bucle del juego
function stopGameLoop(gameState: GameState): void {
  if (gameState.intervalId) {
    clearInterval(gameState.intervalId);
    gameState.intervalId = null;
  }
  if (gameState.countdownIntervalId) {
    clearInterval(gameState.countdownIntervalId);
    gameState.countdownIntervalId = null;
  }
  if (gameState.aiUpdateIntervalId) {
    clearInterval(gameState.aiUpdateIntervalId);
    gameState.aiUpdateIntervalId = null;
  }
}

// Función para iniciar cuenta atrás
function startCountdown(gameState: GameState): void {
  gameState.cuentaAtrasActiva = true;
  gameState.cuentaAtrasValor = 3;
  gameState.enJuego = false;
  
  // Enviar estado inicial de cuenta atrás
  sendToGameClients(gameState.id, {
    tipo: 'cuentaAtras',
    valor: gameState.cuentaAtrasValor
  });
  
  gameState.countdownIntervalId = setInterval(() => {
    gameState.cuentaAtrasValor--;
    
    if (gameState.cuentaAtrasValor > 0) {
      sendToGameClients(gameState.id, {
        tipo: 'cuentaAtras',
        valor: gameState.cuentaAtrasValor
      });
    } else {
      // Terminar cuenta atrás e iniciar juego
      gameState.cuentaAtrasActiva = false;
      gameState.enJuego = true;
      
      sendToGameClients(gameState.id, {
        tipo: 'iniciarJuego'
      });
      
      if (gameState.countdownIntervalId) {
        clearInterval(gameState.countdownIntervalId);
        gameState.countdownIntervalId = null;
      }
      
      // Iniciar bucle del juego
      startGameLoop(gameState);
    }
  }, 1000); // 1 segundo entre cada número
}

// Función para verificar si el juego puede iniciar
function canStartGame(gameState: GameState): boolean {
  return gameState.jugadoresConectados >= 2 && !gameState.enJuego && !gameState.cuentaAtrasActiva;
}

// Función para manejar el movimiento de las palas
function handlePlayerMovement(gameState: GameState, playerNumber: 1 | 2, direction: 'arriba' | 'abajo'): void {
  const pala = playerNumber === 1 ? gameState.palas.jugador1 : gameState.palas.jugador2;
  const velocidad = 8; // Velocidad de movimiento
  
  if (direction === 'arriba') {
    pala.y = Math.max(0, pala.y - velocidad);
  } else if (direction === 'abajo') {
    pala.y = Math.min(gameState.alto - gameState.palaAlto, pala.y + velocidad);
  }
}

// 🤖 Clase para manejar la IA
class AIPlayer {
  private gameState: GameState;
  private playerNumber: 1 | 2;
  private lastUpdateTime: number;
  private predictedBallY: number;
  private reactionTime: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  private lastDecision: number;
  private randomOffset: number;
  private clientId: string;

  constructor(gameState: GameState, playerNumber: 1 | 2, clientId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.gameState = gameState;
    this.playerNumber = playerNumber;
    this.clientId = clientId;
    this.lastUpdateTime = Date.now();
    this.predictedBallY = gameState.alto / 2;
    this.difficulty = difficulty;
    this.lastDecision = 0;
    this.randomOffset = 0;
    
    // Configurar dificultad
    switch(difficulty) {
      case 'easy':
        this.reactionTime = 1000; // 1 segundo
        break;
      case 'medium':
        this.reactionTime = 500; // 0.5 segundos
        break;
      case 'hard':
        this.reactionTime = 200; // 0.2 segundos
        break;
    }
  }

  // Actualizar la IA cada segundo (según los requerimientos)
  update(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime < this.reactionTime) {
      return; // No actualizar hasta que pase el tiempo de reacción
    }
    
    this.lastUpdateTime = currentTime;
    this.lastDecision = currentTime;
    
    // Obtener información del juego
    const pelota = this.gameState.pelota;
    const pala = this.playerNumber === 1 ? this.gameState.palas.jugador1 : this.gameState.palas.jugador2;
    
    // Predecir hacia dónde va la pelota
    this.predictBallPosition();
    
    // Agregar algo de error humano
    this.addHumanError();
    
    // Calcular la decisión de movimiento
    const centroPala = pala.y + this.gameState.palaAlto / 2;
    const targetY = this.predictedBallY + this.randomOffset;
    
    const diff = targetY - centroPala;
    
    // Simular entrada de teclado enviando mensaje de movimiento
    if (Math.abs(diff) > 20) { // Zona muerta para evitar temblores
      const direction = diff > 0 ? 'abajo' : 'arriba';
      this.simulateKeyPress(direction);
    }
  }
  
  private simulateKeyPress(direction: 'arriba' | 'abajo'): void {
    // Simular el envío de un mensaje de movimiento como lo haría un jugador humano
    const message = {
      tipo: 'mover',
      jugador: this.playerNumber,
      direccion: direction
    };
    
    // Procesar el mensaje como si viniera del cliente
    this.processMovementMessage(message);
  }
  
  private processMovementMessage(message: any): void {
    // Procesar el mensaje de movimiento de la IA
    handlePlayerMovement(this.gameState, this.playerNumber, message.direccion);
  }
  
  private predictBallPosition(): void {
    const pelota = this.gameState.pelota;
    const palaX = this.playerNumber === 1 ? this.gameState.palas.jugador1.x : this.gameState.palas.jugador2.x;
    
    // Calcular cuánto tiempo tardará la pelota en llegar a la pala
    const timeToReach = Math.abs(pelota.x - palaX) / Math.abs(pelota.vx);
    
    // Predecir posición Y considerando rebotes en paredes
    let predictedY = pelota.y + (pelota.vy * timeToReach);
    
    // Simular rebotes en paredes superior e inferior
    while (predictedY < 0 || predictedY > this.gameState.alto) {
      if (predictedY < 0) {
        predictedY = Math.abs(predictedY);
      } else if (predictedY > this.gameState.alto) {
        predictedY = this.gameState.alto - (predictedY - this.gameState.alto);
      }
    }
    
    this.predictedBallY = predictedY;
  }
  
  private addHumanError(): void {
    // Agregar error aleatorio basado en la dificultad
    const errorRange = this.difficulty === 'easy' ? 40 : this.difficulty === 'medium' ? 20 : 10;
    this.randomOffset = (Math.random() - 0.5) * errorRange;
  }
}

// 🎮 Estado del juego: ahora es una clase para crear múltiples instancias
class GameState {
  id: string
  nombre: string
  ancho: number
  alto: number
  palaAncho: number
  palaAlto: number
  pelota: { x: number, y: number, vx: number, vy: number, radio: number }
  palas: {
    jugador1: { x: number, y: number },
    jugador2: { x: number, y: number },
  }
  puntuacion: { jugador1: number, jugador2: number }
  rallyCount: number
  enJuego: boolean
  cuentaAtrasActiva: boolean
  cuentaAtrasValor: number
  jugadoresConectados: number
  capacidadMaxima: number
  intervalId: NodeJS.Timeout | null // Para controlar el bucle del juego
  countdownIntervalId: NodeJS.Timeout | null; // Para controlar el bucle de cuenta atrás
  aiUpdateIntervalId: NodeJS.Timeout | null; // Para controlar la actualización de IA
  aiPlayers: Map<number, AIPlayer> // Jugadores IA
  gameMode: 'pvp' | 'pve' | 'multiplayer' // Modo de juego

  constructor(id: string, gameMode: 'pvp' | 'pve' | 'multiplayer' = 'pvp') {
    this.id = id;
    this.nombre = `Juego ${id}`;
    this.ancho = 800;
    this.alto = 600;
    this.palaAncho = 20;
    this.palaAlto = 100;
    this.pelota = randomBallPosition();
    this.palas = {
      jugador1: { x: 50, y: this.alto / 2 - 50 },
      jugador2: { x: this.ancho - 70, y: this.alto / 2 - 50 },
    };
    this.puntuacion = { jugador1: 0, jugador2: 0 };
    this.rallyCount = 0;
    this.enJuego = false;
    this.cuentaAtrasActiva = false;
    this.cuentaAtrasValor = 3;
    this.jugadoresConectados = 0;
    this.capacidadMaxima = 2;
    this.intervalId = null;
    this.countdownIntervalId = null;
    this.aiUpdateIntervalId = null;
    this.aiPlayers = new Map();
    this.gameMode = gameMode;
  }

  // Método para agregar un jugador IA
  addAIPlayer(playerNumber: 1 | 2, clientId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
    const aiPlayer = new AIPlayer(this, playerNumber, clientId, difficulty);
    this.aiPlayers.set(playerNumber, aiPlayer);
    
    // Iniciar el bucle de actualización de IA si no está ya corriendo
    if (!this.aiUpdateIntervalId) {
      this.aiUpdateIntervalId = setInterval(() => {
        this.aiPlayers.forEach(ai => ai.update());
      }, 100); // Actualizar cada 100ms para mayor responsividad
    }
  }

  // Método para remover un jugador IA
  removeAIPlayer(playerNumber: 1 | 2): void {
    this.aiPlayers.delete(playerNumber);
    
    // Si no quedan jugadores IA, detener el bucle
    if (this.aiPlayers.size === 0 && this.aiUpdateIntervalId) {
      clearInterval(this.aiUpdateIntervalId);
      this.aiUpdateIntervalId = null;
    }
  }

  // Método para limpiar todos los intervalos
  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.aiUpdateIntervalId) {
      clearInterval(this.aiUpdateIntervalId);
      this.aiUpdateIntervalId = null;
    }
    this.aiPlayers.clear();
  }
}

// 🌐 Configurar la ruta de WebSocket
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const clientId = uuidv4();
    const clientConnection: ClientConnection = {
      id: clientId,
      ws: connection.socket
    };
    
    connections.set(clientId, clientConnection);
    
    console.log(`Cliente conectado: ${clientId}`);
    
    // Enviar confirmación de conexión
    connection.socket.send(JSON.stringify({
      tipo: 'conexion',
      clientId: clientId,
      mensaje: 'Conectado al servidor de juego'
    }));

    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Mensaje recibido de ${clientId}:`, data);
        
        switch(data.tipo) {
          case 'unirseJuego':
            handleJoinGame(clientConnection, data);
            break;
          case 'crearJuego':
            handleCreateGame(clientConnection, data);
            break;
          case 'mover':
            handleMove(clientConnection, data);
            break;
          case 'iniciarJuego':
            handleStartGame(clientConnection, data);
            break;
          case 'obtenerJuegos':
            handleGetGames(clientConnection);
            break;
          default:
            console.log('Tipo de mensaje desconocido:', data.tipo);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    });

    connection.socket.on('close', () => {
      console.log(`Cliente desconectado: ${clientId}`);
      handleDisconnect(clientConnection);
      connections.delete(clientId);
    });
  });
});

// Función para manejar la creación de juego
function handleCreateGame(clientConnection: ClientConnection, data: any): void {
  const gameMode = data.gameMode || 'pvp';
  const { gameId, gameState } = getOrCreateGame(undefined, gameMode);
  
  // Agregar el cliente al juego
  clientConnection.gameId = gameId;
  clientConnection.playerNumber = 1;
  gameConnections[gameId].players.push(clientConnection);
  gameState.jugadoresConectados++;
  
  // Si es modo PvE, agregar IA como jugador 2
  if (gameMode === 'pve') {
    const aiClientId = uuidv4();
    const aiConnection: ClientConnection = {
      id: aiClientId,
      ws: clientConnection.ws, // Compartir la conexión para simplicidad
      gameId: gameId,
      playerNumber: 2,
      isAI: true
    };
    
    gameConnections[gameId].players.push(aiConnection);
    gameState.jugadoresConectados++;
    gameState.addAIPlayer(2, aiClientId, data.difficulty || 'medium');
  }
  
  sendToClient(clientConnection.id, {
    tipo: 'juegoCreado',
    gameId: gameId,
    playerNumber: clientConnection.playerNumber,
    gameMode: gameMode,
    estado: {
      pelota: gameState.pelota,
      palas: gameState.palas,
      puntuacion: gameState.puntuacion,
      jugadoresConectados: gameState.jugadoresConectados,
      enJuego: gameState.enJuego
    }
  });
  
  // Si el juego puede iniciar, empezar la cuenta atrás
  if (canStartGame(gameState)) {
    startCountdown(gameState);
  }
}

// Función para manejar la unión a un juego
function handleJoinGame(clientConnection: ClientConnection, data: any): void {
  const gameId = data.gameId;
  
  if (!gameConnections[gameId]) {
    sendToClient(clientConnection.id, {
      tipo: 'error',
      mensaje: 'Juego no encontrado'
    });
    return;
  }
  
  const gameState = gameConnections[gameId].gameState;
  
  if (gameState.jugadoresConectados >= gameState.capacidadMaxima) {
    sendToClient(clientConnection.id, {
      tipo: 'error',
      mensaje: 'Juego lleno'
    });
    return;
  }
  
  // Determinar número de jugador
  const playerNumber = gameState.jugadoresConectados + 1;
  
  clientConnection.gameId = gameId;
  clientConnection.playerNumber = playerNumber as 1 | 2;
  gameConnections[gameId].players.push(clientConnection);
  gameState.jugadoresConectados++;
  
  sendToClient(clientConnection.id, {
    tipo: 'juegoUnido',
    gameId: gameId,
    playerNumber: clientConnection.playerNumber,
    estado: {
      pelota: gameState.pelota,
      palas: gameState.palas,
      puntuacion: gameState.puntuacion,
      jugadoresConectados: gameState.jugadoresConectados,
      enJuego: gameState.enJuego
    }
  });
  
  // Notificar a otros jugadores
  sendToGameClients(gameId, {
    tipo: 'jugadorUnido',
    playerNumber: clientConnection.playerNumber,
    jugadoresConectados: gameState.jugadoresConectados
  });
  
  // Si el juego puede iniciar, empezar la cuenta atrás
  if (canStartGame(gameState)) {
    startCountdown(gameState);
  }
}

// Función para manejar el movimiento
function handleMove(clientConnection: ClientConnection, data: any): void {
  if (!clientConnection.gameId || !clientConnection.playerNumber) {
    return;
  }
  
  const gameState = gameConnections[clientConnection.gameId].gameState;
  if (!gameState.enJuego) {
    return;
  }
  
  handlePlayerMovement(gameState, clientConnection.playerNumber, data.direccion);
}

// Función para manejar el inicio de juego
function handleStartGame(clientConnection: ClientConnection, data: any): void {
  if (!clientConnection.gameId) {
    return;
  }
  
  const gameState = gameConnections[clientConnection.gameId].gameState;
  
  if (canStartGame(gameState)) {
    startCountdown(gameState);
  }
}

// Función para obtener la lista de juegos
function handleGetGames(clientConnection: ClientConnection): void {
  const gamesList = Object.keys(gameConnections).map(gameId => {
    const gameState = gameConnections[gameId].gameState;
    return {
      id: gameId,
      nombre: gameState.nombre,
      jugadoresConectados: gameState.jugadoresConectados,
      capacidadMaxima: gameState.capacidadMaxima,
      enJuego: gameState.enJuego,
      gameMode: gameState.gameMode
    };
  });
  
  sendToClient(clientConnection.id, {
    tipo: 'listaJuegos',
    juegos: gamesList
  });
}

// Función para manejar la desconexión
function handleDisconnect(clientConnection: ClientConnection): void {
  if (clientConnection.gameId) {
    const gameState = gameConnections[clientConnection.gameId].gameState;
    
    // Remover el cliente del juego
    gameConnections[clientConnection.gameId].players = gameConnections[clientConnection.gameId].players.filter(
      player => player.id !== clientConnection.id
    );
    
    gameState.jugadoresConectados--;
    
    // Remover jugador IA si existe
    if (clientConnection.playerNumber) {
      gameState.removeAIPlayer(clientConnection.playerNumber);
    }
    
    // Si no quedan jugadores, limpiar el juego
    if (gameState.jugadoresConectados <= 0) {
      stopGameLoop(gameState);
      gameState.cleanup();
      delete gameConnections[clientConnection.gameId];
    } else {
      // Notificar a otros jugadores
      sendToGameClients(clientConnection.gameId, {
        tipo: 'jugadorDesconectado',
        playerNumber: clientConnection.playerNumber,
        jugadoresConectados: gameState.jugadoresConectados
      });
    }
  }
}

// 🚀 Iniciar el servidor
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`🎮 Servidor de juego funcionando en puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
