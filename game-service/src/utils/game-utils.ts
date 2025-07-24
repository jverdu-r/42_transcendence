/**
 * Game physics and utility functions
 */
import type { IBall, IPaddle, IGameDimensions } from '../interfaces/index.js';

export class GameUtils {
  /**
   * Check collision between ball and paddle
   */
  public static checkCollision(ball: IBall, paddle: IPaddle): boolean {
    return (
      ball.x - ball.radius < paddle.x + paddle.width &&
      ball.x + ball.radius > paddle.x &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.y + ball.radius > paddle.y
    );
  }

  /**
   * Calculate ball bounce angle based on hit position on paddle
   */
  public static calculateBounceAngle(ball: IBall, paddle: IPaddle): number {
    const paddleCenter = paddle.y + paddle.height / 2;
    const hitPosition = (ball.y - paddleCenter) / (paddle.height / 2);
    
    // Maximum bounce angle of 45 degrees
    const maxAngle = Math.PI / 4;
    return hitPosition * maxAngle;
  }

  /**
   * Generate random ball velocity
   */
  public static generateRandomBallVelocity(speed: number): { vx: number; vy: number } {
    const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle between -60 and 60 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    return {
      vx: Math.cos(angle) * speed * direction,
      vy: Math.sin(angle) * speed,
    };
  }

  /**
   * Clamp a value between min and max
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate distance between two points
   */
  public static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Check if ball is out of bounds
   */
  public static isBallOutOfBounds(ball: IBall, dimensions: IGameDimensions): { left: boolean; right: boolean } {
    return {
      left: ball.x - ball.radius < 0,
      right: ball.x + ball.radius > dimensions.width,
    };
  }

  /**
   * Reset ball to center with random velocity
   */
  public static resetBall(ball: IBall, dimensions: IGameDimensions, speed: number): void {
    ball.x = dimensions.width / 2;
    ball.y = dimensions.height / 2;
    
    const velocity = GameUtils.generateRandomBallVelocity(speed);
    ball.vx = velocity.vx;
    ball.vy = velocity.vy;
  }

  /**
   * Handle ball collision with walls
   */
  public static handleWallCollision(ball: IBall, dimensions: IGameDimensions): void {
    // Top wall collision
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy;
    }
    
    // Bottom wall collision
    if (ball.y + ball.radius >= dimensions.height) {
      ball.y = dimensions.height - ball.radius;
      ball.vy = -ball.vy;
    }
  }

  /**
   * Handle ball collision with paddle
   */
  public static handlePaddleCollision(ball: IBall, paddle: IPaddle): void {
    const bounceAngle = GameUtils.calculateBounceAngle(ball, paddle);
    const currentSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    
    // Increase speed slightly on each hit
    const newSpeed = Math.min(currentSpeed * 1.05, 12);
    
    // Determine which side of the paddle was hit
    const ballCenterX = ball.x;
    const paddleCenterX = paddle.x + paddle.width / 2;
    const hitFromLeft = ballCenterX < paddleCenterX;
    
    // Calculate new velocity
    ball.vx = Math.cos(bounceAngle) * newSpeed * (hitFromLeft ? -1 : 1);
    ball.vy = Math.sin(bounceAngle) * newSpeed;
    
    // Prevent ball from getting stuck in paddle
    if (hitFromLeft) {
      ball.x = paddle.x - ball.radius;
    } else {
      ball.x = paddle.x + paddle.width + ball.radius;
    }
  }

  /**
   * Update paddle position with bounds checking
   */
  public static updatePaddlePosition(
    paddle: IPaddle, 
    direction: 'up' | 'down' | 'stop', 
    dimensions: IGameDimensions
  ): void {
    if (direction === 'stop') return;
    
    const movement = direction === 'up' ? -paddle.speed : paddle.speed;
    paddle.y = GameUtils.clamp(paddle.y + movement, 0, dimensions.height - paddle.height);
  }
}
