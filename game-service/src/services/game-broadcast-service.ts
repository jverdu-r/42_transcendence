/**
 * Game broadcasting service for WebSocket messages
 */
import type { IGameMessage, IPlayer } from '../interfaces/index.js';
import type { ConnectionService } from './connection-service.js';
import type { GameManager } from '../game/index.js';;

export class GameBroadcastService {
  constructor(
    private connectionService: ConnectionService,
    private gameManager: GameManager
  ) {}

  public broadcastToGame(gameId: string, message: IGameMessage): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) {
      return;
    }

    const players = game.getPlayers();
    players.forEach((player: IPlayer) => {
      if (player.isConnected && !player.isAI) {
        this.connectionService.sendToPlayer(player.id, message);
      }
    });
  }

  public broadcastToAllClients(message: IGameMessage): void {
    const connections = this.connectionService.getAllConnections();
    connections.forEach(({ clientId }) => {
      this.connectionService.sendToClient(clientId, message);
    });
  }

  public notifyPlayerJoined(gameId: string, playerName: string, playerNumber: number): void {
    this.broadcastToGame(gameId, {
      type: 'playerJoined',
      data: { playerName, playerNumber },
      gameId,
    });
  }

  public notifyPlayerLeft(gameId: string, playerId: string): void {
    this.broadcastToGame(gameId, {
      type: 'playerLeft',
      data: { playerId },
      gameId,
    });
  }

  public notifyPlayerDisconnected(gameId: string, playerId: string): void {
    this.broadcastToGame(gameId, {
      type: 'playerDisconnected',
      data: { playerId },
      gameId,
    });
  }

  public notifyGameStarted(gameId: string): void {
    this.broadcastToGame(gameId, {
      type: 'gameStarted',
      data: { gameId },
      gameId,
    });
  }

  public notifyGameState(gameId: string, gameState: any): void {
    this.broadcastToGame(gameId, {
      type: 'gameState',
      data: gameState,
      gameId,
    });
  }

  public notifyScore(gameId: string, score: any): void {
    this.broadcastToGame(gameId, {
      type: 'score',
      data: score,
      gameId,
    });
  }

  public notifyGameEnd(gameId: string, winner: any, finalScore: any): void {
    this.broadcastToGame(gameId, {
      type: 'gameEnd',
      data: { winner, finalScore },
      gameId,
    });
  }

  public sendError(clientId: string, errorMessage: string): void {
    this.connectionService.sendToClient(clientId, {
      type: 'error',
      data: { message: errorMessage },
    });
  }
}
