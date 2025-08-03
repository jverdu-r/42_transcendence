// game/game-manager.ts

import { Game } from './game.js';
import type { IPlayer, IGameConfig, IGameDimensions, GameMode, PlayerNumber } from '../interfaces/index.js';
import { GameConfig } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';
import { notifyGameStarted, notifyGameFinished, notifyScore } from '../services/game-api-client.js';
import { fetchUserId } from '../services/game-api-client.js';

export class GameManager {
  private games: Map<string, Game>;
  private waitingPlayers: Map<string, IPlayer>;
  private gameSpectators: Map<string, Set<string>>; // gameId -> Set of spectatorIds
  private defaultConfig: IGameConfig;
  private defaultDimensions: IGameDimensions;

  constructor() {
    this.games = new Map();
    this.waitingPlayers = new Map();
    this.gameSpectators = new Map();
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
        number: (game.getPlayers().length + 1) as PlayerNumber,
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

  public async startGame(gameId: string): Promise<boolean> {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Game not found: ${gameId}`);
      return false;
    }

    try {
      const success = game.start();
      if (!success) {
        console.log(`❌ Cannot start game ${gameId}: insufficient players`);
        return false;
      }

      const players = game.getPlayers();
      const player1 = players[0];
      const player2 = players[1];
      const player1Id = player1?.isAI ? null : await fetchUserId(player1?.name || '');
      const player2Id = player2?.isAI ? null : await fetchUserId(player2?.name || '');

      await notifyGameStarted({
        gameId,
        player1: {
          userId: player1Id,
          username: player1?.name || null,
          isBot: player1?.isAI || false,
          teamName: 'Team A'
        },
        player2: {
          userId: player2Id,
          username: player2?.name || null,
          isBot: player2?.isAI || false,
          teamName: 'Team B'
        },
        tournamentId: null,
        match: null
      });

      console.log(`🎮 Game started: ${gameId}`);
      return true;
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
    // Remove spectators too
    this.gameSpectators.delete(gameId);
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

  // NEW: Spectator management methods
  public addSpectator(gameId: string, spectatorId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ Cannot add spectator: Game ${gameId} not found`);
      return false;
    }

    if (!this.gameSpectators.has(gameId)) {
      this.gameSpectators.set(gameId, new Set());
    }

    this.gameSpectators.get(gameId)!.add(spectatorId);
    console.log(`👁️ Spectator ${spectatorId} added to game ${gameId}`);
    return true;
  }

  public removeSpectator(gameId: string, spectatorId: string): boolean {
    const spectators = this.gameSpectators.get(gameId);
    if (!spectators) {
      return false;
    }

    const removed = spectators.delete(spectatorId);
    if (spectators.size === 0) {
      this.gameSpectators.delete(gameId);
    }

    if (removed) {
      console.log(`👁️ Spectator ${spectatorId} removed from game ${gameId}`);
    }
    return removed;
  }

  public getSpectators(gameId: string): string[] {
    const spectators = this.gameSpectators.get(gameId);
    return spectators ? Array.from(spectators) : [];
  }

  public getSpectatorCount(gameId: string): number {
    const spectators = this.gameSpectators.get(gameId);
    return spectators ? spectators.size : 0;
  }

  public getAllSpectators(): Map<string, Set<string>> {
    return new Map(this.gameSpectators);
  }

  public canSpectate(gameId: string): boolean {
    const game = this.games.get(gameId);
    return game ? game.getStatus() === 'playing' : false;
  }

  public canJoin(gameId: string): boolean {
    const game = this.games.get(gameId);
    return game ? (game.getPlayers().length < 2 && game.getStatus() === 'waiting') : false;
  }

  // NEW: Enhanced game info for both players and spectators
  public getGameInfo(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    return {
      id: game.getId(),
      name: game.getName(),
      players: game.getPlayers(),
      spectators: this.getSpectatorCount(gameId),
      status: game.getStatus(),
      canJoin: this.canJoin(gameId),
      canSpectate: this.canSpectate(gameId),
      gameState: game.getGameState()
    };
  }

  // NEW: Get games suitable for spectating
  public getSpectableGames(): Game[] {
    return this.getAllGames().filter(game => this.canSpectate(game.getId()));
  }

  // NEW: Get games suitable for joining
  public getJoinableGames(): Game[] {
    return this.getAllGames().filter(game => this.canJoin(game.getId()));
  }

  public cleanup(): void {
    this.games.forEach(game => game.stop());
    this.games.clear();
    this.waitingPlayers.clear();
    this.gameSpectators.clear();
    console.log('🧹 GameManager cleaned up');
  }

  // NEW: Statistics for monitoring
  public getStatistics() {
    const totalSpectators = Array.from(this.gameSpectators.values())
      .reduce((sum, set) => sum + set.size, 0);

    return {
      totalGames: this.getGameCount(),
      activeGames: this.getActiveGames().length,
      waitingGames: this.getWaitingGames().length,
      spectableGames: this.getSpectableGames().length,
      joinableGames: this.getJoinableGames().length,
      totalSpectators,
      gamesWithSpectators: this.gameSpectators.size
    };
  }
}
