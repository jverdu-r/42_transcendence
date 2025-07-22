/**
 * REST API controller for game management
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GameManager } from '../game/index.js';;
import type { ApiResponseService } from '../services/index.js';
import { GameValidators } from '../validators/index.js';
import { GAME_MODES } from '../constants/index.js';

interface CreateGameRequest {
  Body: {
    playerName?: string;
    gameMode?: string;
    aiDifficulty?: string;
    nombre?: string;
    maxPlayers?: number;
  };
}

interface JoinGameRequest {
  Params: {
    gameId: string;
  };
  Body: {
    playerName: string;
  };
}

interface GetGameRequest {
  Params: {
    gameId: string;
  };
}

export class ApiController {
  constructor(
    private fastify: FastifyInstance,
    private gameManager: GameManager,
    private apiResponseService: ApiResponseService
  ) {}

  public async getAllGames(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const allGames = this.gameManager.getAllGames();
      const response = this.apiResponseService.createGamesListResponse(allGames);
      
      reply.send(response);
    } catch (error) {
      this.fastify.log.error('Error getting games:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to get games list');
      reply.status(500).send(errorResponse);
    }
  }

  public async getGameById(request: FastifyRequest<GetGameRequest>, reply: FastifyReply): Promise<void> {
    try {
      const { gameId } = request.params;
      
      if (!GameValidators.validateGameId(gameId)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid game ID');
        reply.status(400).send(errorResponse);
        return;
      }

      const game = this.gameManager.getGame(gameId);
      
      if (!game) {
        const errorResponse = this.apiResponseService.createErrorResponse('Game not found');
        reply.status(404).send(errorResponse);
        return;
      }
      
      const response = this.apiResponseService.createGameResponse(game);
      reply.send(response);
    } catch (error) {
      this.fastify.log.error('Error getting game:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to get game');
      reply.status(500).send(errorResponse);
    }
  }

  public async createGame(request: FastifyRequest<CreateGameRequest>, reply: FastifyReply): Promise<void> {
    try {
      const { playerName, gameMode = GAME_MODES.PVP, aiDifficulty = 'medium', nombre, maxPlayers = 2 } = request.body || {};
      
      // Use provided name or generate a default
      const finalPlayerName = playerName || nombre || 'Jugador1';
      
      if (!GameValidators.validatePlayerName(finalPlayerName)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid player name');
        reply.status(400).send(errorResponse);
        return;
      }

      if (!GameValidators.validateGameMode(gameMode)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid game mode');
        reply.status(400).send(errorResponse);
        return;
      }

      const sanitizedPlayerName = GameValidators.sanitizePlayerName(finalPlayerName);
      const gameId = this.gameManager.createGame(sanitizedPlayerName, gameMode);
      const game = this.gameManager.getGame(gameId);
      
      if (game) {
        const formattedGame = this.apiResponseService.formatGameForApi(game);
        const gameWithMode = { ...formattedGame, gameMode, capacidadMaxima: maxPlayers };
        
        reply.send(gameWithMode);
      } else {
        const errorResponse = this.apiResponseService.createErrorResponse('Failed to create game');
        reply.status(500).send(errorResponse);
      }
    } catch (error) {
      this.fastify.log.error('Error creating game:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to create game');
      reply.status(500).send(errorResponse);
    }
  }

  public async joinGame(request: FastifyRequest<JoinGameRequest>, reply: FastifyReply): Promise<void> {
    try {
      const { gameId } = request.params;
      const { playerName } = request.body || {};
      
      if (!GameValidators.validateGameId(gameId)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid game ID');
        reply.status(400).send(errorResponse);
        return;
      }

      if (!GameValidators.validatePlayerName(playerName)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Player name is required');
        reply.status(400).send(errorResponse);
        return;
      }
      
      const sanitizedGameId = GameValidators.sanitizeGameId(gameId);
      const sanitizedPlayerName = GameValidators.sanitizePlayerName(playerName);
      const success = this.gameManager.joinGame(sanitizedGameId, sanitizedPlayerName);
      
      if (success) {
        const game = this.gameManager.getGame(sanitizedGameId);
        if (game) {
          const response = this.apiResponseService.createGameResponse(game);
          reply.send(response);
        } else {
          const errorResponse = this.apiResponseService.createErrorResponse('Game not found');
          reply.status(404).send(errorResponse);
        }
      } else {
        const errorResponse = this.apiResponseService.createErrorResponse('Failed to join game');
        reply.status(400).send(errorResponse);
      }
    } catch (error) {
      this.fastify.log.error('Error joining game:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to join game');
      reply.status(500).send(errorResponse);
    }
  }

  public async getApiGames(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const allGames = this.gameManager.getAllGames();
      const response = this.apiResponseService.createGamesListResponse(allGames);
      reply.send(response);
    } catch (error) {
      this.fastify.log.error('Error getting API games:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to get games list');
      reply.status(500).send(errorResponse);
    }
  }

  public async getApiGameById(request: FastifyRequest<GetGameRequest>, reply: FastifyReply): Promise<void> {
    try {
      const { gameId } = request.params;
      
      if (!GameValidators.validateGameId(gameId)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid game ID');
        reply.status(400).send(errorResponse);
        return;
      }

      const game = this.gameManager.getGame(gameId);
      
      if (!game) {
        const errorResponse = this.apiResponseService.createErrorResponse('Game not found');
        reply.status(404).send(errorResponse);
        return;
      }
      
      const formattedGame = this.apiResponseService.formatGameForApi(game);
      reply.send(formattedGame);
    } catch (error) {
      this.fastify.log.error('Error getting API game:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to get game');
      reply.status(500).send(errorResponse);
    }
  }

  public async createApiGame(request: FastifyRequest<CreateGameRequest>, reply: FastifyReply): Promise<void> {
    try {
      const { nombre, gameMode = GAME_MODES.PVP, maxPlayers = 2 } = request.body || {};
      
      // Use provided name or generate a default
      const playerName = 'Jugador1';
      
      if (!GameValidators.validateGameMode(gameMode)) {
        const errorResponse = this.apiResponseService.createErrorResponse('Invalid game mode');
        reply.status(400).send(errorResponse);
        return;
      }

      const gameId = this.gameManager.createGame(playerName, gameMode);
      const game = this.gameManager.getGame(gameId);
      
      if (game) {
        const formattedGame = this.apiResponseService.formatGameForApi(game);
        const gameWithMode = { 
          ...formattedGame, 
          gameMode, 
          capacidadMaxima: maxPlayers 
        };
        
        reply.send(gameWithMode);
      } else {
        const errorResponse = this.apiResponseService.createErrorResponse('Failed to create game');
        reply.status(500).send(errorResponse);
      }
    } catch (error) {
      this.fastify.log.error('Error creating API game:', error);
      const errorResponse = this.apiResponseService.createErrorResponse('Failed to create game');
      reply.status(500).send(errorResponse);
    }
  }
}
