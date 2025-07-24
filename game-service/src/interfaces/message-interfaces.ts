/**
 * WebSocket message interfaces - Enhanced for online multiplayer and spectator mode
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
    | 'playerDisconnected'
    | 'spectator_connected'
    | 'game_state'
    | 'pong'
    | 'playerMovement'
    | 'playerTimedOut'
    | 'gameUpdate'
    | 'gamesListUpdated';
  data?: any;
  gameId?: string;
  playerId?: string;
}

export interface IPlayerInput {
  type: InputType;
  direction?: MovementDirection;
  playerId: string;
  gameId: string;
  timestamp?: number;
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
  timestamp?: number;
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
  role?: 'player' | 'spectator';
}

export interface IErrorData {
  message: string;
}
