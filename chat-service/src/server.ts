/**
 * Chat Service - WebSocket Server para chat en tiempo real
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { ChatService } from './services/ChatService.js';

const fastify = Fastify({
    logger: true
});

// Instancia del servicio de chat
const chatService = new ChatService();

// Configurar CORS
fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Configurar WebSocket
fastify.register(fastifyWebsocket, {
    options: {
        maxPayload: 1048576, // 1MB
        verifyClient: (info: any) => {
            fastify.log.info('WebSocket client attempting to connect', { origin: info.origin });
            return true;
        }
    }
});

// Endpoint de health check
fastify.get('/', async (request, reply) => {
    return { 
        service: 'chat-service', 
        message: 'Chat service is running!',
        stats: chatService.getStats()
    };
});

// Endpoint de estadísticas
fastify.get('/stats', async (request, reply) => {
    return {
        success: true,
        data: chatService.getStats()
    };
});

// Endpoint WebSocket principal para chat
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, request: any) => {
        // Extraer información del usuario de los query parameters o headers
        const url = new URL(request.url, `http://${request.headers.host}`);
        const userId = url.searchParams.get('userId') || `user-${Date.now()}`;
        const username = url.searchParams.get('username') || `Usuario-${Date.now()}`;

        fastify.log.info(`🔗 Nueva conexión de chat: ${username} (${userId})`);

        // Registrar conexión en el servicio de chat
        const connectionId = chatService.handleNewConnection(connection.socket, userId, username);

        // Manejar mensajes entrantes
        connection.socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                fastify.log.info(`📨 Mensaje de chat de ${username}:`, data);
                
                await chatService.handleMessage(connectionId, data);
            } catch (error) {
                fastify.log.error('Error procesando mensaje de chat:', error);
                connection.socket.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Formato de mensaje inválido' }
                }));
            }
        });

        // Manejar desconexión
        connection.socket.on('close', () => {
            fastify.log.info(`🔌 Desconexión de chat: ${username} (${connectionId})`);
            chatService.handleDisconnection(connectionId);
        });

        connection.socket.on('error', (error) => {
            fastify.log.error(`❌ Error WebSocket en chat para ${username}:`, error);
            chatService.handleDisconnection(connectionId);
        });
    });
});

// Endpoint WebSocket para salas específicas de juego
fastify.register(async function (fastify) {
    fastify.get('/game/:gameId', { websocket: true }, (connection, request: any) => {
        const gameId = request.params.gameId;
        const url = new URL(request.url, `http://${request.headers.host}`);
        const userId = url.searchParams.get('userId') || `user-${Date.now()}`;
        const username = url.searchParams.get('username') || `Usuario-${Date.now()}`;

        fastify.log.info(`🎮 Conexión al chat de juego ${gameId}: ${username} (${userId})`);

        // Crear sala de juego si no existe
        const roomId = chatService.createGameRoom(gameId);
        
        // Registrar conexión
        const connectionId = chatService.handleNewConnection(connection.socket, userId, username);

        // Auto-unir a la sala del juego
        connection.socket.send(JSON.stringify({
            type: 'join_room',
            data: { roomId }
        }));

        // Manejar mensajes
        connection.socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                fastify.log.info(`📨 Mensaje de chat de juego ${gameId} de ${username}:`, data);
                
                await chatService.handleMessage(connectionId, data);
            } catch (error) {
                fastify.log.error('Error procesando mensaje de chat de juego:', error);
                connection.socket.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Formato de mensaje inválido' }
                }));
            }
        });

        // Manejar desconexión
        connection.socket.on('close', () => {
            fastify.log.info(`🔌 Desconexión del chat de juego ${gameId}: ${username}`);
            chatService.handleDisconnection(connectionId);
        });

        connection.socket.on('error', (error) => {
            fastify.log.error(`❌ Error WebSocket en chat de juego para ${username}:`, error);
            chatService.handleDisconnection(connectionId);
        });
    });
});

// API REST para gestión de salas (opcional)
fastify.get('/rooms', async (request, reply) => {
    return {
        success: true,
        data: {
            rooms: chatService.getStats()
        }
    };
});

// Limpiar conexiones inactivas cada 5 minutos
setInterval(() => {
    chatService.cleanup();
}, 5 * 60 * 1000);

// Iniciar servidor
const start = async () => {
    try {
        await fastify.listen({ 
            port: 8000, 
            host: '0.0.0.0' 
        });
        
        console.log('🚀 Chat Service iniciado correctamente');
        console.log('📡 WebSocket endpoints:');
        console.log('   - ws://localhost:8000/ws (chat global)');
        console.log('   - ws://localhost:8000/game/:gameId (chat por juego)');
        console.log('🌐 HTTP endpoints:');
        console.log('   - http://localhost:8000/ (health check)');
        console.log('   - http://localhost:8000/stats (estadísticas)');
        
    } catch (err) {
        fastify.log.error('❌ Error iniciando chat service:', err);
        process.exit(1);
    }
};

start();
