/**
 * Gestor de salas de chat
 */
import { v4 as uuidv4 } from 'uuid';
import type { ChatRoom, ChatMessage, ChatUser } from '../types/chat-types.js';

export class ChatRoomManager {
  private rooms: Map<string, ChatRoom> = new Map();
  
  constructor() {
    // Crear sala global por defecto
    this.createRoom('global', 'Chat Global', 'global');
  }

  createRoom(id: string, name: string, type: 'global' | 'game' | 'private', gameId?: string): ChatRoom {
    const room: ChatRoom = {
      id,
      name,
      type,
      users: new Set(),
      messages: [],
      createdAt: new Date(),
      gameId
    };
    
    this.rooms.set(id, room);
    console.log(`🏠 Sala creada: ${name} (${id})`);
    return room;
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomsForUser(userId: string): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(room => 
      room.users.has(userId)
    );
  }

  addUserToRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    room.users.add(userId);
    console.log(`👤 Usuario ${userId} se unió a ${room.name}`);
    return true;
  }

  removeUserFromRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    room.users.delete(userId);
    console.log(`👋 Usuario ${userId} salió de ${room.name}`);
    
    // Si es una sala de juego y no quedan usuarios, la eliminamos
    if (room.type === 'game' && room.users.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🗑️ Sala de juego ${roomId} eliminada (vacía)`);
    }
    
    return true;
  }

  addMessage(roomId: string, message: ChatMessage): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    room.messages.push(message);
    
    // Mantener solo los últimos 100 mensajes por sala
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }
    
    return true;
  }

  getRecentMessages(roomId: string, limit: number = 50): ChatMessage[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    return room.messages.slice(-limit);
  }

  getUsersInRoom(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room.users);
  }

  getAllRooms(): ChatRoom[] {
    return Array.from(this.rooms.values());
  }

  createGameRoom(gameId: string): ChatRoom {
    const roomId = `game-${gameId}`;
    return this.createRoom(roomId, `Partida ${gameId}`, 'game', gameId);
  }

  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      globalRooms: Array.from(this.rooms.values()).filter(r => r.type === 'global').length,
      gameRooms: Array.from(this.rooms.values()).filter(r => r.type === 'game').length,
      privateRooms: Array.from(this.rooms.values()).filter(r => r.type === 'private').length,
    };
  }
}
