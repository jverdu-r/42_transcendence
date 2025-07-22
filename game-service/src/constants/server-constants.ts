/**
 * Server configuration constants
 */
export const SERVER_CONFIG = {
  DEFAULT_PORT: 8000,
  DEFAULT_HOST: '0.0.0.0',
  MAX_PAYLOAD: 1048576,
  HEALTH_CHECK_INTERVAL: 30000,
} as const;

export const LOG_LEVELS = {
  INFO: 'info',
  ERROR: 'error',
  DEBUG: 'debug',
  WARN: 'warn',
} as const;

export const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  MESSAGE: 'message',
  CLOSE: 'close',
  ERROR: 'error',
} as const;
