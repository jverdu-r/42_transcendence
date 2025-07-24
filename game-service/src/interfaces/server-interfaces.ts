/**
 * Server and API interfaces
 */
import type { IPlayer, GameStatus } from './game-interfaces.js';

export interface IServerConfig {
  port: number;
  host: string;
  maxPayload: number;
}

export interface IHealthResponse {
  status: string;
  service: string;
  timestamp: string;
  games: {
    total: number;
    active: number;
    waiting: number;
  };
}

export interface IStatsResponse {
  totalGames: number;
  activeGames: number;
  waitingGames: number;
  connectedClients: number;
}

export interface IGameApiResponse {
  id: string;
  nombre: string;
  jugadores: Array<{
    nombre: string;
    numero: number;
  }>;
  jugadoresConectados: number;
  capacidadMaxima: number;
  estado: GameStatus;
  tipoJuego: string;
  gameMode?: string;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IClientConnection {
  clientId: string;
  socket: any; // WebSocket type
}

export interface IPlayerMapping {
  playerId: string;
  clientId: string;
}
