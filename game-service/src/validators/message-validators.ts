/**
 * WebSocket message validation utilities
 */
import type { IPlayerInput, IPlayerMoveData, MovementDirection } from '../interfaces/index.js';
import { MESSAGE_TYPES, MOVEMENT_DIRECTIONS, INPUT_TYPES } from '../constants/index.js';

export class MessageValidators {
  public static validateMessageStructure(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.type || typeof data.type !== 'string') {
      return false;
    }

    return Object.values(MESSAGE_TYPES).includes(data.type as any);
  }

  public static validatePlayerMoveData(data: any): data is IPlayerMoveData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.gameId || typeof data.gameId !== 'string') {
      return false;
    }

    if (!data.direction || !Object.values(MOVEMENT_DIRECTIONS).includes(data.direction)) {
      return false;
    }

    return true;
  }

  public static validatePlayerInput(data: any): data is IPlayerInput {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.type || !Object.values(INPUT_TYPES).includes(data.type)) {
      return false;
    }

    if (!data.playerId || typeof data.playerId !== 'string') {
      return false;
    }

    if (!data.gameId || typeof data.gameId !== 'string') {
      return false;
    }

    if (data.type === 'move' && data.direction && !Object.values(MOVEMENT_DIRECTIONS).includes(data.direction)) {
      return false;
    }

    return true;
  }

  public static validateMovementDirection(direction: any): direction is MovementDirection {
    return typeof direction === 'string' && Object.values(MOVEMENT_DIRECTIONS).includes(direction as MovementDirection);
  }

  public static isValidMessageType(type: any): boolean {
    return typeof type === 'string' && Object.values(MESSAGE_TYPES).includes(type as any);
  }

  public static sanitizeMessage(data: any): any {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const sanitized: any = {};

    if (typeof data.type === 'string') {
      sanitized.type = data.type.trim();
    }

    if (data.data && typeof data.data === 'object') {
      sanitized.data = data.data;
    }

    if (typeof data.gameId === 'string') {
      sanitized.gameId = data.gameId.trim();
    }

    if (typeof data.playerId === 'string') {
      sanitized.playerId = data.playerId.trim();
    }

    return sanitized;
  }
}
