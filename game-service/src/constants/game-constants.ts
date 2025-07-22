/**
 * Game configuration constants
 */
export const GAME_CONFIG = {
  MAX_PLAYERS: 2,
  DEFAULT_MAX_SCORE: 5,
  DEFAULT_BALL_SPEED: 5,
  DEFAULT_PADDLE_SPEED: 8,
  DEFAULT_DIMENSIONS: {
    width: 800,
    height: 600,
  },
} as const;

export const GAME_MODES = {
  PVP: 'pvp',
  PVE: 'pve',
  MULTIPLAYER: 'multiplayer',
  TOURNAMENT: 'tournament',
} as const;

export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export const GAME_STATUS = {
  WAITING: 'waiting',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

export const PLAYER_NUMBERS = {
  ONE: 1,
  TWO: 2,
} as const;
