/**
 * WebSocket message handling controller
 */
import type { FastifyInstance } from 'fastify';
import type { IGameMessage, IPlayerInput } from '../interfaces/index.js';
import type { ConnectionService, GameBroadcastService } from '../services/index.js';
import type { GameManager } from '../game/index.js';;
import { MessageValidators, GameValidators } from '../validators/index.js';
import { MESSAGE_TYPES } from '../constants/index.js';

export class WebSocketController {
  constructor(
    private fastify: FastifyInstance,
    private connectionService: ConnectionService,
    private broadcastService: GameBroadcastService,
    private gameManager: GameManager
  ) {}

  public async handleClientMessage(clientId: string, message: any): Promise<void> {
    try {
      if (!MessageValidators.validateMessageStructure(message)) {
        this.broadcastService.sendError(clientId, 'Invalid message format');
        return;
      }

      const sanitizedMessage = MessageValidators.sanitizeMessage(message);
      const { type, data } = sanitizedMessage;

      this.fastify.log.info(`📨 Message from ${clientId}:`, { type, data });

      switch (type) {
        case MESSAGE_TYPES.CREATE_GAME:
          await this.handleCreateGame(clientId, data);
          break;
        case MESSAGE_TYPES.JOIN_GAME:
          await this.handleJoinGame(clientId, data);
          break;
        case MESSAGE_TYPES.START_GAME:
          await this.handleStartGame(clientId, data);
          break;
        case MESSAGE_TYPES.PLAYER_MOVE:
          this.fastify.log.info(`[WS] PLAYER_MOVE received`, { from: clientId, data });
          await this.handlePlayerMove(clientId, data);
          break;
        case MESSAGE_TYPES.GET_GAMES:
          await this.handleGetGames(clientId);
          break;
        case MESSAGE_TYPES.GET_GAME_STATE:
          await this.handleGetGameState(clientId, data);
          break;
        case MESSAGE_TYPES.LEAVE_GAME:
          await this.handleLeaveGame(clientId, data);
          break;
        default:
          this.fastify.log.warn(`Unknown message type: ${type}`);
          this.broadcastService.sendError(clientId, `Unknown message type: ${type}`);
      }
    } catch (error) {
      this.fastify.log.error('Error processing message:', error);
      this.broadcastService.sendError(clientId, 'Error processing message');
    }
  }

  private async handleCreateGame(clientId: string, data: any): Promise<void> {
    try {
      if (!GameValidators.validateCreateGameData(data)) {
        this.broadcastService.sendError(clientId, 'Invalid game creation data');
        return;
      }

      const { playerName, gameMode = 'pvp', aiDifficulty = 'medium' } = data;
      const sanitizedPlayerName = GameValidators.sanitizePlayerName(playerName);
      
      const gameId = this.gameManager.createGame(sanitizedPlayerName, gameMode);
      const game = this.gameManager.getGame(gameId);
      
      if (game) {
        const players = game.getPlayers();
        const player = players[0]; // First player
        if (player) {
          this.connectionService.mapPlayerToClient(player.id, clientId);
          const playerId = player.id;
          this.connectionService.sendToClient(clientId, {
            type: MESSAGE_TYPES.GAME_CREATED,
            data: { gameId, playerNumber: 1, playerId, gameMode },
          });
        }
      }
      
      // If PvE mode, add AI player
      if (gameMode === 'pve') {
        this.gameManager.joinGame(gameId, `AI (${aiDifficulty})`);
      }
      
      this.fastify.log.info(`🎮 Game created: ${gameId} by ${sanitizedPlayerName}`);
    } catch (error) {
      this.fastify.log.error('Error creating game:', error);
      this.broadcastService.sendError(clientId, 'Failed to create game');
    }
  }

  private async handleJoinGame(clientId: string, data: any): Promise<void> {
    try {
      if (!GameValidators.validateJoinGameData(data)) {
        this.broadcastService.sendError(clientId, 'Invalid join game data');
        return;
      }

      const { gameId, playerName } = data;
      const sanitizedGameId = GameValidators.sanitizeGameId(gameId);
      const sanitizedPlayerName = GameValidators.sanitizePlayerName(playerName);
      
      const success = this.gameManager.joinGame(sanitizedGameId, sanitizedPlayerName);
      
      if (success) {
        const game = this.gameManager.getGame(sanitizedGameId);
        if (game) {
          const players = game.getPlayers();
          const player = players.find(p => p.name === sanitizedPlayerName && !p.isAI);
          if (player) {
            this.connectionService.mapPlayerToClient(player.id, clientId);
            const playerId = player.id;
            this.connectionService.sendToClient(clientId, {
              type: MESSAGE_TYPES.GAME_JOINED,
              data: { gameId: sanitizedGameId, playerNumber: 2, playerId },
            });
          }
        }
        
        this.broadcastService.notifyPlayerJoined(sanitizedGameId, sanitizedPlayerName, 2);
        
        this.fastify.log.info(`👥 Player ${sanitizedPlayerName} joined game ${sanitizedGameId}`);
      } else {
        this.broadcastService.sendError(clientId, 'Failed to join game');
      }
    } catch (error) {
      this.fastify.log.error('Error joining game:', error);
      this.broadcastService.sendError(clientId, 'Failed to join game');
    }
  }

  private async handleStartGame(clientId: string, data: any): Promise<void> {
    try {
      if (!data?.gameId || !GameValidators.validateGameId(data.gameId)) {
        this.broadcastService.sendError(clientId, 'Invalid game ID');
        return;
      }

      const gameId = GameValidators.sanitizeGameId(data.gameId);
      const success = await this.gameManager.startGame(gameId);
      
      if (success) {
        this.broadcastService.notifyGameStarted(gameId);
        this.fastify.log.info(`🚀 Game started: ${gameId}`);
      } else {
        this.broadcastService.sendError(clientId, 'Failed to start game');
      }
    } catch (error) {
      this.fastify.log.error('Error starting game:', error);
      this.broadcastService.sendError(clientId, 'Failed to start game');
    }
  }

  private async handlePlayerMove(clientId: string, data: any): Promise<void> {
    try {
      if (!MessageValidators.validatePlayerMoveData(data)) {
        this.broadcastService.sendError(clientId, 'Invalid player move data');
        return;
      }

      const { gameId, direction } = data;
      const game = this.gameManager.getGame(gameId);
      
      if (!game) {
        this.broadcastService.sendError(clientId, 'Game not found');
        return;
      }
      
      const playerId = this.connectionService.getPlayerByClientId(clientId);
      if (!playerId) {
        this.broadcastService.sendError(clientId, 'Player not found');
        return;
      }
      
      const input: IPlayerInput = {
        type: 'move',
        direction,
        playerId,
        gameId,
      };
      
      game.handlePlayerInput(playerId, input);
      
      this.fastify.log.debug(`🎮 Player move: ${clientId} -> ${direction}`);
    } catch (error) {
      this.fastify.log.error('Error handling player move:', error);
    }
  }

  private async handleGetGames(clientId: string): Promise<void> {
    try {
      const games = this.gameManager.getAllGames().map((game: any) => ({
        id: game.getId(),
        players: game.getPlayers().length,
        status: game.getStatus(),
        maxPlayers: 2,
      }));
      
      this.connectionService.sendToClient(clientId, {
        type: MESSAGE_TYPES.GAMES_LIST,
        data: { games },
      });
    } catch (error) {
      this.fastify.log.error('Error getting games:', error);
      this.broadcastService.sendError(clientId, 'Failed to get games list');
    }
  }

  private async handleGetGameState(clientId: string, data: any): Promise<void> {
    try {
      if (!data?.gameId || !GameValidators.validateGameId(data.gameId)) {
        this.broadcastService.sendError(clientId, 'Invalid game ID');
        return;
      }

      const gameId = GameValidators.sanitizeGameId(data.gameId);
      const game = this.gameManager.getGame(gameId);
      
      if (!game) {
        this.broadcastService.sendError(clientId, 'Game not found');
        return;
      }
      
      this.connectionService.sendToClient(clientId, {
        type: MESSAGE_TYPES.GAME_STATE,
        data: {
          gameId,
          players: game.getPlayers(),
          status: game.getStatus(),
        },
      });
    } catch (error) {
      this.fastify.log.error('Error getting game state:', error);
      this.broadcastService.sendError(clientId, 'Failed to get game state');
    }
  }

  private async handleLeaveGame(clientId: string, data: any): Promise<void> {
    try {
      if (!data?.gameId || !GameValidators.validateGameId(data.gameId)) {
        this.broadcastService.sendError(clientId, 'Invalid game ID');
        return;
      }

      const gameId = GameValidators.sanitizeGameId(data.gameId);
      const playerId = this.connectionService.getPlayerByClientId(clientId);
      
      if (!playerId) {
        this.broadcastService.sendError(clientId, 'Player not found');
        return;
      }
      
      const game = this.gameManager.getGame(gameId);
      if (game) {
        game.removePlayer(playerId);
        
        // If no players left, remove the game
        if (game.getPlayers().length === 0) {
          this.gameManager.removeGame(gameId);
        } else {
          this.broadcastService.notifyPlayerLeft(gameId, playerId);
        }
      }
      
      this.connectionService.sendToClient(clientId, {
        type: MESSAGE_TYPES.GAME_LEFT,
        data: { gameId },
      });
      
      this.fastify.log.info(`👋 Player left game: ${clientId} from ${gameId}`);
    } catch (error) {
      this.fastify.log.error('Error leaving game:', error);
    }
  }

  public handleClientDisconnect(clientId: string): void {
    const playerId = this.connectionService.getPlayerByClientId(clientId);
    
    if (playerId) {
      // Find games where this player is participating
      this.gameManager.getAllGames().forEach((game: any) => {
        const players = game.getPlayers();
        const playerInGame = players.find((p: any) => p.id === playerId);
        
        if (playerInGame) {
          game.removePlayer(playerId);
          
          // If no players left, remove the game
          if (game.getPlayers().length === 0) {
            this.gameManager.removeGame(game.getId());
          } else {
            this.broadcastService.notifyPlayerDisconnected(game.getId(), playerId);
          }
        }
      });
    }
    
    this.connectionService.removeConnection(clientId);
  }
}
