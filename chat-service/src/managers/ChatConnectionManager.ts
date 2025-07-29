/**
 * Gestor de conexiones WebSocket para chat
 */
import { v4 as uuidv4 } from 'uuid';
import type { ChatConnection, ChatUser } from '../types/chat-types.js';

export class ChatConnectionManager {
  private connections: Map<string, ChatConnection> = new Map();
  private userConnections: Map<string, string> = new Map(); // userId -> connectionId
  
  addConnection(socket: any, userId: string, username: string): string {
    const connectionId = uuidv4();
    
    const connection: ChatConnection = {
      id: connectionId,
      socket,
      userId,
      username,
      lastActivity: new Date()
    };
    
    this.connections.set(connectionId, connection);
    this.userConnections.set(userId, connectionId);
    
    console.log(`🔗 Nueva conexión: ${username} (${connectionId})`);
    return connectionId;
  }

  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    this.userConnections.delete(connection.userId);
    this.connections.delete(connectionId);
    
    console.log(`🔌 Conexión cerrada: ${connection.username} (${connectionId})`);
    return true;
  }

  getConnection(connectionId: string): ChatConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionByUserId(userId: string): ChatConnection | undefined {
    const connectionId = this.userConnections.get(userId);
    if (!connectionId) return undefined;
    return this.connections.get(connectionId);
  }

  updateLastActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  setCurrentRoom(connectionId: string, roomId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.currentRoom = roomId;
    }
  }

  getCurrentRoom(connectionId: string): string | undefined {
    const connection = this.connections.get(connectionId);
    return connection?.currentRoom;
  }

  sendToConnection(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== 1) { // WebSocket.OPEN = 1
      return false;
    }
    
    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error enviando mensaje a ${connectionId}:`, error);
      return false;
    }
  }

  sendToUser(userId: string, message: any): boolean {
    const connection = this.getConnectionByUserId(userId);
    if (!connection) return false;
    
    return this.sendToConnection(connection.id, message);
  }

  broadcastToUsers(userIds: string[], message: any): void {
    userIds.forEach(userId => {
      this.sendToUser(userId, message);
    });
  }

  getAllConnections(): ChatConnection[] {
    return Array.from(this.connections.values());
  }

  getOnlineUsers(): ChatUser[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.userId,
      username: conn.username,
      displayName: conn.username,
      isOnline: true,
      lastSeen: conn.lastActivity
    }));
  }

  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeUsers: this.userConnections.size
    };
  }

  // Limpiar conexiones inactivas (llamar periódicamente)
  cleanupInactiveConnections(timeoutMinutes: number = 30): number {
    const now = new Date();
    const timeout = timeoutMinutes * 60 * 1000;
    let cleaned = 0;
    
    for (const [connectionId, connection] of this.connections) {
      const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
      if (timeSinceActivity > timeout) {
        this.removeConnection(connectionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Limpiadas ${cleaned} conexiones inactivas`);
    }
    
    return cleaned;
  }
}
