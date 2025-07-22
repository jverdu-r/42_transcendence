/**
 * Game data validation utilities
 */
import type { ICreateGameData, IJoinGameData, GameMode } from '../interfaces/index.js';
import { GAME_MODES, AI_DIFFICULTY } from '../constants/index.js';

export class GameValidators {
  public static validateCreateGameData(data: any): data is ICreateGameData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.playerName || typeof data.playerName !== 'string' || data.playerName.trim().length === 0) {
      return false;
    }

    if (data.gameMode && !Object.values(GAME_MODES).includes(data.gameMode)) {
      return false;
    }

    if (data.aiDifficulty && !Object.values(AI_DIFFICULTY).includes(data.aiDifficulty)) {
      return false;
    }

    return true;
  }

  public static validateJoinGameData(data: any): data is IJoinGameData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.gameId || typeof data.gameId !== 'string' || data.gameId.trim().length === 0) {
      return false;
    }

    if (!data.playerName || typeof data.playerName !== 'string' || data.playerName.trim().length === 0) {
      return false;
    }

    return true;
  }

  public static validateGameId(gameId: any): gameId is string {
    return typeof gameId === 'string' && gameId.trim().length > 0;
  }

  public static validatePlayerName(playerName: any): playerName is string {
    return typeof playerName === 'string' && 
           playerName.trim().length > 0 && 
           playerName.trim().length <= 50;
  }

  public static validateGameMode(gameMode: any): gameMode is GameMode {
    return typeof gameMode === 'string' && Object.values(GAME_MODES).includes(gameMode as GameMode);
  }

  public static validateAiDifficulty(difficulty: any): difficulty is 'easy' | 'medium' | 'hard' {
    return typeof difficulty === 'string' && Object.values(AI_DIFFICULTY).includes(difficulty as any);
  }

  public static sanitizePlayerName(playerName: string): string {
    return playerName.trim().substring(0, 50);
  }

  public static sanitizeGameId(gameId: string): string {
    return gameId.trim();
  }
}
