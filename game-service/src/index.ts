/**
 * Main entry point - barrel file for the entire application
 */

// Core exports
export { ServerConfig } from './config/server-config.js';
export { GameConfig } from './config/game-config.js';

// Constants
export * from './constants/index.js';

// Interfaces
export * from './interfaces/index.js';

// Services
export * from './services/index.js';

// Game engine
export * from './game/index.js';

// Controllers
export * from './controllers/index.js';

// Utilities
export * from './utils/index.js';

// Validators
export * from './validators/index.js';
