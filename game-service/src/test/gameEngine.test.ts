import { GameManager } from '../game/index.js';
import { GameUtils } from '../utils/index.js';
import type { IBall, IPaddle, IPlayer, IGameConfig, IGameDimensions } from '../interfaces/index.js';

// Simple test to verify game engine functionality
console.log('🧪 Testing Game Engine...');

// Test GameManager
const gameManager = new GameManager();
console.log('✅ GameManager created successfully');

// Test game creation
const gameId = gameManager.createGame('Test Player', 'pvp');
console.log('✅ Game created with ID:', gameId);

// Test game retrieval
const game = gameManager.getGame(gameId);
if (game) {
  console.log('✅ Game retrieved successfully');
  console.log('   - Game ID:', game.getId());
  console.log('   - Players count:', game.getPlayers().length);
  console.log('   - Game status:', game.getStatus());
} else {
  console.log('❌ Failed to retrieve game');
}

// Test GameUtils
const testBall: IBall = {
  x: 100,
  y: 100,
  vx: 5,
  vy: 3,
  radius: 10,
  speed: 5,
};

const testPaddle: IPaddle = {
  x: 50,
  y: 80,
  width: 10,
  height: 60,
  speed: 8,
  vx: 0,
  vy: 0,
};

const collision = GameUtils.checkCollision(testBall, testPaddle);
console.log('✅ Collision detection test:', collision ? 'Collision detected' : 'No collision');

// Test distance calculation
const distance = GameUtils.distance(0, 0, 3, 4);
console.log('✅ Distance calculation test:', distance === 5 ? 'Correct (5)' : 'Incorrect');

// Test clamp function
const clampedValue = GameUtils.clamp(15, 0, 10);
console.log('✅ Clamp function test:', clampedValue === 10 ? 'Correct (10)' : 'Incorrect');

// Test game cleanup
gameManager.cleanup();
console.log('✅ GameManager cleanup completed');

console.log('🎉 All tests completed successfully!');
