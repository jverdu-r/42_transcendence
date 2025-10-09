/**
 * Unified Game Engine - Enhanced game logic for all modes
 */
import type { IBall, IPaddle, IGameDimensions, IScore, IGameConfig, IPlayer, GameStatus, PlayerNumber } from '../interfaces/index.js';
import { GAME_STATUS } from '../constants/index.js';

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
    private gameLoop?: any;
    private mode: 'pvp' | 'pve' = 'pvp';
    private aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

    constructor(name: string, dimensions: IGameDimensions, config: IGameConfig) {
        this.id = ''; // ID will be set externally by GameManager
        this.name = name;
        
        this.initializeGameState();
    }

    private initializeGameState(): void {
        this.gameState = {
            ball: {
                x: 400,
                y: 300,
                vx: 4, // Velocidad inicial igual al frontend
                vy: 2, // Velocidad inicial igual al frontend
                radius: 8 // Radio igual al frontend
            },
            paddles: {
                left: {
                    x: 30,
                    y: 250,
                    width: 15, // Palas más delgadas como el frontend
                    height: 100
                },
                right: {
                    x: 755, // Posición exacta del frontend
                    y: 250,
                    width: 15, // Palas más delgadas como el frontend
                    height: 100
                }
            },
            score: { left: 0, right: 0 },
            gameRunning: false,
            canvas: { width: 800, height: 600 }, // Dimensiones exactas del frontend
            maxScore: 5, // Puntos para ganar igual al frontend
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
        this.gameState.lastUpdate = now;

        // Update AI if in PvE mode - MISMO ALGORITMO DEL FRONTEND
        if (this.mode === 'pve') {
            this.updateAI();
        }

        // Update ball position - FÍSICA IDÉNTICA AL FRONTEND
        this.updateBall();

        // Check for game end
        this.checkGameEnd();
    }

    private updateBall(): void {
        // Actualizar posición de la pelota - FÍSICA IDÉNTICA AL FRONTEND
        this.gameState.ball.x += this.gameState.ball.vx;
        this.gameState.ball.y += this.gameState.ball.vy;
        
        // Rebotes en paredes superior e inferior - EXACTO COMO EL FRONTEND
        if (this.gameState.ball.y <= this.gameState.ball.radius) {
            this.gameState.ball.y = this.gameState.ball.radius;
            this.gameState.ball.vy = Math.abs(this.gameState.ball.vy); // Asegurar rebote hacia abajo
        } else if (this.gameState.ball.y >= this.gameState.canvas.height - this.gameState.ball.radius) {
            this.gameState.ball.y = this.gameState.canvas.height - this.gameState.ball.radius;
            this.gameState.ball.vy = -Math.abs(this.gameState.ball.vy); // Asegurar rebote hacia arriba
        }

        // Paddle collisions - ALGORITMO MEJORADO DEL FRONTEND
        const leftPaddle = this.gameState.paddles.left;
        const rightPaddle = this.gameState.paddles.right;

        // Colisión con pala izquierda (mejorada)
        if (this.gameState.ball.vx < 0 && // Solo si se mueve hacia la izquierda
            this.gameState.ball.x - this.gameState.ball.radius <= leftPaddle.x + leftPaddle.width &&
            this.gameState.ball.x - this.gameState.ball.radius >= leftPaddle.x &&
            this.gameState.ball.y >= leftPaddle.y - this.gameState.ball.radius &&
            this.gameState.ball.y <= leftPaddle.y + leftPaddle.height + this.gameState.ball.radius) {
            
            this.handlePaddleCollision(leftPaddle, 'left');
        }

        // Colisión con pala derecha (mejorada)
        if (this.gameState.ball.vx > 0 && // Solo si se mueve hacia la derecha
            this.gameState.ball.x + this.gameState.ball.radius >= rightPaddle.x &&
            this.gameState.ball.x + this.gameState.ball.radius <= rightPaddle.x + rightPaddle.width &&
            this.gameState.ball.y >= rightPaddle.y - this.gameState.ball.radius &&
            this.gameState.ball.y <= rightPaddle.y + rightPaddle.height + this.gameState.ball.radius) {
            
            this.handlePaddleCollision(rightPaddle, 'right');
        }

        // Scoring - MISMO SISTEMA DEL FRONTEND
        if (this.gameState.ball.x < 0) {
            this.gameState.score.right++;
            this.resetBall();
        } else if (this.gameState.ball.x > this.gameState.canvas.width) {
            this.gameState.score.left++;
            this.resetBall();
        }
    }

    private handlePaddleCollision(paddle: any, side: 'left' | 'right'): void {
        // ALGORITMO DE COLISIÓN IDÉNTICO AL FRONTEND
        // 1. PUNTO DE CONTACTO RELATIVO (0-1)
        const contactPoint = (this.gameState.ball.y - paddle.y) / paddle.height;
        const normalizedContact = Math.max(0, Math.min(1, contactPoint));
        
        // 2. ÁNGULO DE REBOTE DINÁMICO
        const maxAngle = Math.PI / 3; // 60° máximo
        const angle = (normalizedContact - 0.5) * maxAngle;
        
        // 3. ACELERACIÓN PROGRESIVA
        const currentSpeed = Math.sqrt(this.gameState.ball.vx * this.gameState.ball.vx + 
                                     this.gameState.ball.vy * this.gameState.ball.vy);
        const newSpeed = Math.min(currentSpeed * 1.05, 12); // Velocidad máxima 12
        
        // 4. DIRECCIÓN BASADA EN QUÉ PALA GOLPEÓ
        const direction = side === 'left' ? 1 : -1;
        
        // 5. NUEVAS VELOCIDADES VECTORIALES
        this.gameState.ball.vx = newSpeed * Math.cos(angle) * direction;
        this.gameState.ball.vy = newSpeed * Math.sin(angle);
        
        // 6. POSICIONAMIENTO ANTI-CLIPPING
        if (side === 'left') {
            this.gameState.ball.x = paddle.x + paddle.width + this.gameState.ball.radius;
        } else {
            this.gameState.ball.x = paddle.x - this.gameState.ball.radius;
        }
        
        // 7. INCREMENTAR CONTADOR DE RALLIES
        this.gameState.rallieCount++;
    }

    private updateAI(): void {
        // ALGORITMO DE IA IDÉNTICO AL FRONTEND
        const aiPaddle = this.gameState.paddles.right;
        const ball = this.gameState.ball;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        const ballCenter = ball.y;
        
        // AI movement based on difficulty - EXACTO COMO EL FRONTEND
        let aiSpeed, threshold;
        
        switch (this.aiDifficulty) {
            case 'easy':
                aiSpeed = 2;
                threshold = 50; // Zona muerta amplia
                break;
            case 'medium':
                aiSpeed = 3;
                threshold = 30; // Zona muerta media
                break;
            case 'hard':
                aiSpeed = 4;
                threshold = 10; // Zona muerta pequeña
                break;
        }
        
        const difference = ballCenter - paddleCenter;
        
        // Solo mover si la diferencia es mayor al threshold
        if (Math.abs(difference) > threshold) {
            if (difference > 0 && aiPaddle.y < this.gameState.canvas.height - aiPaddle.height) {
                aiPaddle.y += aiSpeed;
            } else if (difference < 0 && aiPaddle.y > 0) {
                aiPaddle.y -= aiSpeed;
            }
        }
    }

    private resetBall(): void {
        // RESET IDÉNTICO AL FRONTEND
        this.gameState.ball.x = this.gameState.canvas.width / 2;  // Centro X (400)
        this.gameState.ball.y = this.gameState.canvas.height / 2; // Centro Y (300)
        this.gameState.ball.vx = Math.random() > 0.5 ? 5 : -5;    // Velocidad inicial aleatoria
        this.gameState.ball.vy = (Math.random() - 0.5) * 6;      // Ángulo vertical aleatorio
        this.gameState.rallieCount = 0;                          // Reset contador de rallies
    }

    private checkGameEnd(): void {
        if (this.gameState.score.left >= this.gameState.maxScore || 
            this.gameState.score.right >= this.gameState.maxScore) {
            this.stop();
        }
    }

    public handlePlayerInput(playerId: string, input: any): void {
        if (!this.gameState.gameRunning) {
            console.log(`⚠️ Game not running, ignoring input from ${playerId}`);
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.log(`❌ Player not found: ${playerId}`);
            return;
        }

        const { direction, type, playerNumber } = input;
        // Velocidad ajustada para comandos a 20 FPS (cada 50ms)
        const speed = 5; // Aumentado de 3 a 5 para compensar menor frecuencia

        console.log(`🎮 handlePlayerInput: player ${player.name} (${player.number}) direction: ${direction}, playerNumber: ${playerNumber}`);

        if (type === 'move' || !type) { // Compatibilidad con ambos protocolos
            // Usar playerNumber si está disponible, sino usar player.number
            const paddleNumber = playerNumber || player.number;
            const paddle = paddleNumber === 1 ? this.gameState.paddles.left : this.gameState.paddles.right;
            
            console.log(`🏓 Moving paddle ${paddleNumber} (${paddleNumber === 1 ? 'left' : 'right'}) ${direction}`);
            
            switch (direction) {
                case 'up':
                    if (paddle.y > 0) {
                        const oldY = paddle.y;
                        paddle.y = Math.max(0, paddle.y - speed);
                        console.log(`⬆️ Paddle ${paddleNumber} moved from ${oldY} to ${paddle.y}`);
                    } else {
                        console.log(`⬆️ Paddle ${paddleNumber} already at top`);
                    }
                    break;
                case 'down':
                    if (paddle.y < this.gameState.canvas.height - paddle.height) {
                        const oldY = paddle.y;
                        paddle.y = Math.min(this.gameState.canvas.height - paddle.height, paddle.y + speed);
                        console.log(`⬇️ Paddle ${paddleNumber} moved from ${oldY} to ${paddle.y}`);
                    } else {
                        console.log(`⬇️ Paddle ${paddleNumber} already at bottom`);
                    }
                    break;
                default:
                    console.log(`❓ Unknown direction: ${direction}`);
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
