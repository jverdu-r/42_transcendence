/**
 * Enhanced core game logic with real-time state management
 */
import type { IBall, IPaddle, IGameDimensions, IScore, IGameConfig, IPlayer, GameStatus, PlayerNumber } from '../interfaces/index.js';
import { GAME_STATUS } from '../constants/index.js';
import { v4 as uuidv4 } from 'uuid';

export class Game {
  private id: string;
  private name: string;
  private players: IPlayer[] = [];
  private status: GameStatus = GAME_STATUS.WAITING;
  private dimensions: IGameDimensions;
  private config: IGameConfig;
  
  // Enhanced game state
  private ball: IBall;
  private paddles: Map<string, IPaddle> = new Map();
  private scores: Map<string, number> = new Map();
  private gameLoop: NodeJS.Timeout | null = null;
  private lastUpdate: number = 0;
  private spectators: Set<string> = new Set();

  constructor(name: string, dimensions: IGameDimensions, config: IGameConfig) {
    this.id = ''; // ID will be set externally by GameManager
    this.name = name;
    this.dimensions = dimensions;
    this.config = config;
    
    // Initialize ball
    this.ball = {
      x: dimensions.width / 2,
      y: dimensions.height / 2,
      vx: 5,
      vy: 3,
      radius: 10,
      speed: config.ballSpeed || 5
    };
  }

  public setId(id: string): void {
    this.id = id;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayers(): IPlayer[] {
    return this.players;
  }

  public addPlayer(player: IPlayer): boolean {
    if (this.players.length >= 2) {
      return false;
    }
    
    this.players.push(player);
    
    // Initialize player paddle and score
    const paddle: IPaddle = {
      x: player.number === 1 ? 20 : this.dimensions.width - 30,
      y: this.dimensions.height / 2 - 50,
      width: 10,
      height: 100,
      speed: this.config.paddleSpeed || 8,
      vx: 0,
      vy: 0
    };
    
    this.paddles.set(player.id, paddle);
    this.scores.set(player.id, 0);
    
    console.log(`🎮 Player ${player.name} added to game ${this.id}`);
    return true;
  }

  public removePlayer(playerId: string): boolean {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      this.paddles.delete(playerId);
      this.scores.delete(playerId);
      
      // If game was playing and we lose a player, pause the game
      if (this.status === GAME_STATUS.PLAYING) {
        this.pause();
      }
      
      return true;
    }
    return false;
  }

  public start(): boolean {
    if (this.players.length >= 2) {
      this.status = GAME_STATUS.PLAYING;
      this.lastUpdate = Date.now();
      this.startGameLoop();
      console.log(`🚀 Game ${this.id} started`);
      return true;
    }
    return false;
  }

  public stop(): void {
    this.status = GAME_STATUS.FINISHED;
    this.stopGameLoop();
    console.log(`⏹️ Game ${this.id} stopped`);
  }

  public pause(): void {
    if (this.status === GAME_STATUS.PLAYING) {
      this.status = GAME_STATUS.PAUSED;
      this.stopGameLoop();
      console.log(`⏸️ Game ${this.id} paused`);
    }
  }

  public resume(): void {
    if (this.status === GAME_STATUS.PAUSED && this.players.length >= 2) {
      this.status = GAME_STATUS.PLAYING;
      this.lastUpdate = Date.now();
      this.startGameLoop();
      console.log(`▶️ Game ${this.id} resumed`);
    }
  }

  private startGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    
    this.gameLoop = setInterval(() => {
      this.updateGameState();
    }, 1000 / 60); // 60 FPS
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private updateGameState(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;

    // Update ball position
    this.updateBall(deltaTime);
    
    // Update paddle positions
    this.updatePaddles(deltaTime);
    
    // Check collisions
    this.checkCollisions();
    
    // Check win conditions
    this.checkWinConditions();
  }

  private updateBall(deltaTime: number): void {
    this.ball.x += this.ball.vx * deltaTime * 60; // 60 FPS normalization
    this.ball.y += this.ball.vy * deltaTime * 60;

    // Ball collision with top/bottom walls
    if (this.ball.y <= this.ball.radius || this.ball.y >= this.dimensions.height - this.ball.radius) {
      this.ball.vy = -this.ball.vy;
    }
  }

  private updatePaddles(deltaTime: number): void {
    this.paddles.forEach((paddle, playerId) => {
      paddle.y += paddle.vy * deltaTime * 60;
      
      // Keep paddle within bounds
      if (paddle.y < 0) paddle.y = 0;
      if (paddle.y > this.dimensions.height - paddle.height) {
        paddle.y = this.dimensions.height - paddle.height;
      }
    });
  }

  private checkCollisions(): void {
    this.paddles.forEach((paddle, playerId) => {
      // Simple collision detection
      if (
        this.ball.x - this.ball.radius <= paddle.x + paddle.width &&
        this.ball.x + this.ball.radius >= paddle.x &&
        this.ball.y - this.ball.radius <= paddle.y + paddle.height &&
        this.ball.y + this.ball.radius >= paddle.y
      ) {
        this.ball.vx = -this.ball.vx;
        // Add some spin based on where the ball hit the paddle
        const hitPos = (this.ball.y - paddle.y) / paddle.height - 0.5;
        this.ball.vy += hitPos * 2;
      }
    });
  }

  private checkWinConditions(): void {
    // Ball went off left side
    if (this.ball.x < 0) {
      const rightPlayer = this.players.find(p => p.number === 2);
      if (rightPlayer) {
        this.scores.set(rightPlayer.id, (this.scores.get(rightPlayer.id) || 0) + 1);
      }
      this.resetBall();
    }
    
    // Ball went off right side
    if (this.ball.x > this.dimensions.width) {
      const leftPlayer = this.players.find(p => p.number === 1);
      if (leftPlayer) {
        this.scores.set(leftPlayer.id, (this.scores.get(leftPlayer.id) || 0) + 1);
      }
      this.resetBall();
    }

    // Check if someone won
    const winScore = this.config.winScore || 11;
    this.scores.forEach((score, playerId) => {
      if (score >= winScore) {
        this.status = GAME_STATUS.FINISHED;
        this.stopGameLoop();
      }
    });
  }

  private resetBall(): void {
    this.ball.x = this.dimensions.width / 2;
    this.ball.y = this.dimensions.height / 2;
    this.ball.vx = this.ball.vx > 0 ? -Math.abs(this.ball.speed) : Math.abs(this.ball.speed);
    this.ball.vy = (Math.random() - 0.5) * this.ball.speed;
  }

  public handlePlayerInput(playerId: string, input: any): void {
    const paddle = this.paddles.get(playerId);
    if (!paddle || this.status !== GAME_STATUS.PLAYING) {
      return;
    }

    switch (input.direction) {
      case 'up':
        paddle.vy = -paddle.speed;
        break;
      case 'down':
        paddle.vy = paddle.speed;
        break;
      case 'stop':
        paddle.vy = 0;
        break;
    }
  }

  public getGameState(): any {
    return {
      id: this.id,
      name: this.name,
      players: this.players.map(player => ({
        ...player,
        score: this.scores.get(player.id) || 0,
        paddle: this.paddles.get(player.id)
      })),
      ball: this.ball,
      status: this.status,
      timestamp: Date.now(),
      dimensions: this.dimensions,
      scores: Object.fromEntries(this.scores),
      spectatorCount: this.spectators.size
    };
  }

  // Spectator management
  public addSpectator(spectatorId: string): void {
    this.spectators.add(spectatorId);
  }

  public removeSpectator(spectatorId: string): void {
    this.spectators.delete(spectatorId);
  }

  public getSpectators(): string[] {
    return Array.from(this.spectators);
  }

  public getSpectatorCount(): number {
    return this.spectators.size;
  }

  // Enhanced game info
  public getDetailedGameInfo(): any {
    return {
      ...this.getGameState(),
      config: this.config,
      dimensions: this.dimensions,
      isActive: this.status === GAME_STATUS.PLAYING,
      canJoin: this.players.length < 2 && this.status === GAME_STATUS.WAITING,
      canSpectate: this.status === GAME_STATUS.PLAYING,
      duration: this.lastUpdate - (this.lastUpdate - 60000), // Placeholder for actual start time
    };
  }
}
