/**
 * Game session management and lifecycle
 */
import { Game } from './game.js';
import type { IPlayer, IGameConfig, IGameDimensions, GameMode } from '../interfaces/index.js';
import { GameConfig } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private games: Map<string, Game>;
  private waitingPlayers: Map<string, IPlayer>;
  private defaultConfig: IGameConfig;
  private defaultDimensions: IGameDimensions;

  constructor() {
    this.games = new Map();
    this.waitingPlayers = new Map();
    this.defaultConfig = GameConfig.getDefaultConfig();
    this.defaultDimensions = GameConfig.getDefaultDimensions();
  }

  public createGame(playerName: string, mode: GameMode = 'pvp'): string {
    const gameId = uuidv4();
    const gameName = `Game ${gameId.substring(0, 8)}`;
    
    const game = new Game(
      gameName,
      this.defaultDimensions,
      this.defaultConfig
    );

    const player: IPlayer = {
      id: uuidv4(),
      number: 1,
      isAI: false,
      isConnected: true,
      name: playerName,
    };

    game.setId(gameId);
    game.addPlayer(player);
    this.games.set(gameId, game);

    console.log(`✅ Game created: ${gameId} by ${playerName}`);
    return gameId;
  }

  public joinGame(gameId: string, playerName: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Game not found: ${gameId}`);
      return false;
    }

    try {
      const player: IPlayer = {
        id: uuidv4(),
        number: 2,
        isAI: false,
        isConnected: true,
        name: playerName,
      };

      const success = game.addPlayer(player);
      if (success) {
        console.log(`✅ Player ${playerName} joined game ${gameId}`);
        return true;
      } else {
        console.log(`❌ Game ${gameId} is full`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Failed to join game ${gameId}: ${error}`);
      return false;
    }
  }

  public startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Game not found: ${gameId}`);
      return false;
    }

    try {
      const success = game.start();
      if (success) {
        console.log(`🎮 Game started: ${gameId}`);
        return true;
      } else {
        console.log(`❌ Cannot start game ${gameId}: insufficient players`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Failed to start game ${gameId}: ${error}`);
      return false;
    }
  }

  public stopGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Game not found: ${gameId}`);
      return false;
    }

    try {
      game.stop();
      console.log(`⏸️ Game stopped: ${gameId}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to stop game ${gameId}: ${error}`);
      return false;
    }
  }

  public removeGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Game not found: ${gameId}`);
      return false;
    }

    game.stop();
    this.games.delete(gameId);
    console.log(`🗑️ Game removed: ${gameId}`);
    return true;
  }

  public getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  public getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  public getGameCount(): number {
    return this.games.size;
  }

  public getActiveGames(): Game[] {
    return this.getAllGames().filter(game => game.getStatus() === 'playing');
  }

  public getWaitingGames(): Game[] {
    return this.getAllGames().filter(game => game.getStatus() === 'waiting');
  }

  public cleanup(): void {
    this.games.forEach(game => game.stop());
    this.games.clear();
    this.waitingPlayers.clear();
    console.log('🧹 GameManager cleaned up');
  }
}
