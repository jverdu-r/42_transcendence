import { PlayerInfo } from './playerDisplay';

export interface GameState {
    ball: { x: number, y: number, vx: number, vy: number, radius: number };
    paddles: {
        left: { x: number, y: number, width: number, height: number },
        right: { x: number, y: number, width: number, height: number }
    };
    score: { left: number, right: number };
    keys: { [key: string]: boolean };
    gameRunning: boolean;
    gameStartTime: Date | null;
    maxScore: number;
    canvas: {
        width: number;
        height: number;
    };
}

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: GameState;
    private animationId: number | null = null;
    private player1Info: PlayerInfo | null = null;
    private player2Info: PlayerInfo | null = null;
    private mode: 'local' | 'online';
    private onScoreUpdate?: (score: { left: number, right: number }) => void;
    private onGameEnd?: (winner: string, score: { left: number, right: number }) => void;
    private onStatusUpdate?: (status: string) => void;

    constructor(canvas: HTMLCanvasElement, mode: 'local' | 'online' = 'local') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.mode = mode;
        
        // Configurar dimensiones del canvas - EXACTAS como en el backup
        this.canvas.width = 600;
        this.canvas.height = 400;
        
        this.gameState = {
            ball: { x: 300, y: 200, vx: 5, vy: 3, radius: 10 },
            paddles: {
                left: { x: 20, y: 160, width: 15, height: 80 },
                right: { x: 565, y: 160, width: 15, height: 80 }
            },
            score: { left: 0, right: 0 },
            keys: {
                w: false, s: false,
                ArrowUp: false, ArrowDown: false
            },
            gameRunning: false,
            gameStartTime: null,
            maxScore: 5, // Exactamente como en el backup
            canvas: {
                width: 600,
                height: 400
            }
        };

        this.setupEventListeners();
        this.draw();
    }

    private setupEventListeners(): void {
        if (this.mode === 'local') {
            document.addEventListener('keydown', (e) => {
                if (e.key in this.gameState.keys) {
                    this.gameState.keys[e.key as keyof typeof this.gameState.keys] = true;
                }
            });

            document.addEventListener('keyup', (e) => {
                if (e.key in this.gameState.keys) {
                    this.gameState.keys[e.key as keyof typeof this.gameState.keys] = false;
                }
            });
        }
    }

    public setPlayerInfo(player1: PlayerInfo, player2: PlayerInfo): void {
        this.player1Info = player1;
        this.player2Info = player2;
    }

    public setCallbacks(callbacks: {
        onScoreUpdate?: (score: { left: number, right: number }) => void;
        onGameEnd?: (winner: string, score: { left: number, right: number }) => void;
        onStatusUpdate?: (status: string) => void;
    }): void {
        this.onScoreUpdate = callbacks.onScoreUpdate;
        this.onGameEnd = callbacks.onGameEnd;
        this.onStatusUpdate = callbacks.onStatusUpdate;
    }

    public startGame(): void {
        if (!this.gameState.gameStartTime) {
            this.gameState.gameStartTime = new Date();
        }
        this.gameState.gameRunning = true;
        this.onStatusUpdate?.('🎮 ¡Juego iniciado! Usa las teclas asignadas para mover');
        this.gameLoop();
    }

    public pauseGame(): void {
        this.gameState.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.onStatusUpdate?.('⏸️ Juego pausado');
    }

    public resetGame(): void {
        this.pauseGame();
        this.gameState.score = { left: 0, right: 0 };
        this.gameState.gameStartTime = null;
        this.resetBall();
        this.onScoreUpdate?.(this.gameState.score);
        this.draw();
        this.onStatusUpdate?.('🔄 Presiona \'Iniciar Juego\' para comenzar');
    }

    public updateGameState(newState: Partial<GameState>): void {
        // Para modo online - actualizar desde el servidor
        if (newState.ball) this.gameState.ball = newState.ball;
        if (newState.paddles) this.gameState.paddles = newState.paddles;
        if (newState.score) {
            this.gameState.score = newState.score;
            this.onScoreUpdate?.(this.gameState.score);
        }
        this.draw();
    }

    private gameLoop(): void {
        if (!this.gameState.gameRunning) return;
        
        if (this.mode === 'local') {
            this.updatePaddles();
            this.updateBall();
        }
        
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    private updatePaddles(): void {
        const speed = 5; // Velocidad exacta del backup
        
        // Jugador 1 (izquierda)
        if (this.gameState.keys.w && this.gameState.paddles.left.y > 0) {
            this.gameState.paddles.left.y -= speed;
        }
        if (this.gameState.keys.s && this.gameState.paddles.left.y < this.canvas.height - this.gameState.paddles.left.height) {
            this.gameState.paddles.left.y += speed;
        }
        
        // Jugador 2 (derecha)
        if (this.gameState.keys.ArrowUp && this.gameState.paddles.right.y > 0) {
            this.gameState.paddles.right.y -= speed;
        }
        if (this.gameState.keys.ArrowDown && this.gameState.paddles.right.y < this.canvas.height - this.gameState.paddles.right.height) {
            this.gameState.paddles.right.y += speed;
        }
    }

    private updateBall(): void {
        this.gameState.ball.x += this.gameState.ball.vx;
        this.gameState.ball.y += this.gameState.ball.vy;
        
        // Rebote en paredes superior e inferior
        if (this.gameState.ball.y <= this.gameState.ball.radius || 
            this.gameState.ball.y >= this.canvas.height - this.gameState.ball.radius) {
            this.gameState.ball.vy *= -1;
        }
        
        // Colisión con palas - EXACTA del backup
        const leftPaddle = this.gameState.paddles.left;
        const rightPaddle = this.gameState.paddles.right;
        
        if (this.gameState.ball.x <= leftPaddle.x + leftPaddle.width &&
            this.gameState.ball.y >= leftPaddle.y &&
            this.gameState.ball.y <= leftPaddle.y + leftPaddle.height &&
            this.gameState.ball.vx < 0) {
            this.gameState.ball.vx *= -1;
        }
        
        if (this.gameState.ball.x >= rightPaddle.x &&
            this.gameState.ball.y >= rightPaddle.y &&
            this.gameState.ball.y <= rightPaddle.y + rightPaddle.height &&
            this.gameState.ball.vx > 0) {
            this.gameState.ball.vx *= -1;
        }
        
        // Puntuación
        if (this.gameState.ball.x < 0) {
            this.gameState.score.right++;
            this.resetBall();
            this.onScoreUpdate?.(this.gameState.score);
            this.checkGameEnd();
        } else if (this.gameState.ball.x > this.canvas.width) {
            this.gameState.score.left++;
            this.resetBall();
            this.onScoreUpdate?.(this.gameState.score);
            this.checkGameEnd();
        }
    }

    private resetBall(): void {
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        this.gameState.ball.vx = Math.random() > 0.5 ? 5 : -5;
        this.gameState.ball.vy = (Math.random() - 0.5) * 6;
    }

    private checkGameEnd(): void {
        if (this.gameState.score.left >= this.gameState.maxScore || 
            this.gameState.score.right >= this.gameState.maxScore) {
            this.gameState.gameRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            const winner = this.gameState.score.left > this.gameState.score.right ? 
                (this.player1Info?.displayName || 'Jugador 1') : 
                (this.player2Info?.displayName || 'Jugador 2');
            
            this.onGameEnd?.(winner, this.gameState.score);
        }
    }

    private draw(): void {
        // Limpiar canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar línea central
        this.ctx.strokeStyle = 'white';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        
        // Dibujar palas
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            this.gameState.paddles.left.x, 
            this.gameState.paddles.left.y, 
            this.gameState.paddles.left.width, 
            this.gameState.paddles.left.height
        );
        this.ctx.fillRect(
            this.gameState.paddles.right.x, 
            this.gameState.paddles.right.y, 
            this.gameState.paddles.right.width, 
            this.gameState.paddles.right.height
        );
        
        // Dibujar pelota
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.ball.x, this.gameState.ball.y, this.gameState.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    public getGameStartTime(): Date | null {
        return this.gameState.gameStartTime;
    }

    public cleanup(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        // Remover event listeners si es necesario
        if (this.mode === 'local') {
            // Los event listeners se remueven automáticamente al cambiar de página
        }
    }
}
