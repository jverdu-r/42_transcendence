/**
 * AI player logic and behavior
 */
import type { IPlayer, IBall, IPaddle, IGameDimensions } from '../interfaces/index.js';

export class AIPlayer {
  private difficulty: 'easy' | 'medium' | 'hard';
  private reactionTime: number;
  private accuracy: number;
  private speed: number;

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
    this.setupDifficulty();
  }

  private setupDifficulty(): void {
    switch (this.difficulty) {
      case 'easy':
        this.reactionTime = 0.8;
        this.accuracy = 0.6;
        this.speed = 0.7;
        break;
      case 'medium':
        this.reactionTime = 0.9;
        this.accuracy = 0.8;
        this.speed = 0.85;
        break;
      case 'hard':
        this.reactionTime = 0.95;
        this.accuracy = 0.9;
        this.speed = 1.0;
        break;
    }
  }

  public calculateMove(
    paddle: IPaddle,
    ball: IBall,
    dimensions: IGameDimensions
  ): 'up' | 'down' | 'stop' {
    // Simulate reaction time delay
    if (Math.random() > this.reactionTime) {
      return 'stop';
    }

    const paddleCenter = paddle.y + paddle.height / 2;
    const ballY = ball.y;
    
    // Add some inaccuracy based on difficulty
    const inaccuracy = (1 - this.accuracy) * 50;
    const targetY = ballY + (Math.random() - 0.5) * inaccuracy;

    const difference = targetY - paddleCenter;
    const threshold = 10;

    if (Math.abs(difference) < threshold) {
      return 'stop';
    }

    return difference > 0 ? 'down' : 'up';
  }

  public getDifficulty(): string {
    return this.difficulty;
  }

  public setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = difficulty;
    this.setupDifficulty();
  }

  public getStats(): { reactionTime: number; accuracy: number; speed: number } {
    return {
      reactionTime: this.reactionTime,
      accuracy: this.accuracy,
      speed: this.speed,
    };
  }

  public createAIPlayer(name: string, playerNumber: 1 | 2): IPlayer {
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: playerNumber,
      isAI: true,
      isConnected: true,
      name: name || `AI (${this.difficulty})`,
    };
  }
}
