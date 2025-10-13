/**
 * Tipos e interfaces para el chat global simple
 */

export interface ChatUser {
  id: number;
  username: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id?: number;
  senderId: number;  // Cambiado de userId a senderId
  username?: string;
  content: string;
  timestamp: Date;
  type?: 'text' | 'system';
}

export interface WebSocketMessage {
  type: 'join_global' | 'send_message' | 'message_received' | 'user_joined' | 'user_left' | 'error' | 'history' | 'recent_messages' | 'new_message';
  data: any;
}

export interface ChatConnection {
  userId: number;
  username?: string;
  socket: any;
  connectedAt: Date;  // Cambiado de lastActivity a connectedAt
}

export type ChatEventType = 
  | 'message_received' 
  | 'user_joined' 
  | 'user_left' 
  | 'error';

export interface ChatEvent {
  type: ChatEventType;
  data: any;
  timestamp: Date;
}
