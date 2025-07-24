/**
 * Health check and statistics controller
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GameManager } from '../game/index.js';;
import type { ConnectionService } from '../services/index.js';
import type { IHealthResponse, IStatsResponse } from '../interfaces/index.js';

export class HealthController {
  constructor(
    private gameManager: GameManager,
    private connectionService: ConnectionService
  ) {}

  public async getHealthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const healthResponse: IHealthResponse = {
        status: 'ok',
        service: 'game-service',
        timestamp: new Date().toISOString(),
        games: {
          total: this.gameManager.getGameCount(),
          active: this.gameManager.getActiveGames().length,
          waiting: this.gameManager.getWaitingGames().length,
        },
      };

      reply.send(healthResponse);
    } catch (error) {
      reply.status(500).send({
        status: 'error',
        service: 'game-service',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  public async getStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const statsResponse: IStatsResponse = {
        totalGames: this.gameManager.getGameCount(),
        activeGames: this.gameManager.getActiveGames().length,
        waitingGames: this.gameManager.getWaitingGames().length,
        connectedClients: this.connectionService.getConnectionCount(),
      };

      reply.send(statsResponse);
    } catch (error) {
      reply.status(500).send({
        error: 'Failed to get statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
