/**
 * Tipos e interfaces para el chat service
 */

export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  roomId: string;
  type: 'text' | 'system' | 'join' | 'leave';
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'game' | 'private';
  users: Set<string>;
  messages: ChatMessage[];
  createdAt: Date;
  gameId?: string; // Para salas de juego específicas
}

export interface WebSocketMessage {
  type: 'join_room' | 'leave_room' | 'send_message' | 'get_users' | 'get_messages' | 'user_typing';
  data: any;
}

export interface ChatConnection {
  id: string;
  socket: any;
  userId: string;
  username: string;
  currentRoom?: string;
  lastActivity: Date;
}

export type ChatEventType = 
  | 'message_received' 
  | 'user_joined' 
  | 'user_left' 
  | 'user_typing' 
  | 'room_created' 
  | 'error';

export interface ChatEvent {
  type: ChatEventType;
  data: any;
  roomId?: string;
  timestamp: Date;
}
