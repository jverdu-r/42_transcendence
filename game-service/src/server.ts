// 📦 Importamos Fastify, framework para crear servidores web en Node.js
import Fastify from 'fastify';

// 🔌 Plugin para WebSocket: nos permite comunicación en tiempo real con clientes
import websocket from '@fastify/websocket';

// 🔐 Función para generar IDs únicos, para identificar a cada jugador y partida
import { randomUUID } from 'crypto';

// 🚀 Creamos el servidor Fastify, activamos el logger para ver qué pasa en consola
const fastify = Fastify({ logger: true });

// 🔧 Registramos el plugin WebSocket para que el servidor soporte conexiones en tiempo real
// Como esto es async, usamos await para que espere a que se configure bien
await fastify.register(websocket);

// 🧍 Estructuras para jugadores y observadores
type Jugador = {
  id: string,
  socket: WebSocket,
  numero: 1 | 2 | null, // Puede ser null si aún no está asignado a una partida
  partidaId: string | null // Puede ser null si está en el lobby
}

type Observador = {
  id: string,
  socket: WebSocket,
  viendoPartidaId: string | null // ID de la partida que está viendo (o null si en lobby global)
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

  // Referencias a los jugadores y observadores de ESTA partida
  jugadores: Map<string, Jugador> // Jugadores que pertenecen a esta partida
  observadores: Map<string, Observador> // Observadores que están viendo esta partida

  constructor(id: string, nombre: string) {
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
    this.capacidadMaxima = 2 // Máximo de jugadores por partida
    this.intervalId = null
    this.countdownIntervalId = null;

    this.jugadores = new Map<string, Jugador>()
    this.observadores = new Map<string, Observador>()

    // Iniciar el bucle de juego para esta instancia
    this.intervalId = setInterval(() => this.update(), 1000 / 60); // 60 FPS
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
      if (j.socket.readyState === j.socket.OPEN) {
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
    // Si no hay suficientes jugadores o el juego no está activo, o cuenta atrás
    if (this.jugadores.size < 2 || !this.enJuego || this.cuentaAtrasActiva) {
      // Solo enviamos el estado si hay observadores o si hay al menos un jugador esperando
      if (this.observadores.size > 0 || this.jugadores.size > 0) {
        // Si no hay 2 jugadores y no está en cuenta atrás y no en juego, indicar espera
        if (this.jugadores.size < 2 && !this.cuentaAtrasActiva && !this.enJuego) {
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
    this.jugadores.clear();
    this.observadores.clear();
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
function crearPartidaNueva() {
    const partidaId = randomUUID();
    const nuevaPartida = new GameState(partidaId, `Partida de Pong ${partidas.size + 1}`);
    partidas.set(partidaId, nuevaPartida);
    fastify.log.info(`Partida ${partidaId} creada: ${nuevaPartida.nombre}`);
    // Notificar a todos los observadores y jugadores del lobby que hay una nueva partida
    nuevaPartida.emitirActualizacionLobby();
    return nuevaPartida;
}

// 📡 Definimos la ruta WebSocket principal para JUGADORES: LOBBY
fastify.get('/pong/lobby', { websocket: true }, (connection, req) => {
    const id = randomUUID();
    const jugador: Jugador = { id, socket: connection.socket, numero: null, partidaId: null };
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
                fastify.log.info(`Jugador ${id} solicita crear partida y unirse. Partidas actuales: ${partidas.size}`);
                const nuevaPartida = crearPartidaNueva(); // Crea la partida
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

  // Si la partida está llena, rechazar
  if (partida.jugadores.size >= partida.capacidadMaxima) {
    connection.socket.send(JSON.stringify({ tipo: 'error', mensaje: 'Partida llena. Intenta otra o crea una nueva.' }));
    connection.socket.close();
    fastify.log.info(`Conexión rechazada: partida ${partidaId} está llena.`);
    return;
  }

  const id = randomUUID();
  const numerosEnUso = new Set([...partida.jugadores.values()].map(j => j.numero));
  // Asigna el primer número disponible (1 o 2)
  const numeroJugador: 1 | 2 = numerosEnUso.has(1) ? 2 : 1;

  const jugador: Jugador = { id, socket: connection.socket, numero: numeroJugador, partidaId: partida.id };
  partida.jugadores.set(id, jugador);
  partida.jugadoresConectados = partida.jugadores.size; // Actualiza el contador de jugadores conectados

  fastify.log.info(`Jugador ${id} (número ${numeroJugador}) conectado a la partida ${partida.id}. Jugadores en partida: ${partida.jugadoresConectados}`);
  connection.socket.send(JSON.stringify({ tipo: 'bienvenida', id, numero: numeroJugador, partidaId: partida.id }));

  partida.emitirActualizacionLobby(); // Actualizar el lobby global (observadores y otros jugadores en lobby)

  // Solo iniciar la cuenta atrás si la partida alcanza la capacidad máxima Y no está ya en juego
  if (partida.jugadores.size === partida.capacidadMaxima && !partida.enJuego && !partida.cuentaAtrasActiva) {
    partida.iniciarCuentaAtrasInicial();
  } else {
    // Si no se inicia la cuenta atrás, enviar un estado de espera al cliente
    connection.socket.send(JSON.stringify({ tipo: 'estado_general', estado: 'esperando_jugador' }));
  }

  connection.socket.on('message', (mensaje) => {
    try {
      if (!partida) return; // La partida podría haberse eliminado
      const datos = JSON.parse(mensaje.toString());
      if (datos.tipo === 'mover') {
        // El cliente envía la posición Y deseada de la pala
        const nuevaPalaY: number = datos.y;
        const pala = numeroJugador === 1 ? partida.palas.jugador1 : partida.palas.jugador2;
        // Limitar la posición de la pala dentro de los límites del juego (aunque el cliente ya debería hacerlo)
        pala.y = Math.max(0, Math.min(partida.alto - partida.palaAlto, nuevaPalaY));
      }
    } catch (e) {
      console.error('Mensaje inválido:', mensaje.toString(), e); // Log más detallado del error
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
  await fastify.listen({ port: 8002, host: '0.0.0.0' }); // Escucha en todas las interfaces de red
  
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
        if (game.jugadores.size === 0 && game.observadores.size === 0) {
            fastify.log.info(`Limpiando partida inactiva: ${gameId}`);
            game.destroy(); // Asegurarse de que se detenga el bucle
            partidas.delete(gameId);
            changed = true;
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
}, 30000); // Ejecutar cada 30 segundos
