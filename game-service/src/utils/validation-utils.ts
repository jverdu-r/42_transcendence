/**
 * General validation utility functions
 */
import type { IGameConfig } from '../interfaces/index.js';

export class ValidationUtils {
  /**
   * Validate game configuration
   */
  public static validateGameConfig(config: any): config is IGameConfig {
    return (
      typeof config.maxScore === 'number' && config.maxScore > 0 &&
      typeof config.ballSpeed === 'number' && config.ballSpeed > 0 &&
      typeof config.paddleSpeed === 'number' && config.paddleSpeed > 0 &&
      ['easy', 'medium', 'hard'].includes(config.aiDifficulty)
    );
  }

  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate player name format
   */
  public static isValidPlayerName(name: string): boolean {
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z0-9_\-\s]+$/.test(trimmed);
  }

  /**
   * Validate UUID format
   */
  public static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate port number
   */
  public static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Validate IP address format
   */
  public static isValidIPAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return ipv6Regex.test(ip);
  }

  /**
   * Sanitize string input
   */
  public static sanitizeString(input: string, maxLength: number = 100): string {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength).replace(/[<>\"'&]/g, '');
  }

  /**
   * Validate numeric range
   */
  public static isInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && value >= min && value <= max;
  }

  /**
   * Check if object has required properties
   */
  public static hasRequiredProperties(obj: any, requiredProps: string[]): boolean {
    if (!obj || typeof obj !== 'object') return false;
    return requiredProps.every(prop => obj.hasOwnProperty(prop));
  }

  /**
   * Validate array of specific type
   */
  public static isArrayOfType<T>(arr: any, validator: (item: any) => item is T): arr is T[] {
    return Array.isArray(arr) && arr.every(validator);
  }
}
