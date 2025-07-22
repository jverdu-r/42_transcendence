/**
 * WebSocket message types constants
 */
export const MESSAGE_TYPES = {
  // Connection events
  CONNECTION: 'connection',
  
  // Game management
  CREATE_GAME: 'createGame',
  JOIN_GAME: 'joinGame',
  START_GAME: 'startGame',
  LEAVE_GAME: 'leaveGame',
  
  // Game actions
  PLAYER_MOVE: 'playerMove',
  
  // Game state
  GET_GAMES: 'getGames',
  GET_GAME_STATE: 'getGameState',
  
  // Server responses
  GAME_CREATED: 'gameCreated',
  GAME_JOINED: 'gameJoined',
  GAME_STARTED: 'gameStarted',
  GAME_LEFT: 'gameLeft',
  GAMES_LIST: 'gamesList',
  GAME_STATE: 'gameState',
  
  // Events
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  
  // Game events
  SCORE: 'score',
  GAME_END: 'gameEnd',
  COUNTDOWN: 'countdown',
  
  // Errors
  ERROR: 'error',
} as const;

export const MOVEMENT_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  STOP: 'stop',
} as const;

export const INPUT_TYPES = {
  MOVE: 'move',
  PAUSE: 'pause',
  RESUME: 'resume',
} as const;
