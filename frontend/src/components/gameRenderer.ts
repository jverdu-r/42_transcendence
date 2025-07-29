import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { PlayerDisplay, PlayerInfo } from '../components/playerDisplay';

export interface GameState {
    pelota: { x: number, y: number, vx: number, vy: number, radio: number };
    palas: {
        jugador1: { x: number, y: number },
        jugador2: { x: number, y: number }
    };
    puntuacion: { jugador1: number, jugador2: number };
    palaAncho: number;
    palaAlto: number;
    ancho: number;
    alto: number;
    enJuego: boolean;
    rallyCount?: number;
}

export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameMode: 'local' | 'online' | 'ai';
    private gameState: GameState;
    public player1Info: PlayerInfo | null = null;
    public player2Info: PlayerInfo | null = null;
    private animationId?: number;
    public gameStartTime?: Date;
    private maxScore = 8;
    private keys: { [key: string]: boolean } = {};
    private isGameRunning = false;
    
    constructor(canvas: HTMLCanvasElement, gameMode: 'local' | 'online' | 'ai') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.gameMode = gameMode;
        
        // Configurar dimensiones del canvas
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Inicializar estado del juego
        this.gameState = {
            pelota: { x: 400, y: 300, vx: 5, vy: 3, radio: 10 },
            palas: {
                jugador1: { x: 50, y: 250 },
                jugador2: { x: 730, y: 250 }
            },
            puntuacion: { jugador1: 0, jugador2: 0 },
            palaAncho: 20,
            palaAlto: 100,
            ancho: 800,
            alto: 600,
            enJuego: false
        };
        
        this.setupEventListeners();
        this.drawInitialState();
    }
    
    private setupEventListeners(): void {
        if (this.gameMode === 'local') {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        }
    }
    
    private handleKeyDown(e: KeyboardEvent): void {
        this.keys[e.key] = true;
    }
    
    private handleKeyUp(e: KeyboardEvent): void {
        this.keys[e.key] = false;
    }
    
    public updateGameState(newState: Partial<GameState>): void {
        this.gameState = { ...this.gameState, ...newState };
        this.draw();
    }
    
    public draw(): void {
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
            this.gameState.palas.jugador1.x,
            this.gameState.palas.jugador1.y,
            this.gameState.palaAncho,
            this.gameState.palaAlto
        );
        
        this.ctx.fillRect(
            this.gameState.palas.jugador2.x,
            this.gameState.palas.jugador2.y,
            this.gameState.palaAncho,
            this.gameState.palaAlto
        );
        
        // Dibujar pelota
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.pelota.x,
            this.gameState.pelota.y,
            this.gameState.pelota.radio,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
    }
    
    public drawInitialState(): void {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar línea central
        this.ctx.strokeStyle = 'white';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        
        // Texto de espera
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Esperando...', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    public startLocalGame(): void {
        if (this.gameMode !== 'local') return;
        
        this.isGameRunning = true;
        this.gameStartTime = new Date();
        this.gameState.enJuego = true;
        this.gameLoop();
    }
    
    public pauseGame(): void {
        this.isGameRunning = false;
        this.gameState.enJuego = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    public resetGame(): void {
        this.pauseGame();
        this.gameState.puntuacion = { jugador1: 0, jugador2: 0 };
        this.gameState.pelota = { x: 400, y: 300, vx: 5, vy: 3, radio: 10 };
        this.gameState.palas = {
            jugador1: { x: 50, y: 250 },
            jugador2: { x: 730, y: 250 }
        };
        this.gameStartTime = undefined;
        this.draw();
        this.updateScore();
    }
    
    private gameLoop(): void {
        if (!this.isGameRunning || this.gameMode !== 'local') return;
        
        this.updatePaddles();
        this.updateBall();
        this.draw();
        this.updateScore();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    private updatePaddles(): void {
        const speed = 8;
        
        // Jugador 1 (W/S)
        if (this.keys['w'] || this.keys['W']) {
            this.gameState.palas.jugador1.y = Math.max(0, this.gameState.palas.jugador1.y - speed);
        }
        if (this.keys['s'] || this.keys['S']) {
            this.gameState.palas.jugador1.y = Math.min(
                this.canvas.height - this.gameState.palaAlto,
                this.gameState.palas.jugador1.y + speed
            );
        }
        
        // Jugador 2 (Flechas)
        if (this.keys['ArrowUp']) {
            this.gameState.palas.jugador2.y = Math.max(0, this.gameState.palas.jugador2.y - speed);
        }
        if (this.keys['ArrowDown']) {
            this.gameState.palas.jugador2.y = Math.min(
                this.canvas.height - this.gameState.palaAlto,
                this.gameState.palas.jugador2.y + speed
            );
        }
    }
    
    private updateBall(): void {
        this.gameState.pelota.x += this.gameState.pelota.vx;
        this.gameState.pelota.y += this.gameState.pelota.vy;
        
        // Rebote en paredes superior e inferior
        if (this.gameState.pelota.y <= this.gameState.pelota.radio || 
            this.gameState.pelota.y >= this.canvas.height - this.gameState.pelota.radio) {
            this.gameState.pelota.vy *= -1;
        }
        
        // Colisión con palas
        if (this.checkCollision(this.gameState.palas.jugador1) && this.gameState.pelota.vx < 0) {
            this.gameState.pelota.vx *= -1;
        }
        
        if (this.checkCollision(this.gameState.palas.jugador2) && this.gameState.pelota.vx > 0) {
            this.gameState.pelota.vx *= -1;
        }
        
        // Puntuación
        if (this.gameState.pelota.x < 0) {
            this.gameState.puntuacion.jugador2++;
            this.resetBall();
            this.checkGameEnd();
        } else if (this.gameState.pelota.x > this.canvas.width) {
            this.gameState.puntuacion.jugador1++;
            this.resetBall();
            this.checkGameEnd();
        }
    }
    
    private checkCollision(pala: { x: number, y: number }): boolean {
        return (
            this.gameState.pelota.x - this.gameState.pelota.radio < pala.x + this.gameState.palaAncho &&
            this.gameState.pelota.x + this.gameState.pelota.radio > pala.x &&
            this.gameState.pelota.y - this.gameState.pelota.radio < pala.y + this.gameState.palaAlto &&
            this.gameState.pelota.y + this.gameState.pelota.radio > pala.y
        );
    }
    
    private resetBall(): void {
        this.gameState.pelota.x = this.canvas.width / 2;
        this.gameState.pelota.y = this.canvas.height / 2;
        this.gameState.pelota.vx = Math.random() > 0.5 ? 5 : -5;
        this.gameState.pelota.vy = (Math.random() - 0.5) * 6;
    }
    
    private checkGameEnd(): void {
        if (this.gameState.puntuacion.jugador1 >= this.maxScore || 
            this.gameState.puntuacion.jugador2 >= this.maxScore) {
            this.pauseGame();
            this.showGameResult();
        }
    }
    
    private showGameResult(): void {
        const winner = this.gameState.puntuacion.jugador1 > this.gameState.puntuacion.jugador2 ? 
            this.player1Info?.displayName || 'Jugador 1' : 
            this.player2Info?.displayName || 'Jugador 2';
        
        const isPlayer1Winner = this.gameState.puntuacion.jugador1 > this.gameState.puntuacion.jugador2;
        
        // Crear evento personalizado para mostrar el resultado
        const event = new CustomEvent('gameEnd', {
            detail: {
                winner,
                isPlayer1Winner,
                score: this.gameState.puntuacion,
                gameData: this.gameState
            }
        });
        
        document.dispatchEvent(event);
    }
    
    public updateScore(): void {
        const score1Element = document.getElementById('score1');
        const score2Element = document.getElementById('score2');
        
        if (score1Element) {
            score1Element.textContent = this.gameState.puntuacion.jugador1.toString();
        }
        if (score2Element) {
            score2Element.textContent = this.gameState.puntuacion.jugador2.toString();
        }
    }
    
    public setPlayerInfo(player1: PlayerInfo, player2: PlayerInfo): void {
        this.player1Info = player1;
        this.player2Info = player2;
    }
    
    public cleanup(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    }
}
