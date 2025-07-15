// 📦 Importamos Fastify, framework para crear servidores web en Node.js
import Fastify from 'fastify';

// 🔌 Plugin para WebSocket: nos permite comunicación en tiempo real con clientes
import websocket from '@fastify/websocket';

// 📁 Plugin para servir archivos estáticos
import fastifyStatic from '@fastify/static';

// 📁 Para manejar rutas de archivos
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Función para generar IDs únicos, para identificar a cada jugador y partida
import { randomUUID } from 'crypto';

// 🚀 Creamos el servidor Fastify, activamos el logger para ver qué pasa en consola
const fastify = Fastify({ logger: true });

// 🔧 Registramos el plugin WebSocket para que el servidor soporte conexiones en tiempo real
// Como esto es async, usamos await para que espere a que se configure bien
await fastify.register(websocket);

// 📁 Registramos el plugin de archivos estáticos para servir los archivos HTML del juego
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'test'),
  prefix: '/test/'
});

// 🔗 Ruta de prueba para verificar que el servidor funciona
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', message: 'Game service is running', timestamp: new Date().toISOString() };
});

// 🎮 API REST para controlar el juego
// Obtener lista de partidas
fastify.get('/api/games', async (request, reply) => {
  const gamesList = Array.from(partidas.values()).map(game => ({
    id: game.id,
    nombre: game.nombre,
    jugadoresConectados: game.jugadores.size,
    capacidadMaxima: game.capacidadMaxima,
    enJuego: game.enJuego,
    puntuacion: game.puntuacion,
    gameMode: game.gameMode,
    maxPlayers: game.maxPlayers
  }));
  return { games: gamesList };
});

// Crear nueva partida
fastify.post('/api/games', async (request, reply) => {
  const body = request.body as { nombre?: string, gameMode?: 'pvp' | 'pve' | 'multiplayer', maxPlayers?: number };
  const partidaId = randomUUID();
  const nombre = body.nombre || `Partida ${partidas.size + 1}`;
  const gameMode = body.gameMode || 'pvp';
  const maxPlayers = body.maxPlayers || 2;
  
  const nuevaPartida = new GameState(partidaId, nombre, gameMode, maxPlayers);
  partidas.set(partidaId, nuevaPartida);
  
  fastify.log.info(`Partida ${partidaId} creada via API: ${nombre}`);
  
  return { 
    id: partidaId, 
    nombre, 
    gameMode, 
    maxPlayers,
    message: 'Partida creada exitosamente' 
  };
});

// Obtener estado de una partida específica
fastify.get('/api/games/:gameId', async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const game = partidas.get(gameId);
  
  if (!game) {
    reply.status(404);
    return { error: 'Partida no encontrada' };
  }
  
  return game.obtenerEstadoCompletoJuego();
});

// Mover pala (simulando entrada de teclado)
fastify.post('/api/games/:gameId/move', async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const body = request.body as { player: 1 | 2, direction: 'up' | 'down', distance?: number };
  
  const game = partidas.get(gameId);
  if (!game) {
    reply.status(404);
    return { error: 'Partida no encontrada' };
  }
  
  const { player, direction, distance = 10 } = body;
  const pala = player === 1 ? game.palas.jugador1 : game.palas.jugador2;
  
  if (direction === 'up') {
    pala.y = Math.max(0, pala.y - distance);
  } else {
    pala.y = Math.min(game.alto - game.palaAlto, pala.y + distance);
  }
  
  return { 
    success: true, 
    player, 
    newY: pala.y,
    message: `Jugador ${player} movido ${direction}` 
  };
});

// Agregar IA a una partida
fastify.post('/api/games/:gameId/ai', async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const body = request.body as { player: 1 | 2, difficulty?: 'easy' | 'medium' | 'hard' };
  
  const game = partidas.get(gameId);
  if (!game) {
    reply.status(404);
    return { error: 'Partida no encontrada' };
  }
  
  const { player, difficulty = 'medium' } = body;
  
  // Verificar si ya existe un jugador humano en esa posición
  const humanPlayer = Array.from(game.jugadores.values()).find(j => j.numero === player && !j.esIA);
  if (humanPlayer) {
    reply.status(400);
    return { error: `Ya hay un jugador humano en la posición ${player}` };
  }
  
  game.addAIPlayer(player, difficulty);
  
  return { 
    success: true, 
    player, 
    difficulty,
    message: `IA agregada como jugador ${player} con dificultad ${difficulty}` 
  };
});

// Iniciar partida manualmente
fastify.post('/api/games/:gameId/start', async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const game = partidas.get(gameId);
  
  if (!game) {
    reply.status(404);
    return { error: 'Partida no encontrada' };
  }
  
  if (game.enJuego || game.cuentaAtrasActiva) {
    reply.status(400);
    return { error: 'La partida ya está en curso' };
  }
  
  // Verificar condiciones según el tipo de partida
  if (game.gameMode === 'pve') {
    const jugadoresHumanos = Array.from(game.jugadores.values()).filter(j => !j.esIA);
    if (jugadoresHumanos.length < 1 || game.aiPlayers.size < 1) {
      reply.status(400);
      return { error: 'Se necesita 1 jugador humano y 1 IA para iniciar una partida PvE' };
    }
  } else {
    if (game.jugadores.size < 2) {
      reply.status(400);
      return { error: 'Se necesitan al menos 2 jugadores para iniciar' };
    }
  }
  
  game.iniciarCuentaAtrasInicial();
  
  return { 
    success: true, 
    message: 'Partida iniciada' 
  };
});

// Eliminar partida
fastify.delete('/api/games/:gameId', async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const game = partidas.get(gameId);
  
  if (!game) {
    reply.status(404);
    return { error: 'Partida no encontrada' };
  }
  
  game.destroy();
  partidas.delete(gameId);
  
  return { 
    success: true, 
    message: 'Partida eliminada' 
  };
});

// 🧍 Estructuras para jugadores y observadores
type Jugador = {
  id: string,
  socket: WebSocket,
  numero: 1 | 2 | null, // Puede ser null si aún no está asignado a una partida
  partidaId: string | null, // Puede ser null si está en el lobby
  esIA: boolean // Indica si es un jugador controlado por IA
}

type Observador = {
  id: string,
  socket: WebSocket,
  viendoPartidaId: string | null // ID de la partida que está viendo (o null si en lobby global)
}

// 🤖 Clase AI para controlar jugadores automáticos
class AIPlayer {
  private gameState: GameState;
  private playerNumber: 1 | 2;
  private lastUpdateTime: number;
  private predictedBallY: number;
  private reactionTime: number;
  private maxSpeed: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  private lastDecision: number;
  private targetY: number;
  private randomOffset: number;

  constructor(gameState: GameState, playerNumber: 1 | 2, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.gameState = gameState;
    this.playerNumber = playerNumber;
    this.lastUpdateTime = Date.now();
    this.predictedBallY = gameState.alto / 2;
    this.difficulty = difficulty;
    this.lastDecision = 0;
    this.targetY = gameState.alto / 2;
    this.randomOffset = 0;
    
    // Configurar dificultad
    switch(difficulty) {
      case 'easy':
        this.reactionTime = 1000; // 1 segundo
        this.maxSpeed = 2;
        break;
      case 'medium':
        this.reactionTime = 500; // 0.5 segundos
        this.maxSpeed = 4;
        break;
      case 'hard':
        this.reactionTime = 200; // 0.2 segundos
        this.maxSpeed = 6;
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
    
    // Calcular nueva posición de la pala
    const centroPala = pala.y + this.gameState.palaAlto / 2;
    const targetY = this.predictedBallY + this.randomOffset;
    
    const diff = targetY - centroPala;
    const moveDistance = Math.min(Math.abs(diff), this.maxSpeed);
    
    if (Math.abs(diff) > 5) { // Zona muerta para evitar temblores
      if (diff > 0) {
        pala.y += moveDistance;
      } else {
        pala.y -= moveDistance;
      }
    }
    
    // Limitar movimiento dentro de los límites
    pala.y = Math.max(0, Math.min(this.gameState.alto - this.gameState.palaAlto, pala.y));
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
  maxPlayers: number // Número máximo de jugadores (2, 4, 6, etc.)
  createdAt: number // Timestamp de creación para limpieza

  // Referencias a los jugadores y observadores de ESTA partida
  jugadores: Map<string, Jugador> // Jugadores que pertenecen a esta partida
  observadores: Map<string, Observador> // Observadores que están viendo esta partida

  constructor(id: string, nombre: string, gameMode: 'pvp' | 'pve' | 'multiplayer' = 'pvp', maxPlayers: number = 2) {
    this.id = id
    this.nombre = nombre
    this.ancho = 600
    this.alto = 400
    this.palaAncho = 12
    this.palaAlto = 80
    this.pelota = { x: 300, y: 200, vx: 0, vy: 0, radio: 8 }
    this.palas = {
      jugador1: { x: 15, y: this.alto / 2 - this.palaAlto / 2 }, // Centrar pala al inicio
      jugador2: { x: this.ancho - 15 - this.palaAncho, y: this.alto / 2 - this.palaAlto / 2 }, // Centrar pala al inicio
    }
    this.puntuacion = { jugador1: 0, jugador2: 0 }
    this.rallyCount = 0
    this.enJuego = false // El juego no está activo hasta que empiece la cuenta atrás inicial
    this.cuentaAtrasActiva = false
    this.cuentaAtrasValor = 0
    this.jugadoresConectados = 0
    this.capacidadMaxima = Math.min(maxPlayers, 2) // Por ahora máximo 2 jugadores
    this.intervalId = null
    this.countdownIntervalId = null
    this.aiUpdateIntervalId = null
    this.aiPlayers = new Map<number, AIPlayer>()
    this.gameMode = gameMode
    this.maxPlayers = maxPlayers
    this.createdAt = Date.now()

    this.jugadores = new Map<string, Jugador>()
    this.observadores = new Map<string, Observador>()

    // Iniciar el bucle de juego para esta instancia
    this.intervalId = setInterval(() => this.update(), 1000 / 60); // 60 FPS
    
    // Iniciar bucle de actualización de IA cada segundo
    this.aiUpdateIntervalId = setInterval(() => this.updateAI(), 1000);
    
    // Si es modo PvE, agregar IA automáticamente como jugador 2
    if (gameMode === 'pve') {
      this.addAIPlayer(2, 'medium');
      fastify.log.info(`Partida PvE ${this.id}: IA agregada automáticamente como jugador 2`);
    }
  }

  // 🔄 Función para reiniciar la pelota después de un punto
  reiniciarPelota(direccion: number) {
    this.pelota.x = this.ancho / 2;
    this.pelota.y = this.alto / 2;
    this.pelota.vx = 5 * direccion; // Velocidad inicial de la pelota
    this.pelota.vy = (Math.random() - 0.5) * 5;
    // Asegurarse de que la velocidad vertical no sea cero
    if (this.pelota.vy === 0) {
        this.pelota.vy = (Math.random() > 0.5 ? 1 : -1) * 0.5;
    }
    this.rallyCount = 0; // Reiniciar cuenta de rally
    this.enJuego = true; // Asegurarse de que el juego esté marcado como en curso
  }

  // Función para enviar un mensaje a los jugadores de ESTA partida
  emitirATodosLosJugadores(mensaje: any) {
    for (const j of this.jugadores.values()) {
      if (j.socket && j.socket.readyState === j.socket.OPEN) {
        j.socket.send(JSON.stringify(mensaje));
      }
    }
  }

  // Función para enviar un mensaje a los observadores de ESTA partida
  emitirATodosLosObservadores(mensaje: any) {
    for (const o of this.observadores.values()) {
      if (o.socket.readyState === o.socket.OPEN) {
        o.socket.send(JSON.stringify(mensaje));
      }
    }
  }

  // Función para enviar un mensaje a todos los clientes (jugadores y observadores) de ESTA partida
  emitirATodosLosClientes(mensaje: any) {
    this.emitirATodosLosJugadores(mensaje);
    this.emitirATodosLosObservadores(mensaje);
  }

  // Método para agregar un jugador IA
  addAIPlayer(playerNumber: 1 | 2, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
    // Verificar si ya existe una IA en esta posición
    if (this.aiPlayers.has(playerNumber)) {
      // Si ya existe, solo actualizar la dificultad
      const existingAI = this.aiPlayers.get(playerNumber);
      if (existingAI) {
        this.aiPlayers.delete(playerNumber);
        fastify.log.info(`IA existente en posición ${playerNumber} reemplazada con dificultad ${difficulty}`);
      }
    }
    
    // Verificar si ya existe un jugador virtual IA en esta posición
    const existingAIPlayer = Array.from(this.jugadores.values()).find(j => j.numero === playerNumber && j.esIA);
    if (existingAIPlayer) {
      this.jugadores.delete(existingAIPlayer.id);
      fastify.log.info(`Jugador virtual IA existente en posición ${playerNumber} eliminado`);
    }
    
    const aiPlayer = new AIPlayer(this, playerNumber, difficulty);
    this.aiPlayers.set(playerNumber, aiPlayer);
    
    // Crear un jugador virtual para la IA
    const aiJugador: Jugador = {
      id: `ai_player_${playerNumber}`,
      socket: null as any, // IA no tiene socket
      numero: playerNumber,
      partidaId: this.id,
      esIA: true
    };
    
    this.jugadores.set(aiJugador.id, aiJugador);
    this.jugadoresConectados = this.jugadores.size;
    
    fastify.log.info(`IA agregada como jugador ${playerNumber} en partida ${this.id}`);
  }

  // Método para actualizar todos los jugadores IA
  updateAI(): void {
    for (const [playerNumber, aiPlayer] of this.aiPlayers) {
      if (this.enJuego) {
        aiPlayer.update();
      }
    }
  }

  // Verificar si un jugador es IA
  isAIPlayer(playerNumber: 1 | 2): boolean {
    return this.aiPlayers.has(playerNumber);
  }

  // Función para obtener el estado simplificado de ESTA partida para el lobby/observadores
  obtenerEstadoParaLobby() {
    return {
      id: this.id,
      nombre: this.nombre,
      jugadoresConectados: this.jugadores.size,
      capacidadMaxima: this.capacidadMaxima,
      enJuego: this.enJuego,
      puntuacion: this.puntuacion,
    };
  }

  // 🔁 Motor del juego para esta instancia
  update() {
    // Verificar condiciones para continuar el juego según el tipo de partida
    let puedeJugar = false;
    
    if (this.gameMode === 'pve') {
      // Para PvE, necesitamos 1 jugador humano + 1 IA
      const jugadoresHumanos = Array.from(this.jugadores.values()).filter(j => !j.esIA);
      puedeJugar = jugadoresHumanos.length === 1 && this.aiPlayers.size === 1;
    } else {
      // Para PvP, necesitamos al menos 2 jugadores
      puedeJugar = this.jugadores.size >= 2;
    }
    
    // Si no hay suficientes jugadores o el juego no está activo, o cuenta atrás
    if (!puedeJugar || !this.enJuego || this.cuentaAtrasActiva) {
      // Solo enviamos el estado si hay observadores o si hay al menos un jugador esperando
      if (this.observadores.size > 0 || this.jugadores.size > 0) {
        // Si no puede jugar y no está en cuenta atrás y no en juego, indicar espera
        if (!puedeJugar && !this.cuentaAtrasActiva && !this.enJuego) {
            this.emitirATodosLosJugadores({ tipo: 'estado_general', estado: 'esperando_jugador' });
        }
        // Enviar el estado actual del juego a todos los clientes (jugadores y observadores)
        this.emitirATodosLosJugadores({ tipo: 'estado', juego: this.obtenerEstadoCompletoJuego() });
        this.emitirATodosLosObservadores({ tipo: 'estado_partida_observada', juego: this.obtenerEstadoCompletoJuego() });
      }
      return; // Salimos de la función sin actualizar la lógica del juego
    }

    const pelota = this.pelota;

    // Las palas ya se actualizan con los mensajes 'mover' del cliente, solo se limita aquí
    this.palas.jugador1.y = Math.max(0, Math.min(this.alto - this.palaAlto, this.palas.jugador1.y));
    this.palas.jugador2.y = Math.max(0, Math.min(this.alto - this.palaAlto, this.palas.jugador2.y));


    // ⏩ Movemos la pelota sumando su velocidad a su posición actual
    pelota.x += pelota.vx;
    pelota.y += pelota.vy;

    // ⚽ Detección de puntos y reinicio de la pelota
    let puntoMarcado = false;
    if (pelota.x > this.ancho) {
      this.puntuacion.jugador1++;
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'punto' });
      fastify.log.info(`Punto para Jugador 1 en ${this.id}. Marcador: ${this.puntuacion.jugador1}-${this.puntuacion.jugador2}`);
      puntoMarcado = true;
    }
    else if (pelota.x < 0) {
      this.puntuacion.jugador2++;
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'punto' });
      fastify.log.info(`Punto para Jugador 2 en ${this.id}. Marcador: ${this.puntuacion.jugador1}-${this.puntuacion.jugador2}`);
      puntoMarcado = true;
    }
    
    // Verificar si el juego terminó ANTES de hacer return
    if (puntoMarcado) {
      // Lógica para terminar el juego (ej. a 5 puntos)
      if (this.puntuacion.jugador1 >= 5 || this.puntuacion.jugador2 >= 5) {
        this.stopGame(); // Detener el bucle del juego y cuenta atrás
        const winner = this.puntuacion.jugador1 >= 5 ? 'Jugador 1' : 'Jugador 2';
        const message = `¡Fin de la partida ${this.id}! Ganador: ${winner} (${this.puntuacion.jugador1}-${this.puntuacion.jugador2})`;
        fastify.log.info(message);
        
        const finalMessage = { tipo: 'juego_finalizado', mensaje: message, ganador: winner, partidaId: this.id };
        fastify.log.info(`Enviando mensaje de fin de juego: ${JSON.stringify(finalMessage)}`);
        fastify.log.info(`Jugadores conectados: ${this.jugadores.size}`);
        
        this.emitirATodosLosClientes(finalMessage);

        // Delay antes de reiniciar para asegurar que el mensaje llegue
        setTimeout(() => {
          // Reiniciar la partida para que pueda ser jugada de nuevo
          this.puntuacion = { jugador1: 0, jugador2: 0 };
          this.pelota = { x: this.ancho / 2, y: this.alto / 2, vx: 0, vy: 0, radio: 8 }; // Bola estática hasta el inicio
          this.palas = {
              jugador1: { x: 15, y: this.alto / 2 - this.palaAlto / 2 },
              jugador2: { x: this.ancho - 15 - this.palaAncho, y: this.alto / 2 - this.palaAlto / 2 }
          };
          this.rallyCount = 0;
          this.enJuego = false; // Marcar como no en juego hasta que se inicie de nuevo
          this.cuentaAtrasActiva = false;
          this.cuentaAtrasValor = 0;
          this.emitirActualizacionLobby(); // Actualizar el lobby con el estado de la partida reseteada
          fastify.log.info(`Partida ${this.id} reiniciada después de fin de juego`);
        }, 1000); // Esperar 1 segundo antes de reiniciar
        return; // Salir después de procesar el fin de juego
      } else {
        // Si no terminó el juego, reiniciar la pelota
        // La pelota va hacia quien NO marcó el punto
        const direccion = pelota.x > this.ancho ? 1 : -1; // Si salió por la derecha, va hacia la derecha (1), si salió por la izquierda, va hacia la izquierda (-1)
        this.reiniciarPelota(direccion);
        this.emitirActualizacionLobby(); // Actualizar lobby global
        return;
      }
    }

    // 🧱 Rebote con paredes superior e inferior
    if (pelota.y - pelota.radio <= 0) {
      pelota.y = pelota.radio;
      pelota.vy *= -1;
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'pared' });
    } else if (pelota.y + pelota.radio >= this.alto) {
      pelota.y = this.alto - pelota.radio;
      pelota.vy *= -1;
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'pared' });
    }

    // 🥅 Rebote con las palas
    const pala1 = this.palas.jugador1;
    const pala2 = this.palas.jugador2;

    // Rebote pala izquierda (jugador1)
    if (
      pelota.vx < 0 &&
      pelota.x - pelota.radio <= pala1.x + this.palaAncho &&
      pelota.x - pelota.radio > pala1.x && // Evitar doble rebote
      pelota.y + pelota.radio >= pala1.y &&
      pelota.y - pelota.radio <= pala1.y + this.palaAlto
    ) {
      pelota.x = pala1.x + this.palaAncho + pelota.radio; // Ajustar posición para evitar "sticking"
      this.rallyCount++;
      pelota.vx *= -1;

      const centroPala = pala1.y + this.palaAlto / 2;
      const distanciaCentro = pelota.y - centroPala;
      const normalizado = distanciaCentro / (this.palaAlto / 2);
      const maxVy = 5; // Velocidad Y máxima al rebotar

      const factorAumento = 1.08; // Factor de aceleración de la pelota
      const maxVelocidad = 9; // Velocidad máxima absoluta de la pelota
      pelota.vx = Math.min(maxVelocidad, pelota.vx * factorAumento); // Acelera
      pelota.vy = normalizado * maxVy; // Cambia dirección Y según donde golpea
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'pala' });
    }

    // Rebote pala derecha (jugador2)
    else if (
      pelota.vx > 0 &&
      pelota.x + pelota.radio >= pala2.x &&
      pelota.x + pelota.radio < pala2.x + this.palaAncho && // Evitar doble rebote
      pelota.y + pelota.radio >= pala2.y &&
      pelota.y - pelota.radio <= pala2.y + this.palaAlto
    ) {
      pelota.x = pala2.x - pelota.radio; // Ajustar posición para evitar "sticking"
      this.rallyCount++;
      pelota.vx *= -1;

      const centroPala = pala2.y + this.palaAlto / 2;
      const distanciaCentro = pelota.y - centroPala;
      const normalizado = distanciaCentro / (this.palaAlto / 2);
      const maxVy = 5; // Velocidad Y máxima al rebotar

      const factorAumento = 1.08; // Factor de aceleración de la pelota
      const maxVelocidad = 9; // Velocidad máxima absoluta de la pelota
      pelota.vx = Math.max(-maxVelocidad, pelota.vx * factorAumento); // Acelera (negativo)
      pelota.vy = normalizado * maxVy; // Cambia dirección Y según donde golpea
      this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'pala' });
    }

    // 📤 Enviamos el estado actualizado del juego a los jugadores y observadores
    this.emitirATodosLosJugadores({ tipo: 'estado', juego: this.obtenerEstadoCompletoJuego() });
    this.emitirATodosLosObservadores({ tipo: 'estado_partida_observada', juego: this.obtenerEstadoCompletoJuego() });
  }

  // Obtiene el estado completo del juego para ser enviado a los clientes
  obtenerEstadoCompletoJuego() {
    return {
      id: this.id,
      nombre: this.nombre,
      ancho: this.ancho,
      alto: this.alto,
      palaAncho: this.palaAncho,
      palaAlto: this.palaAlto,
      pelota: this.pelota,
      palas: this.palas,
      puntuacion: this.puntuacion,
      rallyCount: this.rallyCount,
      enJuego: this.enJuego,
      cuentaAtrasActiva: this.cuentaAtrasActiva,
      cuentaAtrasValor: this.cuentaAtrasValor,
      jugadoresConectados: this.jugadores.size,
      capacidadMaxima: this.capacidadMaxima,
    };
  }

  // Método para emitir la actualización de esta partida a TODOS los observadores del lobby principal y jugadores en el lobby
  emitirActualizacionLobby() {
    const listaPartidas = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
    emitirATodosLosObservadoresDelLobby({
      tipo: 'partidas_disponibles',
      partidas: listaPartidas
    });
    emitirATodosLosJugadoresDelLobby({ // ¡NUEVO! Para jugadores en el lobby
        tipo: 'partidas_disponibles',
        partidas: listaPartidas
    });
  }

  // Lógica de inicio de cuenta atrás (solo al inicio de la partida)
  iniciarCuentaAtrasInicial() {
    this.cuentaAtrasActiva = true;
    this.cuentaAtrasValor = 3;
    this.pelota.vx = 0;
    this.pelota.vy = 0;
    fastify.log.info(`Partida ${this.id}: Dos jugadores conectados. Iniciando cuenta atrás inicial...`);
    this.emitirATodosLosClientes({ tipo: 'cuenta_atras', valor: this.cuentaAtrasValor });
    this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'countdown' });
    this.emitirActualizacionLobby(); // Actualizar estado en lobby

    if (this.countdownIntervalId) {
        clearInterval(this.countdownIntervalId);
    }
    this.countdownIntervalId = setInterval(() => {
        this.cuentaAtrasValor--;
        if (this.cuentaAtrasValor > 0) {
            fastify.log.info(`Partida ${this.id}: Cuenta atrás: ${this.cuentaAtrasValor}`);
            this.emitirATodosLosClientes({ tipo: 'cuenta_atras', valor: this.cuentaAtrasValor });
            this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'countdown' });
        } else {
            clearInterval(this.countdownIntervalId!);
            this.countdownIntervalId = null;
            this.cuentaAtrasActiva = false;
            this.enJuego = true; // Marcar juego como activo
            this.reiniciarPelota(1); // Inicia el primer saque
            fastify.log.info(`Partida ${this.id}: ¡Juego iniciado!`);
            this.emitirATodosLosClientes({ tipo: 'juego_iniciado', mensaje: '¡El juego ha comenzado!' });
            this.emitirATodosLosClientes({ tipo: 'sonido', evento: 'start' });
            this.emitirActualizacionLobby(); // Actualizar estado en lobby
        }
    }, 1000);
  }

  // Lógica de desconexión de jugador
  manejarDesconexionJugador(jugadorId: string) {
    this.jugadores.delete(jugadorId);
    this.jugadoresConectados = this.jugadores.size;
    fastify.log.info(`Jugador ${jugadorId} desconectado de partida ${this.id}. Jugadores restantes: ${this.jugadores.size}`);

    this.emitirActualizacionLobby(); // Notificar a los observadores y jugadores del lobby

    // Si un jugador se desconecta, el juego ya no puede continuar
    if (this.enJuego || this.cuentaAtrasActiva) {
        this.enJuego = false;
        this.cuentaAtrasActiva = false;
        if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
        }
        this.pelota.vx = 0;
        this.pelota.vy = 0;
        this.pelota.x = this.ancho / 2;
        this.pelota.y = this.alto / 2;
        this.emitirATodosLosClientes({ tipo: 'jugador_desconectado', mensaje: 'El otro jugador se ha desconectado. Esperando un nuevo oponente.' });
        fastify.log.info(`Partida ${this.id}: Juego detenido: un jugador se ha desconectado.`);
    }
    // Si queda un solo jugador, o si no queda ninguno, asegurarse de que el estado refleje "esperando"
    if (this.jugadores.size === 1) {
        this.emitirATodosLosJugadores({ tipo: 'estado_general', estado: 'esperando_jugador' });
        fastify.log.info(`Partida ${this.id}: Un jugador restante. Volviendo al estado de espera.`);
    } else if (this.jugadores.size === 0) {
        // Si no quedan jugadores, reiniciar puntuación para el próximo juego
        this.puntuacion = { jugador1: 0, jugador2: 0 };
        fastify.log.info(`Partida ${this.id}: Todos los jugadores desconectados. Puntuación reiniciada.`);
    }
  }

  // Método para detener el intervalo de actualización (cuando la partida ya no sea necesaria)
  stopGame() {
      this.enJuego = false;
      this.cuentaAtrasActiva = false;
      if (this.countdownIntervalId) {
          clearInterval(this.countdownIntervalId);
          this.countdownIntervalId = null;
      }
      this.pelota.vx = 0;
      this.pelota.vy = 0;
  }

  destroy() {
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
    this.jugadores.clear();
    this.observadores.clear();
    this.aiPlayers.clear();
    fastify.log.info(`Partida ${this.id} destruida.`);
  }
}


// 🕹️ Almacén de todas las partidas activas
const partidas = new Map<string, GameState>();
// Almacén global de observadores del lobby (distinto de los observadores de una partida específica)
const observadoresLobby = new Map<string, Observador>();
// ¡NUEVO! Almacén global de jugadores en el lobby (antes de unirse a una partida)
const jugadoresLobby = new Map<string, Jugador>();

// Helper para emitir a TODOS los observadores del lobby
function emitirATodosLosObservadoresDelLobby(mensaje: any) {
  for (const o of observadoresLobby.values()) {
      if (o.socket.readyState === o.socket.OPEN) {
          o.socket.send(JSON.stringify(mensaje));
      }
  }
}

// ¡NUEVO! Helper para emitir a TODOS los jugadores del lobby
function emitirATodosLosJugadoresDelLobby(mensaje: any) {
    for (const j of jugadoresLobby.values()) {
        if (j.socket.readyState === j.socket.OPEN) {
            j.socket.send(JSON.stringify(mensaje));
        }
    }
}

// Inicializar una partida de ejemplo al iniciar el servidor para que el visor siempre tenga algo que mostrar
function crearPartidaNueva(gameMode: 'pvp' | 'pve' | 'multiplayer' = 'pvp', maxPlayers: number = 2) {
    const partidaId = randomUUID();
    const nuevaPartida = new GameState(partidaId, `Partida de Pong ${partidas.size + 1}`, gameMode, maxPlayers);
    partidas.set(partidaId, nuevaPartida);
    fastify.log.info(`Partida ${partidaId} creada: ${nuevaPartida.nombre} (${gameMode})`);
    // Notificar a todos los observadores y jugadores del lobby que hay una nueva partida
    nuevaPartida.emitirActualizacionLobby();
    return nuevaPartida;
}

// 📡 Definimos la ruta WebSocket principal para JUGADORES: LOBBY
fastify.get('/pong/lobby', { websocket: true }, (connection, req) => {
    const id = randomUUID();
    const jugador: Jugador = { id, socket: connection.socket, numero: null, partidaId: null, esIA: false };
    jugadoresLobby.set(id, jugador);
    fastify.log.info(`Jugador ${id} conectado al lobby de jugadores.`);

    // Enviar la lista de partidas disponibles al nuevo jugador del lobby
    const listaPartidas = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
    connection.socket.send(JSON.stringify({
        tipo: 'partidas_disponibles',
        partidas: listaPartidas
    }));

    connection.socket.on('message', (mensaje) => {
        try {
            const datos = JSON.parse(mensaje.toString());

            if (datos.tipo === 'crear_partida_y_unirse') {
                const { gameMode = 'pvp', maxPlayers = 2 } = datos;
                fastify.log.info(`Jugador ${id} solicita crear partida y unirse. Partidas actuales: ${partidas.size}`);
                const nuevaPartida = crearPartidaNueva(gameMode, maxPlayers); // Crea la partida
                fastify.log.info(`Partida ${nuevaPartida.id} creada por ${id}. Total partidas: ${partidas.size}`);
                // Informa al cliente que creó la partida a qué ID debe conectarse
                connection.socket.send(JSON.stringify({ tipo: 'conectar_a_partida', partidaId: nuevaPartida.id }));
                fastify.log.info(`Enviando instrucción a ${id} para conectar a partida ${nuevaPartida.id}`);
                // Remover el jugador del lobby ya que se va a una partida
                jugadoresLobby.delete(id);
                fastify.log.info(`Jugador ${id} removido del lobby. Jugadores en lobby: ${jugadoresLobby.size}`);
                // El cliente cerrará esta conexión al lobby y abrirá una nueva a la partida.
            } else if (datos.tipo === 'unirse_a_partida') {
                const partidaIdAUnirse = datos.partidaId;
                const partidaObjetivo = partidas.get(partidaIdAUnirse);

                if (!partidaObjetivo) {
                    connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'La partida seleccionada no existe.' }));
                    return;
                }
                if (partidaObjetivo.jugadores.size >= partidaObjetivo.capacidadMaxima) {
                    connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'La partida seleccionada está llena.' }));
                    return;
                }
                // Informa al cliente a qué ID de partida debe conectarse
                connection.socket.send(JSON.stringify({ tipo: 'conectar_a_partida', partidaId: partidaObjetivo.id }));
                // Remover el jugador del lobby ya que se va a una partida
                jugadoresLobby.delete(id);
                // El cliente cerrará esta conexión al lobby y abrirá una nueva a la partida.
            } else if (datos.tipo === 'get_partidas_disponibles') {
                // Reenviar la lista de partidas disponibles a este jugador del lobby específico
                const listaPartidasReenviar = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
                connection.socket.send(JSON.stringify({
                    tipo: 'partidas_disponibles',
                    partidas: listaPartidasReenviar
                }));
                fastify.log.info(`Jugador ${id} en lobby solicitó actualizar lista de partidas.`);
            }
        } catch (e) {
            console.error('Mensaje inválido en lobby de jugadores:', mensaje.toString(), e);
        }
    });

    connection.socket.on('close', () => {
        jugadoresLobby.delete(id);
        fastify.log.info(`Jugador ${id} desconectado del lobby de jugadores.`);
        // No es necesario actualizar el lobby aquí, porque el cliente se reconecta
        // o simplemente abandona. La limpieza de partidas inactivas ya lo maneja.
    });

    connection.socket.on('error', (err) => {
        fastify.log.error(`Error en WebSocket de jugador ${id} en lobby: ${err.message}`);
    });
});

// 📡 Definimos ruta WebSocket para JUGADORES: PARTIDA ESPECÍFICA
fastify.get('/pong/:partidaId', { websocket: true }, (connection, req) => {
  const partidaId = (req.params as { partidaId: string }).partidaId;
  let partida = partidas.get(partidaId);

  // Si la partida no existe (ej. ID inválido, o fue limpiada), informar error y cerrar
  if (!partida) {
    connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: `Partida ${partidaId} no encontrada o ya no existe.` }));
    connection.socket.close();
    fastify.log.info(`Conexión rechazada: partida ${partidaId} no existe.`);
    return;
  }

  // Para partidas PvE, verificar si hay espacio para el jugador humano
  if (partida.gameMode === 'pve') {
    // En PvE, contar solo jugadores humanos (no IA)
    const jugadoresHumanos = Array.from(partida.jugadores.values()).filter(j => !j.esIA);
    if (jugadoresHumanos.length >= 1) {
      connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'Partida PvE llena. Solo puede haber un jugador humano.' }));
      connection.socket.close();
      fastify.log.info(`Conexión rechazada: partida PvE ${partidaId} ya tiene un jugador humano.`);
      return;
    }
  } else {
    // Para partidas PvP, verificar capacidad total
    if (partida.jugadores.size >= partida.capacidadMaxima) {
      connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'Partida llena. Intenta otra o crea una nueva.' }));
      connection.socket.close();
      fastify.log.info(`Conexión rechazada: partida ${partidaId} está llena.`);
      return;
    }
  }

  const id = randomUUID();
  const numerosEnUso = new Set([...partida.jugadores.values()].map(j => j.numero));
  // Asigna el primer número disponible (1 o 2)
  const numeroJugador: 1 | 2 = numerosEnUso.has(1) ? 2 : 1;

  const jugador: Jugador = { id, socket: connection.socket, numero: numeroJugador, partidaId: partida.id, esIA: false };
  partida.jugadores.set(id, jugador);
  partida.jugadoresConectados = partida.jugadores.size; // Actualiza el contador de jugadores conectados

  fastify.log.info(`Jugador ${id} (número ${numeroJugador}) conectado a la partida ${partida.id}. Jugadores en partida: ${partida.jugadoresConectados}`);
  connection.socket.send(JSON.stringify({ tipo: 'bienvenida', id, numero: numeroJugador, partidaId: partida.id }));

  partida.emitirActualizacionLobby(); // Actualizar el lobby global (observadores y otros jugadores en lobby)

  // Iniciar cuenta atrás según el tipo de partida
  if (partida.gameMode === 'pve') {
    // Para PvE, iniciar cuando haya 1 jugador humano + 1 IA
    const jugadoresHumanos = Array.from(partida.jugadores.values()).filter(j => !j.esIA);
    if (jugadoresHumanos.length === 1 && partida.aiPlayers.size === 1 && !partida.enJuego && !partida.cuentaAtrasActiva) {
      partida.iniciarCuentaAtrasInicial();
    } else {
      connection.socket.send(JSON.stringify({ tipo: 'estado_general', estado: 'esperando_jugador' }));
    }
  } else {
    // Para PvP, iniciar cuando se alcance la capacidad máxima
    if (partida.jugadores.size === partida.capacidadMaxima && !partida.enJuego && !partida.cuentaAtrasActiva) {
      partida.iniciarCuentaAtrasInicial();
    } else {
      connection.socket.send(JSON.stringify({ tipo: 'estado_general', estado: 'esperando_jugador' }));
    }
  }

  connection.socket.on('message', (mensaje) => {
    try {
      if (!partida) return; // La partida podría haberse eliminado
      const datos = JSON.parse(mensaje.toString());
      if (datos.tipo === 'mover') {
        // El cliente envía la dirección del movimiento
        const pala = numeroJugador === 1 ? partida.palas.jugador1 : partida.palas.jugador2;
        const velocidadMovimiento = 5;
        
        if (datos.y < 0) {
          // Mover hacia arriba
          pala.y = Math.max(0, pala.y + datos.y);
        } else if (datos.y > 0) {
          // Mover hacia abajo
          pala.y = Math.min(partida.alto - partida.palaAlto, pala.y + datos.y);
        }
        
        fastify.log.debug(`Jugador ${numeroJugador} movido a Y: ${pala.y}`);
      }
    } catch (e) {
      console.error('Mensaje inválido:', mensaje.toString(), e);
    }
  });

  connection.socket.on('close', () => {
    partida?.manejarDesconexionJugador(id); // Usa el método de la instancia de partida
    // Lógica para limpiar partidas sin jugadores ni observadores
    if (partida?.jugadores.size === 0 && partida?.observadores.size === 0) {
        fastify.log.info(`Partida ${partida.id} vacía (sin jugadores ni observadores), eliminando.`);
        partida.destroy(); // Detener el intervalo de actualización
        partidas.delete(partida.id);
        // Notificar a observadores y jugadores del lobby que la partida fue eliminada
        partida.emitirActualizacionLobby(); // Llamar de nuevo a emitirActualizacionLobby para refrescar la lista
    }
  });

  connection.socket.on('error', (err) => {
    fastify.log.error(`Error en WebSocket de jugador ${id} en partida ${partidaId}: ${err.message}`);
  });
});

// Ruta WebSocket para observadores '/observar' (para el lobby principal de observadores y luego para observar partidas específicas)
fastify.get('/observar', { websocket: true }, (connection, req) => {
    const id = randomUUID();
    const observador: Observador = { id, socket: connection.socket, viendoPartidaId: null };
    observadoresLobby.set(id, observador); // Se conecta al lobby de observadores
    fastify.log.info(`Observador ${id} conectado al lobby.`);

    // Enviar la lista de partidas disponibles al nuevo observador
    const listaPartidas = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
    connection.socket.send(JSON.stringify({
        tipo: 'partidas_disponibles',
        partidas: listaPartidas
    }));

    connection.socket.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.tipo === 'seleccionar_partida') {
                const partidaIdASeleccionar = data.partidaId;
                const partidaActual = partidas.get(partidaIdASeleccionar);

                if (partidaActual) {
                    fastify.log.info(`Observador ${id} seleccionó la partida: ${partidaIdASeleccionar}`);
                    // Remover observador de cualquier partida anterior que estuviera viendo
                    if (observador.viendoPartidaId) {
                        const oldPartida = partidas.get(observador.viendoPartidaId);
                        oldPartida?.observadores.delete(id);
                    }
                    // Asignar este observador a la nueva partida
                    partidaActual.observadores.set(id, observador);
                    observador.viendoPartidaId = partidaIdASeleccionar;
                    // Enviar un estado inicial de la partida al observador
                    connection.socket.send(JSON.stringify({ tipo: 'estado_partida_observada', juego: partidaActual.obtenerEstadoCompletoJuego() }));
                    // Actualizar el lobby porque el número de observadores de la partida ha cambiado
                    partidaActual.emitirActualizacionLobby();
                } else {
                    fastify.log.warn(`Observador ${id} intentó ver partida no existente: ${partidaIdASeleccionar}`);
                    connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'Partida no encontrada para observar.' }));
                    observador.viendoPartidaId = null; // Resetear lo que este observador estaba viendo
                }
            } else if (data.tipo === 'dejar_observar') {
                fastify.log.info(`Observador ${id} dejó de observar la partida: ${observador.viendoPartidaId}`);
                if (observador.viendoPartidaId) {
                    const oldPartida = partidas.get(observador.viendoPartidaId);
                    oldPartida?.observadores.delete(id);
                    oldPartida?.emitirActualizacionLobby(); // Actualizar el lobby al dejar de observar
                }
                observador.viendoPartidaId = null; // Este observador ya no está viendo ninguna partida específica
                // Enviar la lista de partidas actualizada para que el visor vuelva al modo lobby
                const listaPartidasActualizada = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
                connection.socket.send(JSON.stringify({
                    tipo: 'partidas_disponibles',
                    partidas: listaPartidasActualizada
                }));
            } else if (data.tipo === 'crear_partida') {
                const nuevaPartida = crearPartidaNueva();
                connection.socket.send(JSON.stringify({ tipo: 'partida_creada', partidaId: nuevaPartida.id, nombre: nuevaPartida.nombre }));
                fastify.log.info(`Partida ${nuevaPartida.id} creada por solicitud del observador ${id}.`);
                // La función crearPartidaNueva ya llama a emitirActualizacionLobby()
            } else if (data.tipo === 'get_partidas_disponibles') {
                // Reenviar la lista de partidas disponibles a este observador específico
                const listaPartidasReenviar = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
                connection.socket.send(JSON.stringify({
                    tipo: 'partidas_disponibles',
                    partidas: listaPartidasReenviar
                }));
                fastify.log.info(`Observador ${id} solicitó actualizar lista de partidas.`);
            }
        } catch (e) {
            console.error(`Mensaje inválido del observador ${id}: ${message.toString()}`, e);
        }
    });

    connection.socket.on('close', () => {
        fastify.log.info(`Observador ${id} desconectado del lobby.`);
        // Si el observador estaba viendo una partida específica, removerlo de esa partida
        if (observador.viendoPartidaId) {
            const partida = partidas.get(observador.viendoPartidaId);
            partida?.observadores.delete(id);
            partida?.emitirActualizacionLobby(); // Notificar a los lobbies que el número de observadores de la partida cambió
        }
        observadoresLobby.delete(id); // Eliminar del mapa global de observadores del lobby
        // La limpieza periódica se encargará de las partidas vacías.
        // También podemos forzar una actualización del lobby si el observador estaba viendo una partida
        // Y esa partida queda vacía y se elimina. Esto lo cubre el clean-up.
    });

    connection.socket.on('error', (err) => {
        fastify.log.error(`Error en WebSocket de observador ${id}: ${err.message}`);
    });
});

// 🚀 Iniciamos el servidor Fastify
try {
  await fastify.listen({ port: 8000, host: '0.0.0.0' }); // Escucha en todas las interfaces de red
  
  // Crear una partida inicial para que siempre haya al menos una disponible
  const partidaInicial = crearPartidaNueva();
  fastify.log.info(`Servidor iniciado. Partida inicial creada: ${partidaInicial.id}`);
  
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Limpieza periódica de partidas inactivas (sin jugadores ni observadores conectados)
setInterval(() => {
    let changed = false;
    for (const [gameId, game] of partidas.entries()) {
        // Solo limpiar partidas que estén completamente vacías por más de 2 minutos
        if (game.jugadores.size === 0 && game.observadores.size === 0) {
            // Agregar timestamp de creación para evitar limpieza prematura
            const now = Date.now();
            if (!game.createdAt) {
                game.createdAt = now;
            }
            
            // Solo limpiar después de 2 minutos de inactividad
            if (now - game.createdAt > 120000) {
                fastify.log.info(`Limpiando partida inactiva: ${gameId} (inactiva por ${(now - game.createdAt)/1000}s)`);
                game.destroy();
                partidas.delete(gameId);
                changed = true;
            }
        } else {
            // Si hay jugadores/observadores, resetear el timestamp
            game.createdAt = Date.now();
        }
    }
    
    // Asegurar que siempre haya al menos una partida disponible
    if (partidas.size === 0) {
        const nuevaPartida = crearPartidaNueva();
        fastify.log.info(`No hay partidas disponibles. Creando nueva partida: ${nuevaPartida.id}`);
        changed = true;
    }
    
    if (changed) {
        // Si se eliminaron partidas, actualizar ambos lobbies
        const listaPartidas = Array.from(partidas.values()).map(p => p.obtenerEstadoParaLobby());
        emitirATodosLosObservadoresDelLobby({ tipo: 'partidas_disponibles', partidas: listaPartidas });
        emitirATodosLosJugadoresDelLobby({ tipo: 'partidas_disponibles', partidas: listaPartidas });
    }
}, 60000); // Ejecutar cada 60 segundos
