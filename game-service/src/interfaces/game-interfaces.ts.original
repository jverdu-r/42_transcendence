/**
 * Core game interfaces and types
 */
export interface IBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

export interface IPaddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface IGameDimensions {
  width: number;
  height: number;
}

export interface IScore {
  player1: number;
  player2: number;
}

export interface IGameConfig {
  maxScore: number;
  ballSpeed: number;
  paddleSpeed: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

export interface IPlayer {
  id: string;
  number: 1 | 2;
  isAI: boolean;
  isConnected: boolean;
  name?: string;
}

export interface IGameStats {
  gameId: string;
  duration: number;
  totalRallies: number;
  maxRally: number;
  winner: 1 | 2 | null;
  finalScore: IScore;
  players: IPlayer[];
}

export type GameMode = 'pvp' | 'pve' | 'multiplayer' | 'tournament';
export type GameStatus = 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
export type MovementDirection = 'up' | 'down' | 'stop';
export type InputType = 'move' | 'pause' | 'resume';
export type PlayerNumber = 1 | 2;
