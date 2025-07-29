/**
 * Servicio principal de chat
 */
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, WebSocketMessage, ChatEvent } from '../types/chat-types.js';
import { ChatRoomManager } from '../managers/ChatRoomManager.js';
import { ChatConnectionManager } from '../managers/ChatConnectionManager.js';

export class ChatService {
  private roomManager: ChatRoomManager;
  private connectionManager: ChatConnectionManager;

  constructor() {
    this.roomManager = new ChatRoomManager();
    this.connectionManager = new ChatConnectionManager();
  }

  // Manejar nueva conexión WebSocket
  handleNewConnection(socket: any, userId: string, username: string): string {
    const connectionId = this.connectionManager.addConnection(socket, userId, username);
    
    // Auto-unir a la sala global
    this.joinRoom(connectionId, 'global');
    
    // Enviar bienvenida
    this.connectionManager.sendToConnection(connectionId, {
      type: 'welcome',
      data: {
        connectionId,
        userId,
        username,
        message: 'Conectado al chat'
      }
    });

    // Notificar a otros usuarios
    this.broadcastToRoom('global', {
      type: 'user_joined',
      data: {
        userId,
        username,
        message: `${username} se ha conectado`
      }
    }, connectionId);

    return connectionId;
  }

  // Manejar desconexión
  handleDisconnection(connectionId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { userId, username, currentRoom } = connection;

    // Salir de la sala actual
    if (currentRoom) {
      this.leaveRoom(connectionId, currentRoom);
    }

    // Notificar desconexión
    this.broadcastToRoom('global', {
      type: 'user_left',
      data: {
        userId,
        username,
        message: `${username} se ha desconectado`
      }
    }, connectionId);

    this.connectionManager.removeConnection(connectionId);
  }

  // Manejar mensajes WebSocket
  async handleMessage(connectionId: string, messageData: WebSocketMessage): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    this.connectionManager.updateLastActivity(connectionId);

    switch (messageData.type) {
      case 'send_message':
        await this.handleSendMessage(connectionId, messageData.data);
        break;
      case 'join_room':
        await this.handleJoinRoom(connectionId, messageData.data);
        break;
      case 'leave_room':
        await this.handleLeaveRoom(connectionId, messageData.data);
        break;
      case 'get_users':
        await this.handleGetUsers(connectionId, messageData.data);
        break;
      case 'get_messages':
        await this.handleGetMessages(connectionId, messageData.data);
        break;
      case 'user_typing':
        await this.handleUserTyping(connectionId, messageData.data);
        break;
      default:
        this.sendError(connectionId, `Tipo de mensaje desconocido: ${messageData.type}`);
    }
  }

  private async handleSendMessage(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.currentRoom) {
      this.sendError(connectionId, 'No estás en ninguna sala');
      return;
    }

    const { message } = data;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      this.sendError(connectionId, 'Mensaje vacío');
      return;
    }

    // Crear mensaje
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      userId: connection.userId,
      username: connection.username,
      message: message.trim().slice(0, 500), // Límite de 500 caracteres
      timestamp: new Date(),
      roomId: connection.currentRoom,
      type: 'text'
    };

    // Guardar mensaje
    this.roomManager.addMessage(connection.currentRoom, chatMessage);

    // Broadcast a la sala
    this.broadcastToRoom(connection.currentRoom, {
      type: 'message_received',
      data: chatMessage
    });
  }

  private async handleJoinRoom(connectionId: string, data: any): Promise<void> {
    const { roomId } = data;
    if (!roomId) {
      this.sendError(connectionId, 'ID de sala requerido');
      return;
    }

    this.joinRoom(connectionId, roomId);
  }

  private async handleLeaveRoom(connectionId: string, data: any): Promise<void> {
    const { roomId } = data;
    if (!roomId) {
      this.sendError(connectionId, 'ID de sala requerido');
      return;
    }

    this.leaveRoom(connectionId, roomId);
  }

  private async handleGetUsers(connectionId: string, data: any): Promise<void> {
    const { roomId } = data;
    const room = roomId ? this.roomManager.getRoom(roomId) : null;
    const targetRoomId = roomId || this.connectionManager.getCurrentRoom(connectionId);

    if (!targetRoomId) {
      this.sendError(connectionId, 'Sala no especificada');
      return;
    }

    const userIds = this.roomManager.getUsersInRoom(targetRoomId);
    const users = this.connectionManager.getOnlineUsers().filter(user => 
      userIds.includes(user.id)
    );

    this.connectionManager.sendToConnection(connectionId, {
      type: 'users_list',
      data: {
        roomId: targetRoomId,
        users
      }
    });
  }

  private async handleGetMessages(connectionId: string, data: any): Promise<void> {
    const { roomId, limit = 50 } = data;
    const targetRoomId = roomId || this.connectionManager.getCurrentRoom(connectionId);

    if (!targetRoomId) {
      this.sendError(connectionId, 'Sala no especificada');
      return;
    }

    const messages = this.roomManager.getRecentMessages(targetRoomId, limit);

    this.connectionManager.sendToConnection(connectionId, {
      type: 'messages_history',
      data: {
        roomId: targetRoomId,
        messages
      }
    });
  }

  private async handleUserTyping(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.currentRoom) return;

    const { isTyping } = data;

    this.broadcastToRoom(connection.currentRoom, {
      type: 'user_typing',
      data: {
        userId: connection.userId,
        username: connection.username,
        isTyping: !!isTyping
      }
    }, connectionId);
  }

  // Funciones auxiliares
  private joinRoom(connectionId: string, roomId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    // Salir de sala anterior si existe
    if (connection.currentRoom) {
      this.leaveRoom(connectionId, connection.currentRoom);
    }

    // Crear sala si no existe (para salas de juego)
    if (!this.roomManager.getRoom(roomId)) {
      if (roomId.startsWith('game-')) {
        const gameId = roomId.replace('game-', '');
        this.roomManager.createGameRoom(gameId);
      } else {
        this.sendError(connectionId, 'Sala no encontrada');
        return;
      }
    }

    // Unirse a la nueva sala
    this.roomManager.addUserToRoom(roomId, connection.userId);
    this.connectionManager.setCurrentRoom(connectionId, roomId);

    // Confirmar unión
    this.connectionManager.sendToConnection(connectionId, {
      type: 'room_joined',
      data: {
        roomId,
        roomName: this.roomManager.getRoom(roomId)?.name
      }
    });

    // Notificar a otros en la sala
    this.broadcastToRoom(roomId, {
      type: 'user_joined_room',
      data: {
        userId: connection.userId,
        username: connection.username,
        roomId
      }
    }, connectionId);
  }

  private leaveRoom(connectionId: string, roomId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    this.roomManager.removeUserFromRoom(roomId, connection.userId);
    
    if (connection.currentRoom === roomId) {
      this.connectionManager.setCurrentRoom(connectionId, '');
    }

    // Notificar salida
    this.broadcastToRoom(roomId, {
      type: 'user_left_room',
      data: {
        userId: connection.userId,
        username: connection.username,
        roomId
      }
    }, connectionId);
  }

  private broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string): void {
    const userIds = this.roomManager.getUsersInRoom(roomId);
    const targetUsers = excludeConnectionId 
      ? userIds.filter(userId => {
          const conn = this.connectionManager.getConnectionByUserId(userId);
          return conn?.id !== excludeConnectionId;
        })
      : userIds;

    this.connectionManager.broadcastToUsers(targetUsers, message);
  }

  private sendError(connectionId: string, message: string): void {
    this.connectionManager.sendToConnection(connectionId, {
      type: 'error',
      data: { message }
    });
  }

  // API pública para crear sala de juego
  createGameRoom(gameId: string): string {
    const room = this.roomManager.createGameRoom(gameId);
    return room.id;
  }

  // Estadísticas
  getStats() {
    return {
      ...this.connectionManager.getConnectionStats(),
      ...this.roomManager.getRoomStats()
    };
  }

  // Limpiar conexiones inactivas
  cleanup(): void {
    this.connectionManager.cleanupInactiveConnections();
  }
}
