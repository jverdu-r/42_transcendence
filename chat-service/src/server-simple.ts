/**
 * Chat Service Simple - WebSocket Server sin SQLite
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';

const fastify = Fastify({
    logger: true
});

// Configuración de CORS
fastify.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Registrar WebSocket
fastify.register(fastifyWebsocket);

// Almacenamiento en memoria para conexiones y mensajes
const connections = new Map();
const onlineUsers = new Set();
const messages: any[] = [];

// Endpoint de health check
fastify.get('/', async (request, reply) => {
    return { 
        service: 'chat-service-simple', 
        message: 'Chat service with WebSocket (in-memory) is running!',
        onlineUsers: onlineUsers.size,
        totalMessages: messages.length
    };
});

// Endpoint de estadísticas
fastify.get('/stats', async (request, reply) => {
    return {
        success: true,
        data: {
            onlineUsers: onlineUsers.size,
            users: Array.from(onlineUsers),
            totalMessages: messages.length
        }
    };
});

// WebSocket para chat
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        let userId: number | null = null;
        let username: string | null = null;

        socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                switch (data.type) {
                    case 'join_global':
                        // Usar datos del usuario
                        userId = data.data?.userId || Math.floor(Math.random() * 1000) + 1;
                        username = data.data?.username || `Usuario${userId}`;
                        
                        // Guardar conexión
                        connections.set(userId, { socket, username, connectedAt: new Date() });
                        onlineUsers.add(userId);
                        
                        // Enviar confirmación
                        (socket as any).send(JSON.stringify({
                            type: 'join_global',
                            data: { 
                                success: true, 
                                userId, 
                                username,
                                message: 'Conectado al chat global' 
                            }
                        }));

                        // Enviar historial de mensajes recientes
                        const recentMessages = messages.slice(-20).map(msg => ({
                            id: msg.id,
                            userId: msg.userId,
                            username: msg.username,
                            content: msg.content,
                            timestamp: msg.timestamp
                        }));

                        if (recentMessages.length > 0) {
                            (socket as any).send(JSON.stringify({
                                type: 'recent_messages',
                                data: recentMessages
                            }));
                        }

                        // Notificar a otros usuarios
                        broadcastToOthers(userId!, 'user_joined', {
                            userId,
                            username,
                            message: `${username} se ha unido al chat`
                        });
                        break;

                    case 'send_message':
                        if (userId && username) {
                            const content = data.data?.content;
                            
                            if (!content?.trim()) {
                                (socket as any).send(JSON.stringify({
                                    type: 'error',
                                    data: { message: 'El mensaje no puede estar vacío' }
                                }));
                                return;
                            }
                            
                            // Guardar en memoria
                            const messageId = messages.length + 1;
                            const messageData = {
                                id: messageId,
                                userId,
                                username,
                                content,
                                timestamp: new Date().toISOString()
                            };

                            messages.push(messageData);

                            // Enviar a todos los usuarios conectados
                            broadcastToAll('new_message', messageData);
                            
                        } else {
                            (socket as any).send(JSON.stringify({
                                type: 'error',
                                data: { message: 'Debes unirte primero al chat' }
                            }));
                        }
                        break;

                    case 'get_history':
                        // Enviar historial completo
                        const allMessages = messages.map(msg => ({
                            id: msg.id,
                            userId: msg.userId,
                            username: msg.username,
                            content: msg.content,
                            timestamp: msg.timestamp
                        }));

                        (socket as any).send(JSON.stringify({
                            type: 'recent_messages',
                            data: allMessages
                        }));
                        break;
                }
            } catch (error) {
                console.error('❌ Error procesando mensaje WebSocket:', error);
            }
        });

        socket.on('close', () => {
            if (userId) {
                connections.delete(userId);
                onlineUsers.delete(userId);
                
                // Notificar a otros usuarios
                broadcastToOthers(userId, 'user_left', {
                    userId,
                    username,
                    message: `${username} ha salido del chat`
                });
            }
        });
    });
});

// Función para enviar mensaje a todos los usuarios
function broadcastToAll(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    
    for (const [userId, connection] of connections) {
        try {
            connection.socket.send(message);
        } catch (error) {
            connections.delete(userId);
            onlineUsers.delete(userId);
        }
    }
}

// Función para enviar mensaje a todos excepto al remitente
function broadcastToOthers(excludeUserId: number, type: string, data: any) {
    const message = JSON.stringify({ type, data });
    
    for (const [userId, connection] of connections) {
        if (userId !== excludeUserId) {
            try {
                connection.socket.send(message);
            } catch (error) {
                connections.delete(userId);
                onlineUsers.delete(userId);
            }
        }
    }
}

// Iniciar servidor
async function start() {
    try {
        console.log('🚀 Iniciando Chat Service Simple (sin SQLite)...');
        
        // Iniciar servidor
        await fastify.listen({ 
            port: 8000, 
            host: '0.0.0.0' 
        });
        console.log('🎉 Chat Service Simple iniciado en puerto 8000');
        console.log('🔗 WebSocket disponible en: ws://localhost:8003/ws');
        console.log('💾 Almacenamiento: En memoria (temporal)');
    } catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Manejo graceful de cierre
process.on('SIGTERM', async () => {
    console.log('🛑 Cerrando servidor...');
    await fastify.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Cerrando servidor...');
    await fastify.close();
    process.exit(0);
});

start();
