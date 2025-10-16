/**
 * Enhanced Chat Service - WebSocket Server con todas las funcionalidades requeridas
 * - Mensajes directos (DMs)
 * - Sistema de bloqueo de usuarios
 * - Invitaciones a juegos
 * - Notificaciones de torneos
 * - Acceso a perfiles
 */
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import Database from 'better-sqlite3';

const fastify = Fastify({ logger: true });

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

// Almacenamiento en memoria para conexiones activas
const connections = new Map(); // userId -> { socket, username, connectedAt }
const onlineUsers = new Set<number>();

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

async function connectDatabase() {
    try {
        console.log('🔌 Conectando a SQLite en:', DB_PATH);
        db = new Database(DB_PATH);

        // Crear tablas si no existen
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NULL,
                message TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS blocked_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blocker_id INTEGER NOT NULL,
                blocked_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(blocker_id, blocked_id)
            );

            CREATE TABLE IF NOT EXISTS game_invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inviter_id INTEGER NOT NULL,
                invitee_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                game_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                responded_at DATETIME,
                FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Conectado a SQLite y tablas creadas/verificadas');
    } catch (error) {
        console.error('❌ Error conectando a SQLite:', error);
        throw error;
    }
}

// Obtener username de la BD
function getUsername(userId: number): string {
    try {
        const stmt = db.prepare(`SELECT username FROM users WHERE id = ?`);
        const user = stmt.get(userId) as any;
        return user?.username || `User${userId}`;
    } catch (error) {
        console.error('❌ Error obteniendo username:', error);
        return `User${userId}`;
    }
}

// Obtener información de usuario para perfil
function getUserProfile(userId: number): any {
    try {
        const stmt = db.prepare(`
            SELECT u.id, u.username, u.email, u.created_at,
                   up.avatar_url, up.language, up.difficulty
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        `);
        return stmt.get(userId);
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        return null;
    }
}

// Guardar mensaje en BD
function saveMessage(senderId: number, receiverId: number | null, message: string, messageType: string = 'text'): number {
    try {
        const stmt = db.prepare(`
            INSERT INTO chat_messages (sender_id, receiver_id, message, message_type)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(senderId, receiverId, message, messageType);
        return result.lastInsertRowid as number;
    } catch (error) {
        console.error('❌ Error guardando mensaje:', error);
        throw error;
    }
}

// Obtener mensajes globales recientes
function getRecentGlobalMessages(limit: number = 50): any[] {
    try {
        const stmt = db.prepare(`
            SELECT cm.id, cm.sender_id, cm.message, cm.message_type, cm.sent_at,
                   u.username
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.receiver_id IS NULL
            ORDER BY cm.sent_at DESC
            LIMIT ?
        `);
        const rows = stmt.all(limit) as any[];
        return rows.reverse().map(row => ({
            id: row.id,
            userId: row.sender_id,
            username: row.username,
            content: row.message,
            messageType: row.message_type,
            timestamp: row.sent_at
        }));
    } catch (error) {
        console.error('❌ Error obteniendo mensajes globales:', error);
        return [];
    }
}

// Obtener conversación privada entre dos usuarios
function getDirectMessages(userId1: number, userId2: number, limit: number = 50): any[] {
    try {
        const stmt = db.prepare(`
            SELECT cm.id, cm.sender_id, cm.receiver_id, cm.message, cm.message_type, 
                   cm.sent_at, cm.read_at, u.username
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE (cm.sender_id = ? AND cm.receiver_id = ?)
               OR (cm.sender_id = ? AND cm.receiver_id = ?)
            ORDER BY cm.sent_at DESC
            LIMIT ?
        `);
        const rows = stmt.all(userId1, userId2, userId2, userId1, limit) as any[];
        return rows.reverse().map(row => ({
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            username: row.username,
            content: row.message,
            messageType: row.message_type,
            timestamp: row.sent_at,
            read: !!row.read_at
        }));
    } catch (error) {
        console.error('❌ Error obteniendo mensajes directos:', error);
        return [];
    }
}

// Marcar mensajes como leídos
function markMessagesAsRead(userId: number, senderId: number): void {
    try {
        const stmt = db.prepare(`
            UPDATE chat_messages
            SET read_at = CURRENT_TIMESTAMP
            WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
        `);
        stmt.run(userId, senderId);
    } catch (error) {
        console.error('❌ Error marcando mensajes como leídos:', error);
    }
}

// Verificar si un usuario está bloqueado
function isBlocked(blockerId: number, blockedId: number): boolean {
    try {
        const stmt = db.prepare(`
            SELECT COUNT(*) as count
            FROM blocked_users
            WHERE blocker_id = ? AND blocked_id = ?
        `);
        const result = stmt.get(blockerId, blockedId) as any;
        return result.count > 0;
    } catch (error) {
        console.error('❌ Error verificando bloqueo:', error);
        return false;
    }
}

// Bloquear usuario
function blockUser(blockerId: number, blockedId: number): boolean {
    try {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id)
            VALUES (?, ?)
        `);
        const result = stmt.run(blockerId, blockedId);
        return result.changes > 0;
    } catch (error) {
        console.error('❌ Error bloqueando usuario:', error);
        return false;
    }
}

// Desbloquear usuario
function unblockUser(blockerId: number, blockedId: number): boolean {
    try {
        const stmt = db.prepare(`
            DELETE FROM blocked_users
            WHERE blocker_id = ? AND blocked_id = ?
        `);
        const result = stmt.run(blockerId, blockedId);
        return result.changes > 0;
    } catch (error) {
        console.error('❌ Error desbloqueando usuario:', error);
        return false;
    }
}

// Obtener lista de usuarios bloqueados
function getBlockedUsers(userId: number): any[] {
    try {
        const stmt = db.prepare(`
            SELECT u.id, u.username, bu.created_at
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = ?
            ORDER BY bu.created_at DESC
        `);
        return stmt.all(userId) as any[];
    } catch (error) {
        console.error('❌ Error obteniendo usuarios bloqueados:', error);
        return [];
    }
}

// Crear invitación de juego
function createGameInvitation(inviterId: number, inviteeId: number): number {
    try {
        const stmt = db.prepare(`
            INSERT INTO game_invitations (inviter_id, invitee_id, status)
            VALUES (?, ?, 'pending')
        `);
        const result = stmt.run(inviterId, inviteeId);
        return result.lastInsertRowid as number;
    } catch (error) {
        console.error('❌ Error creando invitación:', error);
        throw error;
    }
}

// Actualizar estado de invitación
function updateInvitationStatus(invitationId: number, status: string, gameId?: string): boolean {
    try {
        const stmt = db.prepare(`
            UPDATE game_invitations
            SET status = ?, responded_at = CURRENT_TIMESTAMP, game_id = ?
            WHERE id = ?
        `);
        const result = stmt.run(status, gameId || null, invitationId);
        return result.changes > 0;
    } catch (error) {
        console.error('❌ Error actualizando invitación:', error);
        return false;
    }
}

// Obtener invitaciones pendientes
function getPendingInvitations(userId: number): any[] {
    try {
        const stmt = db.prepare(`
            SELECT gi.id, gi.inviter_id, gi.created_at, u.username as inviter_username
            FROM game_invitations gi
            JOIN users u ON gi.inviter_id = u.id
            WHERE gi.invitee_id = ? AND gi.status = 'pending'
            ORDER BY gi.created_at DESC
        `);
        return stmt.all(userId) as any[];
    } catch (error) {
        console.error('❌ Error obteniendo invitaciones:', error);
        return [];
    }
}

// Obtener lista de usuarios online
function getOnlineUsersList(): any[] {
    const users: any[] = [];
    for (const userId of onlineUsers) {
        const profile = getUserProfile(userId);
        if (profile) {
            users.push({
                id: profile.id,
                username: profile.username,
                avatarUrl: profile.avatar_url
            });
        }
    }
    return users;
}

// ============================================
// FUNCIONES DE BROADCAST
// ============================================

function sendToUser(userId: number, type: string, data: any): boolean {
    const connection = connections.get(userId);
    if (connection && connection.socket.readyState === 1) { // OPEN
        try {
            connection.socket.send(JSON.stringify({ type, data }));
            return true;
        } catch (error) {
            console.error(`❌ Error enviando a usuario ${userId}:`, error);
            return false;
        }
    }
    return false;
}

function broadcastToAll(type: string, data: any, excludeUserId?: number): void {
    const message = JSON.stringify({ type, data });
    for (const [userId, connection] of connections) {
        if (excludeUserId && userId === excludeUserId) continue;
        try {
            if (connection.socket.readyState === 1) {
                connection.socket.send(message);
            }
        } catch (error) {
            console.warn(`⚠️ Error broadcasting a usuario ${userId}:`, error);
        }
    }
}

// ============================================
// ENDPOINTS HTTP
// ============================================

fastify.get('/', async (request, reply) => {
    return {
        service: 'enhanced-chat-service',
        message: 'Chat service with DMs, blocking, invitations, and profiles',
        onlineUsers: onlineUsers.size
    };
});

fastify.get('/online-users', async (request, reply) => {
    return {
        success: true,
        data: getOnlineUsersList()
    };
});

fastify.get('/blocked-users/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    return {
        success: true,
        data: getBlockedUsers(parseInt(userId))
    };
});

fastify.get('/invitations/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    return {
        success: true,
        data: getPendingInvitations(parseInt(userId))
    };
});

// ============================================
// WEBSOCKET
// ============================================

fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        const socket = connection.socket;
        console.log('🔌 Nueva conexión WebSocket');
        
        let userId: number | null = null;
        let username: string | null = null;

        socket.on('message', async (rawMessage) => {
            try {
                const message = JSON.parse(rawMessage.toString());
                console.log('📨 Mensaje recibido:', message.type);

                switch (message.type) {
                    // ===== CONEXIÓN Y AUTENTICACIÓN =====
                    case 'join':
                        userId = message.data?.userId;
                        if (!userId) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'userId requerido' }
                            }));
                            return;
                        }

                        username = getUsername(userId);
                        connections.set(userId, { socket, username, connectedAt: new Date() });
                        onlineUsers.add(userId);

                        // Enviar confirmación
                        socket.send(JSON.stringify({
                            type: 'joined',
                            data: {
                                userId,
                                username,
                                onlineUsers: getOnlineUsersList()
                            }
                        }));

                        // Enviar historial global
                        const globalMessages = getRecentGlobalMessages(50);
                        socket.send(JSON.stringify({
                            type: 'global_history',
                            data: globalMessages
                        }));

                        // Enviar invitaciones pendientes
                        const invitations = getPendingInvitations(userId);
                        if (invitations.length > 0) {
                            socket.send(JSON.stringify({
                                type: 'pending_invitations',
                                data: invitations
                            }));
                        }

                        // Notificar a otros
                        broadcastToAll('user_joined', {
                            userId,
                            username
                        }, userId);
                        break;

                    // ===== MENSAJES GLOBALES =====
                    case 'global_message':
                        if (!userId) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'No autenticado' }
                            }));
                            return;
                        }

                        const globalContent = message.data?.content;
                        if (!globalContent?.trim()) return;

                        const globalMsgId = saveMessage(userId, null, globalContent, 'text');
                        const globalMsgData = {
                            id: globalMsgId,
                            userId,
                            username,
                            content: globalContent,
                            messageType: 'text',
                            timestamp: new Date().toISOString()
                        };

                        broadcastToAll('new_global_message', globalMsgData);
                        break;

                    // ===== MENSAJES DIRECTOS =====
                    case 'direct_message':
                        if (!userId) return;

                        const receiverId = message.data?.receiverId;
                        const dmContent = message.data?.content;

                        if (!receiverId || !dmContent?.trim()) return;

                        // Verificar si el receptor ha bloqueado al remitente
                        if (isBlocked(receiverId, userId)) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'No puedes enviar mensajes a este usuario' }
                            }));
                            return;
                        }

                        const dmId = saveMessage(userId, receiverId, dmContent, 'text');
                        const dmData = {
                            id: dmId,
                            senderId: userId,
                            receiverId,
                            username,
                            content: dmContent,
                            messageType: 'text',
                            timestamp: new Date().toISOString()
                        };

                        // Enviar al receptor si está online
                        sendToUser(receiverId, 'new_direct_message', dmData);
                        // Confirmar al remitente
                        socket.send(JSON.stringify({
                            type: 'direct_message_sent',
                            data: dmData
                        }));
                        break;

                    // ===== OBTENER HISTORIAL DE CONVERSACIÓN =====
                    case 'get_conversation':
                        if (!userId) return;

                        const otherUserId = message.data?.userId;
                        if (!otherUserId) return;

                        const conversation = getDirectMessages(userId, otherUserId, 100);
                        socket.send(JSON.stringify({
                            type: 'conversation_history',
                            data: {
                                userId: otherUserId,
                                messages: conversation
                            }
                        }));

                        // Marcar como leídos
                        markMessagesAsRead(userId, otherUserId);
                        break;

                    // ===== BLOQUEO DE USUARIOS =====
                    case 'block_user':
                        if (!userId) return;

                        const blockedUserId = message.data?.userId;
                        if (!blockedUserId) return;

                        const blocked = blockUser(userId, blockedUserId);
                        socket.send(JSON.stringify({
                            type: 'user_blocked',
                            data: {
                                userId: blockedUserId,
                                success: blocked
                            }
                        }));
                        break;

                    case 'unblock_user':
                        if (!userId) return;

                        const unblockedUserId = message.data?.userId;
                        if (!unblockedUserId) return;

                        const unblocked = unblockUser(userId, unblockedUserId);
                        socket.send(JSON.stringify({
                            type: 'user_unblocked',
                            data: {
                                userId: unblockedUserId,
                                success: unblocked
                            }
                        }));
                        break;

                    // ===== INVITACIONES A JUEGOS =====
                    case 'invite_to_game':
                        if (!userId) return;

                        const inviteeId = message.data?.userId;
                        if (!inviteeId) return;

                        // Verificar que no esté bloqueado
                        if (isBlocked(inviteeId, userId)) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'No puedes invitar a este usuario' }
                            }));
                            return;
                        }

                        const invitationId = createGameInvitation(userId, inviteeId);
                        
                        // Notificar al invitado
                        sendToUser(inviteeId, 'game_invitation', {
                            id: invitationId,
                            inviterId: userId,
                            inviterUsername: username,
                            timestamp: new Date().toISOString()
                        });

                        // Confirmar al invitador
                        socket.send(JSON.stringify({
                            type: 'invitation_sent',
                            data: { invitationId, inviteeId }
                        }));
                        break;

                    case 'respond_invitation':
                        if (!userId) return;

                        const invId = message.data?.invitationId;
                        const accepted = message.data?.accepted;

                        if (!invId) return;

                        const status = accepted ? 'accepted' : 'declined';
                        updateInvitationStatus(invId, status);

                        // TODO: Si aceptó, crear partida y notificar
                        socket.send(JSON.stringify({
                            type: 'invitation_responded',
                            data: { invitationId: invId, status }
                        }));
                        break;

                    // ===== ACCESO A PERFILES =====
                    case 'get_user_profile':
                        const profileUserId = message.data?.userId;
                        if (!profileUserId) return;

                        const profile = getUserProfile(profileUserId);
                        socket.send(JSON.stringify({
                            type: 'user_profile',
                            data: profile
                        }));
                        break;

                    // ===== NOTIFICACIONES DE TORNEO =====
                    case 'tournament_notification':
                        // Este será llamado desde tournament-service
                        const tournamentData = message.data;
                        if (tournamentData?.userIds) {
                            tournamentData.userIds.forEach((uid: number) => {
                                sendToUser(uid, 'tournament_update', tournamentData);
                            });
                        }
                        break;

                    default:
                        console.log('⚠️ Tipo de mensaje desconocido:', message.type);
                }
            } catch (error) {
                console.error('❌ Error procesando mensaje:', error);
            }
        });

        socket.on('close', () => {
            if (userId) {
                connections.delete(userId);
                onlineUsers.delete(userId);
                
                broadcastToAll('user_left', {
                    userId,
                    username
                }, userId);
                
                console.log(`👋 Usuario ${userId} desconectado`);
            }
        });

        socket.on('error', (error) => {
            console.error('❌ Error en WebSocket:', error);
        });
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function start() {
    try {
        await connectDatabase();
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        console.log('🎉 Enhanced Chat Service iniciado en puerto 8000');
        console.log('📋 Funcionalidades:');
        console.log('   ✅ Mensajes globales');
        console.log('   ✅ Mensajes directos (DMs)');
        console.log('   ✅ Bloqueo de usuarios');
        console.log('   ✅ Invitaciones a juegos');
        console.log('   ✅ Notificaciones de torneo');
        console.log('   ✅ Acceso a perfiles');
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejo graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Cerrando servidor...');
    if (db) db.close();
    await fastify.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Cerrando servidor...');
    if (db) db.close();
    await fastify.close();
    process.exit(0);
});

start();
