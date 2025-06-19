// src/app.js
const fastify = require('fastify')({
    logger: true // Mantener el logger para ver mensajes en consola detallados
});

// 1. Registrar CORS para que el frontend pueda conectar
fastify.register(require('@fastify/cors'), {
  origin: '*', // Permite cualquier origen (para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// 2. Registrar el plugin de WebSocket para Fastify
fastify.register(require('@fastify/websocket'));

// Variable para almacenar el jugador que está esperando
// Ahora almacenará el objeto 'socket' de WebSocket del jugador.
let waitingPlayerSocket = null; 

// --- NUEVA RUTA DE WEBSOCKET PARA EMPAREJAMIENTO ---
// La ruta '/ws/join-game' será la puerta de entrada para las conexiones WebSocket
fastify.get('/ws/join-game', { websocket: true }, (connection, req) => {
    // 'connection' es un objeto que contiene el socket de WebSocket (connection.socket)
    const ws = connection.socket;
    
    // Asigna un ID temporal único para propósitos de logueo inicial,
    // el nombre real se recibirá en el primer mensaje.
    const tempPlayerId = `ConexionWS_${Math.random().toString(36).substring(7)}`; 
    fastify.log.info(`Nueva conexión WebSocket entrante: ${tempPlayerId}`);

    // Cuando el cliente envía un mensaje (aquí esperamos que envíe su nombre)
    ws.on('message', message => {
        let playerName;
        try {
            const data = JSON.parse(message.toString());
            playerName = data.name; // Esperamos que el cliente envíe { name: "TuNombre" }

            if (!playerName) {
                ws.send(JSON.stringify({ type: 'error', message: 'El nombre del jugador es requerido.' }));
                ws.close();
                return;
            }

            fastify.log.info(`Mensaje de WebSocket recibido de ${playerName}: ${message.toString()}`);

            if (waitingPlayerSocket === null) {
                // Si no hay nadie esperando, este jugador se convierte en el jugador en espera
                waitingPlayerSocket = { id: playerName, ws: ws }; // Almacenamos el nombre y el socket
                fastify.log.info(`${playerName} está esperando un oponente.`);
                
                // Envía un mensaje de confirmación al jugador que espera
                ws.send(JSON.stringify({ type: 'status', message: `Buscando oponente para ${playerName}... por favor espera.` }));

            } else {
                // Si ya hay un jugador esperando, emparejamos a los dos
                const player1 = waitingPlayerSocket; // El jugador que estaba esperando
                const player2 = { id: playerName, ws: ws }; // El jugador que acaba de llegar

                fastify.log.info(`Emparejando: ${player1.id} y ${player2.id}`);

                // Envía la notificación al primer jugador vía su WebSocket
                // ¡Ambos recibirán su oponente a través del WebSocket!
                player1.ws.send(JSON.stringify({ type: 'opponentFound', opponent: player2.id, message: `¡Oponente encontrado! Tu oponente es ${player2.id}` }));
                
                // Envía la notificación al segundo jugador vía su WebSocket
                player2.ws.send(JSON.stringify({ type: 'opponentFound', opponent: player1.id, message: `¡Oponente encontrado! Tu oponente es ${player1.id}` }));

                // Una vez emparejados, limpiamos la variable de jugador esperando
                waitingPlayerSocket = null;
            }

        } catch (e) {
            fastify.log.error(`Error al procesar mensaje de WebSocket (de ${playerName || tempPlayerId}): ${e.message}`);
            ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensaje inválido o error interno.' }));
            ws.close();
        }
    });

    // Manejar la desconexión de un jugador
    ws.on('close', () => {
        fastify.log.info(`WebSocket de ${tempPlayerId} (cerrado para ${waitingPlayerSocket?.id || 'desconocido'}) desconectado.`);
        // Si el jugador desconectado era el que estaba esperando, lo quitamos de la cola
        if (waitingPlayerSocket && waitingPlayerSocket.ws === ws) {
            fastify.log.info(`El jugador ${waitingPlayerSocket.id} abandonó la cola de espera.`);
            waitingPlayerSocket = null;
        }
    });

    // Manejar errores del socket
    ws.on('error', error => {
        fastify.log.error(`Error en WebSocket de ${tempPlayerId} (de ${waitingPlayerSocket?.id || 'desconocido'}): ${error.message}`);
        // Similar al close, si es el jugador esperando, lo quitamos de la cola
        if (waitingPlayerSocket && waitingPlayerSocket.ws === ws) {
            fastify.log.info(`El jugador ${waitingPlayerSocket.id} abandonó la cola por error.`);
            waitingPlayerSocket = null;
        }
    });
});

// Ruta GET simple existente (se mantiene para referencia)
fastify.get('/saludar/:name', async (request, reply) => {
    const { name } = request.params;
    fastify.log.info(`¡Petición GET recibida en /saludar/${name}!`);
    fastify.log.info(`El nombre recibido es: ${name}`);
    return { message: `¡Hola, ${name}! Tu petición fue recibida.` };
});

// Función para iniciar el servidor de Fastify
const start = async () => {
    try {
      await fastify.listen({ port: 3000, host: '0.0.0.0' });
      fastify.log.info('El backend de Pong está funcionando y esperando peticiones...');
      fastify.log.info('Esperando conexiones WebSocket en ws://localhost:3000/ws/join-game');
    } catch (err) {
      fastify.log.error(err); // Registra cualquier error al iniciar el servidor
      process.exit(1); // Sale del proceso con un código de error
    }
};

// Si este archivo es el punto de entrada principal, inicia el servidor
if (require.main === module) {
    start();
}

// Exporta la función start (útil para tests o integración)
module.exports = start;