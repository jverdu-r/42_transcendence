/**
 * Core game logic including players and game state management
 */
import type { IBall, IPaddle, IGameDimensions, IScore, IGameConfig, IPlayer, GameStatus, PlayerNumber } from '../interfaces/index.js';
import { GAME_STATUS } from '../constants/index.js';
import { v4 as uuidv4 } from 'uuid';

export class Game {
  private id: string;
  private name: string;
  private players: IPlayer[] = [];
  private status: GameStatus = GAME_STATUS.WAITING;

  constructor(name: string, dimensions: IGameDimensions, config: IGameConfig) {
    this.id = ''; // ID will be set externally by GameManager
    this.name = name;
  }

  public setId(id: string): void {
    this.id = id;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayers(): IPlayer[] {
    return this.players;
  }

  public addPlayer(player: IPlayer): boolean {
    if (this.players.length >= 2) {
      return false;
    }
    this.players.push(player);
    return true;
  }

  public removePlayer(playerId: string): boolean {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      return true;
    }
    return false;
  }

  public start(): boolean {
    if (this.players.length >= 2) {
      this.status = GAME_STATUS.PLAYING;
      return true;
    }
    return false;
  }

  public stop(): void {
    this.status = GAME_STATUS.FINISHED;
  }

  public handlePlayerInput(playerId: string, input: any): void {
    // Basic implementation
  }

  public getGameState(): any {
    return {
      id: this.id,
      name: this.name,
      players: this.players,
      status: this.status,
    };
  }
}
