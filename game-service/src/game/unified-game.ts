/**
 * Unified Game Engine - Enhanced game logic for all modes
 */
import type { IBall, IPaddle, IGameDimensions, IScore, IGameConfig, IPlayer, GameStatus, PlayerNumber } from '../interfaces/index.js';
import { GAME_STATUS } from '../constants/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface UnifiedGameState {
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
    };
    paddles: {
        left: { x: number; y: number; width: number; height: number };
        right: { x: number; y: number; width: number; height: number };
    };
    score: { left: number; right: number };
    gameRunning: boolean;
    canvas: { width: number; height: number };
    maxScore: number;
    rallieCount: number;
    lastUpdate: number;
}

export class UnifiedGame {
    private id: string;
    private name: string;
    private players: IPlayer[] = [];
    private status: GameStatus = GAME_STATUS.WAITING;
    private gameState: UnifiedGameState;
    private gameLoop?: NodeJS.Timeout;
    private mode: 'pvp' | 'pve' = 'pvp';
    private aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

    constructor(name: string, dimensions: IGameDimensions, config: IGameConfig) {
        this.id = ''; // ID will be set externally by GameManager
        this.name = name;
        
        this.gameState = {
            ball: {
                x: 400,
                y: 300,
                vx: 4,
                vy: 2,
                radius: 8
            },
            paddles: {
                left: {
                    x: 30,
                    y: 250,
                    width: 15,
                    height: 100
                },
                right: {
                    x: 755,
                    y: 250,
                    width: 15,
                    height: 100
                }
            },
            score: { left: 0, right: 0 },
            gameRunning: false,
            canvas: { width: dimensions.width, height: dimensions.height },
            maxScore: config.maxScore,
            rallieCount: 0,
            lastUpdate: Date.now()
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

    public setMode(mode: 'pvp' | 'pve', aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
        this.mode = mode;
        this.aiDifficulty = aiDifficulty;
    }

    public addPlayer(player: IPlayer): boolean {
        if (this.players.length >= 2) {
            return false;
        }
        this.players.push(player);
        return true;
    }

    public removePlayer(playerId: string): boolean {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            return true;
        }
        return false;
    }

    public start(): boolean {
        if (this.players.length >= 2 || (this.mode === 'pve' && this.players.length >= 1)) {
            this.status = GAME_STATUS.PLAYING;
            this.gameState.gameRunning = true;
            this.startGameLoop();
            return true;
        }
        return false;
    }

    public stop(): void {
        this.status = GAME_STATUS.FINISHED;
        this.gameState.gameRunning = false;
        this.stopGameLoop();
    }

    public pause(): void {
        this.status = GAME_STATUS.PAUSED;
        this.gameState.gameRunning = false;
        this.stopGameLoop();
    }

    public resume(): void {
        if (this.status === GAME_STATUS.PAUSED) {
            this.status = GAME_STATUS.PLAYING;
            this.gameState.gameRunning = true;
            this.startGameLoop();
        }
    }

    private startGameLoop(): void {
        this.stopGameLoop(); // Ensure no duplicate loops
        
        const FPS = 60;
        const frameTime = 1000 / FPS;
        
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, frameTime);
    }

    private stopGameLoop(): void {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = undefined;
        }
    }

    private updateGame(): void {
        if (!this.gameState.gameRunning) return;

        const now = Date.now();
        const deltaTime = now - this.gameState.lastUpdate;
        this.gameState.lastUpdate = now;

        // Update AI if in PvE mode
        if (this.mode === 'pve') {
            this.updateAI();
        }

        // Update ball position
        this.updateBall();

        // Check for game end
        this.checkGameEnd();
    }

    private updateBall(): void {
        // Update ball position
        this.gameState.ball.x += this.gameState.ball.vx;
        this.gameState.ball.y += this.gameState.ball.vy;

        // Bounce off top and bottom walls
        if (this.gameState.ball.y <= this.gameState.ball.radius || 
            this.gameState.ball.y >= this.gameState.canvas.height - this.gameState.ball.radius) {
            this.gameState.ball.vy *= -1;
        }

        // Paddle collisions
        const leftPaddle = this.gameState.paddles.left;
        const rightPaddle = this.gameState.paddles.right;

        // Left paddle collision
        if (this.gameState.ball.x - this.gameState.ball.radius <= leftPaddle.x + leftPaddle.width &&
            this.gameState.ball.y >= leftPaddle.y &&
            this.gameState.ball.y <= leftPaddle.y + leftPaddle.height &&
            this.gameState.ball.vx < 0) {
            this.gameState.ball.vx *= -1;
            this.gameState.rallieCount++;
        }

        // Right paddle collision
        if (this.gameState.ball.x + this.gameState.ball.radius >= rightPaddle.x &&
            this.gameState.ball.y >= rightPaddle.y &&
            this.gameState.ball.y <= rightPaddle.y + rightPaddle.height &&
            this.gameState.ball.vx > 0) {
            this.gameState.ball.vx *= -1;
            this.gameState.rallieCount++;
        }

        // Scoring
        if (this.gameState.ball.x < 0) {
            this.gameState.score.right++;
            this.resetBall();
        } else if (this.gameState.ball.x > this.gameState.canvas.width) {
            this.gameState.score.left++;
            this.resetBall();
        }
    }

    private updateAI(): void {
        const aiPaddle = this.gameState.paddles.right;
        const ball = this.gameState.ball;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        const ballCenter = ball.y;
        
        // AI movement based on difficulty
        let aiSpeed = 2;
        let threshold = 50;
        
        switch (this.aiDifficulty) {
            case 'easy':
                aiSpeed = 2;
                threshold = 60;
                break;
            case 'medium':
                aiSpeed = 3;
                threshold = 40;
                break;
            case 'hard':
                aiSpeed = 4;
                threshold = 20;
                break;
        }
        
        const difference = ballCenter - paddleCenter;
        
        if (Math.abs(difference) > threshold) {
            if (difference > 0 && aiPaddle.y < this.gameState.canvas.height - aiPaddle.height) {
                aiPaddle.y += aiSpeed;
            } else if (difference < 0 && aiPaddle.y > 0) {
                aiPaddle.y -= aiSpeed;
            }
        }
    }

    private resetBall(): void {
        this.gameState.ball.x = 400;
        this.gameState.ball.y = 300;
        this.gameState.ball.vx = Math.random() > 0.5 ? 4 : -4;
        this.gameState.ball.vy = (Math.random() - 0.5) * 4;
        this.gameState.rallieCount = 0;
    }

    private checkGameEnd(): void {
        if (this.gameState.score.left >= this.gameState.maxScore || 
            this.gameState.score.right >= this.gameState.maxScore) {
            this.stop();
        }
    }

    public handlePlayerInput(playerId: string, input: any): void {
        if (!this.gameState.gameRunning) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const { direction, type } = input;
        const speed = 6;

        if (type === 'move') {
            const paddle = player.number === 1 ? this.gameState.paddles.left : this.gameState.paddles.right;
            
            switch (direction) {
                case 'up':
                    if (paddle.y > 0) {
                        paddle.y = Math.max(0, paddle.y - speed);
                    }
                    break;
                case 'down':
                    if (paddle.y < this.gameState.canvas.height - paddle.height) {
                        paddle.y = Math.min(this.gameState.canvas.height - paddle.height, paddle.y + speed);
                    }
                    break;
            }
        }
    }

    public getGameState(): any {
        return {
            id: this.id,
            name: this.name,
            players: this.players,
            status: this.status,
            gameState: this.gameState,
            mode: this.mode
        };
    }

    public getFullGameState(): UnifiedGameState {
        return { ...this.gameState };
    }
}
