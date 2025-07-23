/**
 * WebSocket message interfaces
 */
import type { GameMode, MovementDirection, InputType } from './game-interfaces.js';

export interface IGameMessage {
  type: 
    | 'connection' 
    | 'gameCreated' 
    | 'gameJoined' 
    | 'gameState' 
    | 'score' 
    | 'gameEnd' 
    | 'countdown' 
    | 'error' 
    | 'playerMove' 
    | 'playerJoined' 
    | 'gameStarted' 
    | 'gamesList' 
    | 'playerLeft' 
    | 'gameLeft' 
    | 'playerDisconnected';
  data?: any;
  gameId?: string;
  playerId?: string;
}

export interface IPlayerInput {
  type: InputType;
  direction?: MovementDirection;
  playerId: string;
  gameId: string;
}

export interface ICreateGameData {
  playerName: string;
  gameMode?: GameMode;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface IJoinGameData {
  gameId: string;
  playerName: string;
}

export interface IStartGameData {
  gameId: string;
}

export interface IPlayerMoveData {
  gameId: string;
  direction: MovementDirection;
}

export interface IGetGameStateData {
  gameId: string;
}

export interface ILeaveGameData {
  gameId: string;
}

export interface IConnectionData {
  clientId: string;
  gameId?: string;
  message: string;
}

export interface IErrorData {
  message: string;
}
