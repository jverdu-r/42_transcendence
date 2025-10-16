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
  private broadcastCallback?: (gameId: string, message: any) => void;

  constructor(
    defaultConfig: IGameConfig = GameConfig.getDefaultConfig
      ? GameConfig.getDefaultConfig()
      : { maxScore: 5, ballSpeed: 6, paddleSpeed: 6, aiDifficulty: 'medium' },
    defaultDimensions: IGameDimensions = { width: 1280, height: 720 }
  ) {
    this.games = new Map();
    this.waitingPlayers = new Map();
    this.gameSpectators = new Map();
    this.defaultConfig = defaultConfig;
    this.defaultDimensions = defaultDimensions;
  }

  public setBroadcastCallback(cb: (gameId: string, message: any) => void) {
    this.broadcastCallback = cb;
  }
  public handlePlayerDisconnected(gameId: string, opts: { username?: string, playerNumber?: number } = {}): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const isStarted = typeof (game as any).isRunning === 'function' ? (game as any).isRunning() : false;
    if (isStarted) return; // solo queremos forfeit si aún NO empezó

    // Localizar al jugador que se fue
    const players = game.getPlayers?.() || [];
    let loser = players.find(p => p.name === opts.username);
    if (!loser && typeof opts.playerNumber === 'number') {
      loser = players.find(p => p.number === opts.playerNumber);
    }
    // Si no podemos identificar, como fallback: si hay exactamente 1 humano y 1 bot, el humano es el perdedor
    if (!loser) {
      const human = players.find(p => !p.isAI);
      if (human && players.some(p => p.isAI)) loser = human;
    }
    if (!loser) return;

    const winner = players.find(p => p.number !== loser!.number);
    const winnerNumber = winner?.number ?? (loser.number === 1 ? 2 : 1);

    // Ejecutar el forfeit (5-0) y cerrar partida
    void this.awardWinByForfeit(gameId, winnerNumber);
  }

  public createGame(
    playerName: string,
    mode: GameMode = 'pvp',
    aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): string {
    const gameId = uuidv4();
    const gameName = `Game ${gameId.substring(0, 8)}`;

    const game = new Game(gameName, this.defaultDimensions, this.defaultConfig);

    // Jugador humano
    const player: IPlayer = {
      id: uuidv4(),
      number: 1,
      isAI: false,
      isConnected: true,
      name: playerName,
    };

    game.setId(gameId);
    game.addPlayer(player);

    // PvE: añadir IA
    if (mode === 'pve') {
      const aiPlayer: IPlayer = {
        id: uuidv4(),
        number: 2,
        isAI: true,
        isConnected: true,
        name: `AI (${aiDifficulty})`,
      };
      game.addPlayer(aiPlayer);
      // Arrancar PvE y avisar al lobby
      void this.startGame(gameId);
      const started = game.start();
      if (started) {
        this.broadcastCallback?.(gameId, {
          type: 'gameStarted',
          data: { gameId }
        });
        // Si tu función no es async, NO uses await aquí (ver cambio D).
        // (La notificación a la API la gestiona otro flujo; evitamos type mismatch.)
      } else {
        console.warn(`⚠️ No se pudo iniciar PvE automáticamente (${gameId})`);
      }
    }

    // Registrar juego y broadcasting periódico de estado
    this.games.set(gameId, game);
    this.setupGameBroadcast(gameId);

    // 🔧 PvE debe arrancar y avisar al lobby
    if (mode === 'pve') {
      const started = game.start(); // o this.startGame(gameId) si prefieres reutilizar
      if (started) {
        // Emite el evento que espera el frontend para salir del "esperando..."
        this.broadcastCallback?.(gameId, {
          type: 'gameStarted',
          data: { gameId }
        });
      } else {
        console.log(`⚠️ No se pudo auto-iniciar PvE ${gameId}`);
      }
    }

    console.log(`✅ Game created: ${gameId} by ${playerName} (${mode}${mode === 'pve' ? `, AI: ${aiDifficulty}` : ''})`);
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
      if (!success) {
        console.log(`❌ Game ${gameId} is full`);
        return false;
      }

      console.log(`✅ Player ${playerName} joined game ${gameId}`);

      // Aviso al lobby (quién se unió y cuántos hay)
      try {
        const playersConnected = game.getPlayers()?.length ?? 1;
        this.broadcastCallback?.(gameId, {
          type: 'playerJoined',
          playersConnected,
          playerName,
          playerNumber: player.number,
        });
      } catch {}

      // 🔧 Auto-start si la sala contiene humano+bot y aún NO está en marcha (PvE)
      try {
        const players = game.getPlayers?.() || [];
        const hasHuman = players.some(p => !p.isAI);
        const hasAI    = players.some(p =>  p.isAI);
        const isRunning = typeof (game as any).isRunning === 'function'
          ? (game as any).isRunning()
          : false;

        if (hasHuman && hasAI && !isRunning) {
          void this.startGame(gameId); // emitirá 'gameStarted' y notificará a tu API
        }
      } catch {}

      return true;
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
      this.broadcastCallback?.(gameId, { type: 'gameStarted', data: { gameId } });
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

  private setupGameBroadcast(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || typeof (game as any).onScore !== 'function') return;

    (game as any).onScore((scorerId: string | null, teamName: string, pointNumber: number) => {
      this.broadcastCallback?.(gameId, {
        type: 'score',
        data: { scorerId, teamName, pointNumber }
      });
      // Si tienes una notifyScore con tipos estrictos y quieres usarla, dímelos y lo integro.
    });
  }

  private async awardWinByForfeit(gameId: string, winnerPlayerNumber: number): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    // Usa tus nombres de equipos; aquí asumimos 'Team A' (P1) y 'Team B' (P2)
    const winnerTeam = winnerPlayerNumber === 1 ? 'Team A' : 'Team B';

    // Enviar 5 tantos al backend (no bloquea al juego local)
    try {
      for (let i = 1; i <= 5; i++) {
        await notifyScore(gameId, null, winnerTeam, i);
      }
    } catch (e) {
      console.error('notifyScore (forfeit) failed:', e);
    }

    // Avisar fin al lobby + a tu API
    try {
      this.broadcastCallback?.(gameId, { type: 'gameFinished', data: { gameId, reason: 'forfeit' } });
    } catch {}
    try { await (notifyGameFinished as any)(gameId, { reason: 'forfeit' }); } catch {}

    // Limpieza motor si tiene finish()
    try { (game as any).finish?.(); } catch {}

    this.games.delete(gameId);
  }
}
