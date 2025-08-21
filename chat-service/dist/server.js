/**
 * Chat Service - WebSocket Server para chat global simple
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { GlobalChatService } from './services/GlobalChatService.js';
const fastify = Fastify({
    logger: true
});
// Instancia del servicio de chat global
const globalChatService = new GlobalChatService();
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
        verifyClient: (info) => {
            fastify.log.info('WebSocket client attempting to connect', { origin: info.origin });
            return true;
        }
    }
});
// Endpoint de health check
fastify.get('/', async (request, reply) => {
    return {
        service: 'chat-service-global',
        message: 'Global chat service is running!',
        onlineUsers: globalChatService.getOnlineUsersCount()
    };
});
// Endpoint de estadísticas
fastify.get('/stats', async (request, reply) => {
    return {
        success: true,
        data: {
            onlineUsers: globalChatService.getOnlineUsersCount(),
            users: globalChatService.getOnlineUsers()
        }
    };
});
// WebSocket endpoint para chat global
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, request) => {
        let userId = null;
        let username = null;
        console.log('🔌 Nueva conexión WebSocket al chat global');
        socket.on('message', async (messageBuffer) => {
            try {
                const messageStr = messageBuffer.toString();
                const message = JSON.parse(messageStr);
                console.log('📨 Mensaje recibido:', message);
                switch (message.type) {
                    case 'join_global':
                        // Por ahora, asignar un ID temporal y username
                        // TODO: Obtener del token JWT cuando auth-service funcione
                        userId = message.data?.userId || Math.floor(Math.random() * 1000) + 1;
                        username = message.data?.username || `Usuario${userId}`;
                        await globalChatService.addConnection(userId, username, socket.socket);
                        socket.socket.send(JSON.stringify({
                            type: 'join_global',
                            data: {
                                success: true,
                                userId,
                                username,
                                message: 'Conectado al chat global'
                            }
                        }));
                        break;
                    case 'send_message':
                        if (userId && username) {
                            await globalChatService.handleMessage(userId, message.data.content);
                        }
                        else {
                            socket.socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'Debes unirte al chat primero' }
                            }));
                        }
                        break;
                    default:
                        socket.socket.send(JSON.stringify({
                            type: 'error',
                            data: { message: `Tipo de mensaje no soportado: ${message.type}` }
                        }));
                }
            }
            catch (error) {
                console.error('❌ Error procesando mensaje WebSocket:', error);
                socket.socket.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Error procesando mensaje' }
                }));
            }
        });
        socket.on('close', () => {
            console.log('🔌 Conexión WebSocket cerrada');
            if (userId) {
                globalChatService.removeConnection(userId);
            }
        });
        socket.on('error', (error) => {
            console.error('❌ Error en WebSocket:', error);
            if (userId) {
                globalChatService.removeConnection(userId);
            }
        });
    });
});
// Inicializar el servicio y arrancar el servidor
async function start() {
    try {
        console.log('🚀 Iniciando Chat Service Global...');
        // Inicializar el servicio de chat
        await globalChatService.initialize();
        // Arrancar el servidor
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        console.log('🎉 Chat Service Global iniciado en puerto 8000');
        console.log('🔗 WebSocket disponible en: ws://localhost:8003/ws');
    }
    catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}
// Manejo graceful de cierre
process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
    await globalChatService.cleanup();
    await fastify.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
    await globalChatService.cleanup();
    await fastify.close();
    process.exit(0);
});
