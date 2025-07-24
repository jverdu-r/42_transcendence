/**
 * Game configuration management
 */
import type { IGameConfig, IGameDimensions } from '../interfaces/index.js';
import { GAME_CONFIG } from '../constants/index.js';

export class GameConfig {
  private static defaultGameConfig: IGameConfig = {
    maxScore: GAME_CONFIG.DEFAULT_MAX_SCORE,
    ballSpeed: GAME_CONFIG.DEFAULT_BALL_SPEED,
    paddleSpeed: GAME_CONFIG.DEFAULT_PADDLE_SPEED,
    aiDifficulty: 'medium',
  };

  private static defaultDimensions: IGameDimensions = {
    width: GAME_CONFIG.DEFAULT_DIMENSIONS.width,
    height: GAME_CONFIG.DEFAULT_DIMENSIONS.height,
  };

  public static getDefaultConfig(): IGameConfig {
    return { ...this.defaultGameConfig };
  }

  public static getDefaultDimensions(): IGameDimensions {
    return { ...this.defaultDimensions };
  }

  public static createCustomConfig(overrides: Partial<IGameConfig>): IGameConfig {
    return {
      ...this.defaultGameConfig,
      ...overrides,
    };
  }

  public static createCustomDimensions(overrides: Partial<IGameDimensions>): IGameDimensions {
    return {
      ...this.defaultDimensions,
      ...overrides,
    };
  }
}
