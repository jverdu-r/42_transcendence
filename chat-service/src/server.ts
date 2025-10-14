/**
 * Chat Service - WebSocket Server con SQLite
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import Database from 'better-sqlite3';
import path from 'path';

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

// Base de datos SQLite
const DB_PATH = '/data/sqlite/app.db';
let db: any = null;

// Almacenamiento en memoria para conexiones
const connections = new Map();
const onlineUsers = new Set();

// Conectar a SQLite
async function connectDatabase() {
    try {
        console.log('🔌 Conectando a SQLite en:', DB_PATH);
        
        db = new Database(DB_PATH);

        // Crear tabla si no existe
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NULL,
                message TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Conectado a SQLite y tabla creada');
    } catch (error) {
        console.error('❌ Error conectando a SQLite:', error);
    }
}

// Guardar mensaje en SQLite
async function saveMessage(senderId: number, message: string): Promise<number> {
    try {
        const stmt = db.prepare(`
            INSERT INTO chat_messages (sender_id, message)
            VALUES (?, ?)
        `);
        
        const result = stmt.run(senderId, message);
        const messageId = result.lastInsertRowid as number;
        
        console.log(`📝 Mensaje guardado en SQLite: ID ${messageId}, sender: ${senderId}`);
        return messageId;
    } catch (error) {
        console.error('❌ Error guardando mensaje:', error);
        throw error;
    }
}

// Obtener username de la base de datos
function getUsername(userId: number): string {
    try {
        const stmt = db.prepare(`SELECT username FROM users WHERE id = ?`);
        const user = stmt.get(userId) as any;
        return user?.username || `Usuario${userId}`;
    } catch (error) {
        console.error('❌ Error obteniendo username:', error);
        return `Usuario${userId}`;
    }
}

// Obtener mensajes recientes
async function getRecentMessages(limit: number = 50): Promise<any[]> {
    try {
        const stmt = db.prepare(`
            SELECT id, sender_id, message, sent_at
            FROM chat_messages
            ORDER BY sent_at DESC
            LIMIT ?
        `);
        
        const rows = stmt.all(limit) as any[];
        
        const recentMessages = rows.reverse().map(row => ({
            id: row.id,
            userId: row.sender_id,
            username: getUsername(row.sender_id),
            content: row.message,
            timestamp: row.sent_at
        }));

        console.log(`📋 Obtenidos ${recentMessages.length} mensajes de SQLite`);
        return recentMessages;
    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        return [];
    }
}

// Endpoint de health check
fastify.get('/', async (request, reply) => {
    return { 
        service: 'chat-service-websocket', 
        message: 'Chat service with WebSocket and SQLite is running!',
        onlineUsers: onlineUsers.size
    };
});

// Endpoint de estadísticas
fastify.get('/stats', async (request, reply) => {
    return {
        success: true,
        data: {
            onlineUsers: onlineUsers.size,
            users: Array.from(onlineUsers)
        }
    };
});

// WebSocket para chat - Registrado directamente en fastify (no en plugin anidado)
fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection.socket;
    const remoteAddress = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || 'unknown';
    console.log('🔌 Nueva conexión WebSocket desde:', remoteAddress);
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
    
    let userId: number | null = null;
    let username: string | null = null;

        socket.on('message', async (message) => {
            console.log('📬 Mensaje RAW recibido:', message.toString().substring(0, 100));
            try {
                const data = JSON.parse(message.toString());
                console.log('📨 Mensaje WebSocket parseado:', data);

                switch (data.type) {
                    case 'join_global':
                        // Obtener userId del mensaje
                        userId = data.data?.userId || Math.floor(Math.random() * 1000) + 1;
                        
                        // Obtener username real de la base de datos
                        username = getUsername(userId);
                        
                        // Guardar conexión
                        connections.set(userId, { socket, username, connectedAt: new Date() });
                        onlineUsers.add(userId);
                        
                        console.log(`👤 Usuario ${userId} (${username}) conectado`);
                        
                        // Enviar confirmación
                        const joinResponse = {
                            type: 'join_global',
                            data: { 
                                success: true, 
                                userId, 
                                username,
                                message: 'Conectado al chat global' 
                            }
                        };
                        console.log('📤 Enviando confirmación join_global:', joinResponse);
                        socket.send(JSON.stringify(joinResponse));

                        // Enviar historial de mensajes
                        const recentMessages = await getRecentMessages(20);
                        if (recentMessages.length > 0) {
                            socket.send(JSON.stringify({
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
                                socket.send(JSON.stringify({
                                    type: 'error',
                                    data: { message: 'El mensaje no puede estar vacío' }
                                }));
                                return;
                            }
                            
                            // Guardar en SQLite
                            const messageId = await saveMessage(userId, content);
                            
                            // Crear mensaje para broadcast
                            const messageData = {
                                id: messageId,
                                userId,
                                username,
                                content,
                                timestamp: new Date().toISOString()
                            };

                            // Enviar a todos los usuarios conectados
                            broadcastToAll('new_message', messageData);
                            
                            console.log(`✅ Mensaje ${messageId} enviado a ${connections.size} usuarios`);
                        } else {
                            socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'Debes unirte primero al chat' }
                            }));
                        }
                        break;
                }
            } catch (error) {
                console.error('❌ Error procesando mensaje WebSocket:', error);
            }
        });

        socket.on('error', (error) => {
            console.error('❌ Error en WebSocket:', error);
        });

        socket.on('close', (code, reason) => {
            console.log(`🔌 WebSocket cerrado. Code: ${code}, Reason: ${reason || 'none'}, UserId: ${userId || 'unknown'}`);
            if (userId) {
                connections.delete(userId);
                onlineUsers.delete(userId);
                
                console.log(`👋 Usuario ${userId} desconectado`);
                
                // Notificar a otros usuarios
                broadcastToOthers(userId, 'user_left', {
                    userId,
                    username,
                    message: `${username} ha salido del chat`
                });
            }
        });
});

// Función para enviar mensaje a todos los usuarios
function broadcastToAll(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    
    for (const [userId, connection] of connections) {
        try {
            connection.socket.send(message);
        } catch (error) {
            console.warn(`⚠️ Error enviando a usuario ${userId}:`, error);
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
                console.warn(`⚠️ Error enviando a usuario ${userId}:`, error);
                connections.delete(userId);
                onlineUsers.delete(userId);
            }
        }
    }
}

// Iniciar servidor
async function start() {
    try {
        // Conectar a base de datos
        await connectDatabase();
        
        // Iniciar servidor
        await fastify.listen({ 
            port: 8000, 
            host: '0.0.0.0' 
        });
        console.log('🎉 Chat Service con WebSocket y SQLite iniciado en puerto 8000');
        console.log('🔗 WebSocket disponible en: ws://localhost:8003/ws');
    } catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Manejo graceful de cierre
process.on('SIGTERM', async () => {
    console.log('🛑 Cerrando servidor...');
    if (db) await db.close();
    await fastify.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Cerrando servidor...');
    if (db) await db.close();
    await fastify.close();
    process.exit(0);
});

start();
