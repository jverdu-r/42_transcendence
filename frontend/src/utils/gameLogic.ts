// frontend/src/utils/gameLogic.ts

export interface GameState {
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  paddles: {
    left: { x: number; y: number; width: number; height: number };
    right: { x: number; y: number; width: number; height: number };
  };
  score: { left: number; right: number };
  keys: {
    w: boolean; s: boolean;
    ArrowUp: boolean; ArrowDown: boolean
  };
  canvasWidth: number;
  canvasHeight: number;
  palaAncho: number;
  palaAlto: number;
}

export function updateGameState(gameState: GameState): GameState {
  // Update ball position
  gameState.ball.x += gameState.ball.vx;
  gameState.ball.y += gameState.ball.vy;

  // Bounce off top and bottom walls
  if (gameState.ball.y <= gameState.ball.radius || gameState.ball.y >= gameState.canvasHeight - gameState.ball.radius) {
    gameState.ball.vy *= -1;
  }

  // Collision with paddles
  const leftPaddle = gameState.paddles.left;
  const rightPaddle = gameState.paddles.right;

  if (
    gameState.ball.x <= leftPaddle.x + leftPaddle.width &&
    gameState.ball.y >= leftPaddle.y &&
    gameState.ball.y <= leftPaddle.y + leftPaddle.height &&
    gameState.ball.vx < 0
  ) {
    gameState.ball.vx *= -1;
  }

  if (
    gameState.ball.x >= rightPaddle.x &&
    gameState.ball.y >= rightPaddle.y &&
    gameState.ball.y <= rightPaddle.y + rightPaddle.height &&
    gameState.ball.vx > 0
  ) {
    gameState.ball.vx *= -1;
  }

  // Scoring
  if (gameState.ball.x < 0) {
    gameState.score.right++;
    resetBall(gameState);
  } else if (gameState.ball.x > gameState.canvasWidth) {
    gameState.score.left++;
    resetBall(gameState);
  }

  return gameState;
}

export function resetBall(gameState: GameState): void {
  gameState.ball.x = gameState.canvasWidth / 2;
  gameState.ball.y = gameState.canvasHeight / 2;
  gameState.ball.vx = Math.random() > 0.5 ? 5 : -5;
  gameState.ball.vy = (Math.random() - 0.5) * 6;
}

export function updatePaddlePosition(gameState: GameState, player: number, direction: number, speed: number): void {
  if (player === 1) {
    gameState.paddles.left.y += direction * speed;
    if (gameState.paddles.left.y < 0) {
      gameState.paddles.left.y = 0;
    }
    if (gameState.paddles.left.y > gameState.canvasHeight - gameState.paddles.left.height) {
      gameState.paddles.left.y = gameState.canvasHeight - gameState.paddles.left.height;
    }
  } else if (player === 2) {
    gameState.paddles.right.y += direction * speed;
    if (gameState.paddles.right.y < 0) {
      gameState.paddles.right.y = 0;
    }
    if (gameState.paddles.right.y > gameState.canvasHeight - gameState.paddles.right.height) {
      gameState.paddles.right.y = gameState.canvasHeight - gameState.paddles.right.height;
    }
  }
}
