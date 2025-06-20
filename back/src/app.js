// src/app.js

const fastify = require('fastify')({
    logger: true // Habilita el logger para ver los mensajes de info, warn y error
});

// AÑADE ESTA LÍNEA AQUÍ
const WebSocket = require('ws'); // Asegúrate de que el módulo 'ws' esté disponible explícitamente

// Registrar el plugin CORS para permitir peticiones desde el frontend
// COMENTA TEMPORALMENTE ESTA LÍNEA Y EL BLOQUE PARA DEPURACIÓN
// fastify.register(require('@fastify/cors'), {
//     origin: '*', // Permite cualquier origen. En producción, deberías especificar los dominios permitidos.
//     methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
//     allowedHeaders: ['Content-Type', 'Authorization'] // Cabeceras permitidas
// });

// Registrar el plugin WebSocket
fastify.register(require('@fastify/websocket'));

let waitingPlayerSocket = null; // Almacena el socket del jugador esperando oponente
let waitingTimeout = null;      // Temporizador para el timeout de espera
const activeGames = [];         // Array para almacenar los juegos activos

/**
 * Limpia el estado del jugador en espera (si lo hay).
 * @param {string} reason - Razón por la cual se limpia la espera (ej. 'timeout', 'matched', 'left', 'error').
 */
function clearWaitingPlayer(reason = 'timeout') {
    if (waitingPlayerSocket) {
        // Solo intenta enviar si el socket existe y está abierto
        if (waitingPlayerSocket.ws && waitingPlayerSocket.ws.readyState === 1) {
            waitingPlayerSocket.ws.send(JSON.stringify({
                type: 'waiting_timeout',
                message: reason === 'timeout'
                    ? 'No se encontró oponente a tiempo. Intenta de nuevo.'
                    : 'Saliste de la cola de espera.'
            }));
            waitingPlayerSocket.ws.close(); // Cierra el socket del jugador en espera
        }
    }
    waitingPlayerSocket = null; // Restablece el jugador en espera
    if (waitingTimeout) {
        clearTimeout(waitingTimeout); // Limpia el temporizador si existe
        waitingTimeout = null;
    }
}

// Ruta WebSocket para la conexión del juego
fastify.get('/ws', { websocket: true }, (connection, req) => {
    // connection.socket es el objeto WebSocket real proporcionado por ws
    const ws = connection.socket;
    const tempConnectionId = `ConexionWS_${Math.random().toString(36).substring(7)}`;
    fastify.log.info(`Nueva conexión WebSocket entrante: ${tempConnectionId}`);

    // Log más detallado del estado del socket al inicio
    fastify.log.info(`Estado del socket ${tempConnectionId} al inicio: readyState=${ws.readyState}, typeof ws.send=${typeof ws.send}`);
    
    // AÑADE ESTAS DOS LÍNEAS DE LOG PARA DEPURACIÓN PROFUNDA
    fastify.log.info(`Es 'ws' una instancia de WebSocket del módulo 'ws'?: ${ws instanceof WebSocket}`);
    fastify.log.info(`Métodos propios del prototipo de 'ws': ${Object.getOwnPropertyNames(Object.getPrototypeOf(ws))}`);


    // Comprobaciones defensivas antes de enviar el mensaje inicial
    // readyState: 0 (CONNECTING), 1 (OPEN), 2 (CLOSING), 3 (CLOSED)
    if (ws && typeof ws.send === 'function' && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'status', message: 'Estoy vivo' }));
        fastify.log.info(`Mensaje "Estoy vivo" enviado a ${tempConnectionId}`);
    } else {
        fastify.log.warn(`No se pudo enviar mensaje "Estoy vivo" a ${tempConnectionId}. El socket no está listo o es inválido. readyState: ${ws ? ws.readyState : 'N/A'}`);
        // Si el socket no está listo para enviar de inmediato, es posible que sea mejor
        // no continuar con este socket, ya que es probable que haya un problema de sincronización.
        // Opcional: ws.close(); // Descomentar si quieres cerrar la conexión inmediatamente.
        return; // Salir de la función para evitar procesar un socket no funcional.
    }

    let playerName = null; // Almacena el nombre del jugador una vez que se une a la cola

    // Manejador de mensajes recibidos del cliente WebSocket
    ws.on('message', message => {
        fastify.log.info(`Mensaje recibido: ${message.toString()}`);
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'join-game') {
                // Validación del nombre de usuario
                if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
                    if (ws.readyState === 1) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'El nombre de usuario es obligatorio y debe ser válido.'
                        }));
                    }
                    return;
                }
                playerName = data.name.trim(); // Asigna el nombre al jugador

                // Evitar que el mismo jugador se una dos veces a la cola de espera
                if (waitingPlayerSocket && waitingPlayerSocket.id === playerName) {
                    if (ws.readyState === 1) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Ya estás esperando un oponente con ese nombre.'
                        }));
                    }
                    return;
                }

                fastify.log.info(`Mensaje 'join-game' recibido de ${playerName}: ${message.toString()}`);

                if (waitingPlayerSocket === null) {
                    // Si no hay nadie esperando, este jugador entra en espera
                    waitingPlayerSocket = { id: playerName, ws: ws };
                    fastify.log.info(`${playerName} está esperando un oponente.`);

                    if (ws.readyState === 1) {
                        ws.send(JSON.stringify({
                            type: 'waiting',
                            message: `Buscando oponente para ${playerName}... por favor espera.`
                        }));
                    }

                    // Configura un temporizador para limpiar al jugador en espera si no se encuentra oponente
                    waitingTimeout = setTimeout(() => {
                        fastify.log.info(`Timeout de espera para ${playerName}`);
                        clearWaitingPlayer('timeout');
                    }, 30000); // 30 segundos de espera

                } else {
                    // Si ya hay un jugador esperando, empareja a ambos
                    const player1 = waitingPlayerSocket;
                    const player2 = { id: playerName, ws: ws };

                    fastify.log.info(`Emparejando: ${player1.id} vs ${player2.id}`);

                    // Añade el nuevo juego a la lista de juegos activos
                    activeGames.push({ player1, player2 });

                    // Notifica a Player 1 que se encontró un oponente
                    if (player1.ws.readyState === 1) {
                        player1.ws.send(JSON.stringify({
                            type: 'opponentFound',
                            opponent: player2.id,
                            message: `¡Oponente encontrado! Tu oponente es ${player2.id}`
                        }));
                    }
                    fastify.log.info(`Enviado a ${player1.id}: Tu oponente es ${player2.id}`);

                    // Notifica a Player 2 que se encontró un oponente
                    if (player2.ws.readyState === 1) {
                        player2.ws.send(JSON.stringify({
                            type: 'opponentFound',
                            opponent: player1.id,
                            message: `¡Oponente encontrado! Tu oponente es ${player1.id}`
                        }));
                    }
                    fastify.log.info(`Enviado a ${player2.id}: Tu oponente es ${player1.id}`);

                    // Limpia el estado del jugador en espera, ya que ha sido emparejado
                    clearWaitingPlayer('matched');
                }
            }
            // Maneja mensajes relacionados con el juego (sincronización, inicio, fin, entrada del jugador)
            else if (["game_sync", "game_start", "game_end", "player_input"].includes(data.type)) {
                // Encuentra el juego activo al que pertenece este socket
                const game = activeGames.find(g => (g.player1.ws === ws || g.player2.ws === ws));
                if (game) {
                    // Determina quién es el oponente para reenviar el mensaje
                    const opponentWs = (game.player1.ws === ws) ? game.player2.ws : game.player1.ws;
                    // Reenvía el mensaje al oponente si su socket está abierto
                    if (opponentWs && opponentWs.readyState === 1) {
                        opponentWs.send(message.toString());
                    }
                }
            } else {
                // Mensajes de tipo desconocido o inválido
                fastify.log.warn(`Mensaje WebSocket inválido de ${playerName || tempConnectionId}: ${message.toString()}`);
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Tipo de mensaje desconocido o formato inválido.'
                    }));
                }
            }

        } catch (e) {
            // Manejo de errores al parsear mensajes JSON
            fastify.log.error(`Error al procesar mensaje WebSocket de ${playerName || tempConnectionId}: ${e.message}`);
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Formato de mensaje inválido o error interno del servidor.'
                }));
            }
            ws.close(); // Cierra la conexión en caso de error grave
        }
    });

    // Manejador para el cierre de la conexión WebSocket
    ws.on('close', () => {
        const disconnectedId = playerName || tempConnectionId;
        fastify.log.info(`WebSocket de ${disconnectedId} desconectado.`);

        // Si el jugador desconectado estaba en la cola de espera, límpialo
        if (waitingPlayerSocket && waitingPlayerSocket.ws === ws) {
            fastify.log.info(`El jugador ${waitingPlayerSocket.id} abandonó la cola de espera.`);
            clearWaitingPlayer('left');
        }
        // Si el jugador desconectado estaba en un juego activo, notifica al oponente y elimina el juego
        const gameIdx = activeGames.findIndex(g => g.player1.ws === ws || g.player2.ws === ws);
        if (gameIdx !== -1) {
            const game = activeGames[gameIdx];
            const opponentWs = (game.player1.ws === ws) ? game.player2.ws : game.player1.ws;
            if (opponentWs && opponentWs.readyState === 1) {
                opponentWs.send(JSON.stringify({ type: 'opponent_disconnected', message: 'Tu oponente se ha desconectado.' }));
            }
            activeGames.splice(gameIdx, 1); // Elimina el juego de la lista de activos
        }
    });

    // Manejador de errores del WebSocket
    ws.on('error', error => {
        const errorId = playerName || tempConnectionId;
        fastify.log.error(`Error en WebSocket de ${errorId}: ${error.message}`);

        // Las mismas acciones que en 'close' en caso de error
        if (waitingPlayerSocket && waitingPlayerSocket.ws === ws) {
            fastify.log.info(`El jugador ${waitingPlayerSocket.id} abandonó la cola por error.`);
            clearWaitingPlayer('error');
        }
        const gameIdx = activeGames.findIndex(g => g.player1.ws === ws || g.player2.ws === ws);
        if (gameIdx !== -1) {
            const game = activeGames[gameIdx];
            const opponentWs = (game.player1.ws === ws) ? game.player2.ws : game.player1.ws;
            if (opponentWs && opponentWs.readyState === 1) {
                opponentWs.send(JSON.stringify({ type: 'opponent_disconnected', message: 'Tu oponente se ha desconectado por error.' }));
            }
            activeGames.splice(gameIdx, 1);
        }
    });
});

// Ruta HTTP POST de ejemplo para probar la comunicación básica
fastify.post('/greet', async (request, reply) => {
    fastify.log.info('Petición HTTP POST recibida en /greet!');
    const { username } = request.body;

    if (username && typeof username === 'string' && username.trim()) {
        fastify.log.info(`Nombre de usuario recibido: ${username}`);
        return reply.code(200).send({
            message: `¡Hola, ${username}! Tu petición fue recibida.`
        });
    } else {
        fastify.log.warn('Petición recibida en /greet sin nombre de usuario válido.');
        return reply.code(400).send({
            error: 'El nombre de usuario es requerido en el cuerpo de la petición.'
        });
    }
});

// Función para iniciar el servidor Fastify
const start = async () => {
    try {
        // Escucha en todas las interfaces de red en el puerto 3000
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        fastify.log.info('El backend de emparejamiento con WebSocket está funcionando y esperando conexiones...');
        fastify.log.info('Esperando conexiones WebSocket en ws://localhost:3000/ws');
        fastify.log.info('Puedes probar la ruta HTTP POST en http://localhost:3000/greet con un cuerpo JSON {"username": "TuNombre"}');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1); // Sale del proceso con un código de error si falla al iniciar el servidor
    }
};

// Si este script es el módulo principal, inicia el servidor
if (require.main === module) {
    start();
}

// Exporta la función start para posibles pruebas o uso en otros módulos
module.exports = start;