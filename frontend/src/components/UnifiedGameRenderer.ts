/**
 * Unified Game Renderer - Handles all game modes (Local, Online, AI)
 * This is the single rendering system for all Pong game variations
 */

import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { PlayerDisplay, PlayerInfo } from './playerDisplay';
import { showNotification, checkRankingChange } from '../utils/utils';

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
    rallieCount?: number;
}

export interface GameCallbacks {
    onScoreUpdate?: (score: { left: number; right: number }) => void;
    onGameEnd?: (winner: string, score: { left: number; right: number }) => void;
    onStatusUpdate?: (status: string) => void;
    onGameStateUpdate?: (state: UnifiedGameState) => void;
}

interface GameNotificationEvent {
  message: string;
  type?: 'toast' | 'snackbar';
  duration?: number;
}

export type GameMode = 'local' | 'online' | 'ai';

export class UnifiedGameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: UnifiedGameState = {} as UnifiedGameState;
    private gameMode: GameMode;
    private animationId: number | null = null;
    
    // Player information
    private player1Info: PlayerInfo | null = null;
    private player2Info: PlayerInfo | null = null;
    
    // Game callbacks
    private callbacks: GameCallbacks = {};
    
    // Input handling
    private keys: { [key: string]: boolean } = {};
    private gameStartTime: Date | null = null;
    
    // Online game properties
    private gameId?: string;
    private websocket?: WebSocket;
    private playerNumber?: number;
    private playerId?: string;
    
    // AI properties
    private aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    private aiSpeed: number = 3;

    // Allow external (lobby) setup of WebSocket for online mode
    public setWebSocketConnection(ws: WebSocket, gameId: string) {
        this.websocket = ws;
        this.gameId = gameId;
    }
    
    constructor(canvas: HTMLCanvasElement, mode: GameMode) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.gameMode = mode;
        
        // Set standard canvas dimensions
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.initializeGameState();
        this.setupEventListeners();
        this.drawInitialState();
        
        document.addEventListener('gameNotification', (e: Event) => {
            const customEvent = e as CustomEvent<GameNotificationEvent>;
            const { message, type = 'toast', duration = 5000 } = customEvent.detail;
            showNotification(message, type, duration);
        });

        document.addEventListener('rankingUpdate', (e: Event) => {
            checkRankingChange();
        });
    }
    
    private initializeGameState(): void {
        this.gameState = {
            ball: {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: 4, // Velocidad inicial más controlada
                vy: 2, // Velocidad inicial más controlada
                radius: 8 // Radio ligeramente más pequeño para mejor precisión
            },
            paddles: {
                left: {
                    x: 30,
                    y: (this.canvas.height - 100) / 2,
                    width: 15, // Palas más delgadas como el original
                    height: 100
                },
                right: {
                    x: this.canvas.width - 45, // Ajustado para la nueva anchura
                    y: (this.canvas.height - 100) / 2,
                    width: 15, // Palas más delgadas como el original
                    height: 100
                }
            },
            score: { left: 0, right: 0 },
            gameRunning: false,
            canvas: { width: this.canvas.width, height: this.canvas.height },
            maxScore: 5,
            rallieCount: 0
        };
    }
    
    private setupEventListeners(): void {
        console.log("[UnifiedGameRenderer] setupEventListeners called, mode:", this.gameMode);
        if (this.gameMode === 'local' || this.gameMode === 'ai' || this.gameMode === 'online') {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        }
    }
    
    private handleKeyDown(e: KeyboardEvent): void {
        console.log("[UnifiedGameRenderer] handleKeyDown", e.key, "mode:", this.gameMode);
        this.keys[e.key] = true;
        // Send only 'up'/'down' (classic backend protocol)
        if (this.gameMode === 'online' && this.websocket && this.gameId) {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                this.sendPlayerMove('up');
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                this.sendPlayerMove('down');
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keys[e.key] = false;
        // Do NOT send anything on keyup for classic server
    }

    /**
     * For classic backend: send only up/down as soon as pressed. Never send 'stop'.
     */
    private sendPlayerMove(direction: 'up' | 'down'): void {
        if (!this.websocket) return;
        const msg = {
            type: 'playerMove',
            data: { direction }
        };
        console.log('[WebSocket] Sending playerMove:', msg);
        this.websocket.send(JSON.stringify(msg));
    }
    
    public setPlayerInfo(player1: PlayerInfo, player2: PlayerInfo): void {
        this.player1Info = player1;
        this.player2Info = player2;
    }
    
    public setCallbacks(callbacks: GameCallbacks): void {
        this.callbacks = callbacks;
    }
    
    public setAIDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
        this.aiDifficulty = difficulty;
        this.aiSpeed = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    }
    
    /**
     * Connect to online game. Save both playerNumber and playerId assigned by backend.
     */
    public connectToOnlineGame(gameId: string, playerNumber: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.gameMode !== 'online') {
                reject(new Error('Not in online mode'));
                return;
            }

            // Prompt for LAN host/IP
            let serverHost = window.prompt('Introduce la IP o hostname del host (LAN):', window.location.hostname);
            if (!serverHost) serverHost = window.location.hostname;
            
            this.gameId = gameId;
            this.playerNumber = playerNumber;
            
            // Connect to WebSocket
            const currentUser = getCurrentUser();
            const username = currentUser?.username || 'Usuario';
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${serverHost}:8002/pong/${gameId}?username=${encodeURIComponent(username)}`;
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log(`🔗 Connected to game ${gameId} at ${wsUrl}`);
                resolve(true);
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // On gameJoined/gameCreated, record playerId
                    if (message.type === 'gameJoined' && message.data) {
                        this.playerId = message.data.playerId;
                    }
                    if (message.type === 'gameCreated' && message.data) {
                        this.playerId = message.data.playerId;
                    }
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.websocket.onclose = () => {
                console.log('🔌 WebSocket connection closed');
                this.callbacks.onStatusUpdate?.('🔌 Conexión perdida');
            };
        });
    }
    
    public handleWebSocketMessage(message: any): void {
        const { type, data } = message;
        console.log('[WebSocket] Message received:', message); // Log everything
        switch (type) {
            case 'gameState':
                if (data.gameState) {
                    this.updateGameState(data.gameState);
                }
                break;
            case 'gameStarted':
                this.startGame();
                break;
            case 'gameEnded':
                this.endGame(data.winner, data.score);
                break;
            case 'playerJoined':
                this.callbacks.onStatusUpdate?.(`🎮 ${data.playerName} se ha unido al juego`);
                break;
            case 'playerLeft':
                this.callbacks.onStatusUpdate?.(`👋 Un jugador ha abandonado el juego`);
                break;
            case 'error':
                this.callbacks.onStatusUpdate?.(`❌ Error: ${data.message}`);
                break;
            default:
                console.warn('[WebSocket] Unknown message type:', type, message);
        }
    }
    
    public startGame(): void {
        if (!this.gameStartTime) {
            this.gameStartTime = new Date();
        }
        
        this.gameState.gameRunning = true;
        this.callbacks.onStatusUpdate?.('🎮 ¡Juego iniciado!');
        
        // Draw the initial game state
        this.draw();
        
        // Start game loop based on mode
        if (this.gameMode === 'local' || this.gameMode === 'ai') {
            this.gameLoop();
        }
        // For online mode, the server handles the game loop and sends us state updates
    }
    
    public pauseGame(): void {
        this.gameState.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.callbacks.onStatusUpdate?.('⏸️ Juego pausado');
    }
    
    public resetGame(): void {
        this.pauseGame();
        this.initializeGameState();
        this.gameStartTime = null;
        this.draw();
        this.callbacks.onScoreUpdate?.(this.gameState.score);
        this.callbacks.onStatusUpdate?.('🔄 Preparando la partida...');
    }
    
    public updateGameState(newState: Partial<UnifiedGameState>): void {
        // Update game state (used for online mode)
        if (newState.ball) this.gameState.ball = newState.ball;
        if (newState.paddles) this.gameState.paddles = newState.paddles;
        if (newState.score) {
            this.gameState.score = newState.score;
            this.callbacks.onScoreUpdate?.(this.gameState.score);
        }
        if (newState.gameRunning !== undefined) this.gameState.gameRunning = newState.gameRunning;
        
        this.draw();
        this.callbacks.onGameStateUpdate?.(this.gameState);
    }
    
    private gameLoop(): void {
        if (!this.gameState.gameRunning) return;
        
        this.updatePaddles();
        this.updateBall();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    private updatePaddles(): void {
        const speed = 6;
        
        // Left paddle (Player 1)
        if ((this.keys['w'] || this.keys['W']) && this.gameState.paddles.left.y > 0) {
            this.gameState.paddles.left.y -= speed;
        }
        if ((this.keys['s'] || this.keys['S']) && 
            this.gameState.paddles.left.y < this.canvas.height - this.gameState.paddles.left.height) {
            this.gameState.paddles.left.y += speed;
        }
        
        // Right paddle
        if (this.gameMode === 'local') {
            // Player 2 controls, now 'o' (up) and 'l' (down)
            if ((this.keys['o'] || this.keys['O']) && this.gameState.paddles.right.y > 0) {
                this.gameState.paddles.right.y -= speed;
            }
            if ((this.keys['l'] || this.keys['L']) && 
                this.gameState.paddles.right.y < this.canvas.height - this.gameState.paddles.right.height) {
                this.gameState.paddles.right.y += speed;
            }
        } else if (this.gameMode === 'ai') {
            // AI control
            this.updateAI();
        }
    }
    
    private updateAI(): void {
        const aiPaddle = this.gameState.paddles.right;
        const ball = this.gameState.ball;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;
        const ballCenter = ball.y;
        
        // AI movement based on difficulty
        const difference = ballCenter - paddleCenter;
        const threshold = this.aiDifficulty === 'easy' ? 50 : this.aiDifficulty === 'medium' ? 30 : 10;
        
        if (Math.abs(difference) > threshold) {
            if (difference > 0 && aiPaddle.y < this.canvas.height - aiPaddle.height) {
                aiPaddle.y += this.aiSpeed;
            } else if (difference < 0 && aiPaddle.y > 0) {
                aiPaddle.y -= this.aiSpeed;
            }
        }
    }
    
    private updateBall(): void {
        this.gameState.ball.x += this.gameState.ball.vx;
        this.gameState.ball.y += this.gameState.ball.vy;
        
        // Rebotes en paredes superior e inferior (física original del Pong)
        if (this.gameState.ball.y <= this.gameState.ball.radius) {
            this.gameState.ball.y = this.gameState.ball.radius;
            this.gameState.ball.vy = Math.abs(this.gameState.ball.vy); // Asegurar rebote hacia abajo
        } else if (this.gameState.ball.y >= this.canvas.height - this.gameState.ball.radius) {
            this.gameState.ball.y = this.canvas.height - this.gameState.ball.radius;
            this.gameState.ball.vy = -Math.abs(this.gameState.ball.vy); // Asegurar rebote hacia arriba
        }
        
        // Paddle collisions
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
        
        // Scoring
        if (this.gameState.ball.x < 0) {
            this.gameState.score.right++;
            this.resetBall();
            this.callbacks.onScoreUpdate?.(this.gameState.score);
            this.checkGameEnd();
        } else if (this.gameState.ball.x > this.canvas.width) {
            this.gameState.score.left++;
            this.resetBall();
            this.callbacks.onScoreUpdate?.(this.gameState.score);
            this.checkGameEnd();
        }
    }
    
    private resetBall(): void {
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        this.gameState.ball.vx = Math.random() > 0.5 ? 5 : -5;
        this.gameState.ball.vy = (Math.random() - 0.5) * 6;
        this.gameState.rallieCount = 0;
    }
    
    private checkGameEnd(): void {
        if (this.gameState.score.left >= this.gameState.maxScore || 
            this.gameState.score.right >= this.gameState.maxScore) {
            
            const winner = this.gameState.score.left >= this.gameState.maxScore ? 
                (this.player1Info?.displayName || 'Jugador 1') : 
                (this.player2Info?.displayName || 'Jugador 2');
            
            this.endGame(winner, this.gameState.score);
        }
    }
    
    private endGame(winner: string, score: { left: number; right: number }): void {
        this.gameState.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.callbacks.onGameEnd?.(winner, score);
    }

    public draw(): void {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw center line
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.setLineDash([10, 10]);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw paddles
        this.ctx.fillStyle = '#FFFFFF';
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
        
        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.ball.x,
            this.gameState.ball.y,
            this.gameState.ball.radius,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
    }
    
    private drawInitialState(): void {
        this.draw();
        
        // Draw waiting message
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Preparando la partida...', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        if (this.gameMode === 'local') {
            this.ctx.fillText('Jugador 1: W/S - Jugador 2: O/L', this.canvas.width / 2, this.canvas.height / 2 + 40);
        } else if (this.gameMode === 'ai') {
            this.ctx.fillText('Jugador: W/S - IA controlada automáticamente', this.canvas.width / 2, this.canvas.height / 2 + 40);
        } else if (this.gameMode === 'online') {
            this.ctx.fillText('Conectando al juego online...', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }
    
    public getGameState(): UnifiedGameState {
        return { ...this.gameState };
    }
    
    public getGameStartTime(): Date | null {
        return this.gameStartTime;
    }
    

    /**
     * Maneja las colisiones con las palas de manera realista como el Pong original
     */
    private handlePaddleCollision(paddle: any, side: 'left' | 'right'): void {
        // Calcular el punto de contacto relativo en la pala (0 = arriba, 1 = abajo)
        const contactPoint = (this.gameState.ball.y - paddle.y) / paddle.height;
        const normalizedContact = Math.max(0, Math.min(1, contactPoint)); // Clamp entre 0 y 1
        
        // Calcular el ángulo de rebote basado en el punto de contacto
        // En el centro (0.5) = ángulo 0, en los extremos = ángulo máximo
        const maxAngle = Math.PI / 3; // 60 grados máximo
        const angle = (normalizedContact - 0.5) * maxAngle;
        
        // Calcular la velocidad actual de la pelota
        const currentSpeed = Math.sqrt(this.gameState.ball.vx * this.gameState.ball.vx + 
                                     this.gameState.ball.vy * this.gameState.ball.vy);
        
        // Incrementar ligeramente la velocidad con cada rebote (como en el Pong original)
        const speedIncrease = 1.05;
        const newSpeed = Math.min(currentSpeed * speedIncrease, 12); // Límite máximo de velocidad
        
        // Calcular nuevas velocidades basadas en el ángulo
        if (side === 'left') {
            this.gameState.ball.vx = newSpeed * Math.cos(angle);
            this.gameState.ball.vy = newSpeed * Math.sin(angle);
            // Asegurar que la pelota se mueva hacia la derecha
            this.gameState.ball.vx = Math.abs(this.gameState.ball.vx);
            // Posicionar la pelota justo fuera de la pala para evitar colisiones múltiples
            this.gameState.ball.x = paddle.x + paddle.width + this.gameState.ball.radius;
        } else {
            this.gameState.ball.vx = -newSpeed * Math.cos(angle);
            this.gameState.ball.vy = newSpeed * Math.sin(angle);
            // Asegurar que la pelota se mueva hacia la izquierda
            this.gameState.ball.vx = -Math.abs(this.gameState.ball.vx);
            // Posicionar la pelota justo fuera de la pala para evitar colisiones múltiples
            this.gameState.ball.x = paddle.x - this.gameState.ball.radius;
        }
        
        // Incrementar contador de rallies
        this.gameState.rallieCount = (this.gameState.rallieCount || 0) + 1;
    }

    /**
     * Inicia una cuenta atrás visual antes de comenzar el juego
     */
    public startCountdown(callback?: () => void): void {
        let countdown = 3;
        
        const countdownLoop = () => {
            if (countdown > 0) {
                this.drawCountdown(countdown);
                countdown--;
                setTimeout(countdownLoop, 1000);
            } else {
                this.drawCountdown(0); // Mostrar "¡GO!"
                setTimeout(() => {
                    this.callbacks.onStatusUpdate?.('🎮 ¡Partida iniciada!');
                    this.startGame();
                    if (callback) callback();
                }, 800);
            }
        };
        
        this.callbacks.onStatusUpdate?.('⏰ Iniciando cuenta atrás...');
        countdownLoop();
    }
    
    /**
     * Dibuja la cuenta atrás en el canvas
     */
    private drawCountdown(count: number): void {
        // Limpiar canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar el campo de juego base
        this.drawGameField();
        
        // Dibujar el número de cuenta atrás o "GO"
        this.ctx.fillStyle = count > 0 ? '#FFD700' : '#00FF00'; // Amarillo para números, verde para GO
        this.ctx.font = 'bold 120px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const text = count > 0 ? count.toString() : '¡GO!';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
        
        // Añadir un efecto de sombra
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText(text, this.canvas.width / 2 + 3, this.canvas.height / 2 + 3);
    }
    
    /**
     * Dibuja los elementos básicos del campo (líneas, palas)
     */
    private drawGameField(): void {
        // Dibujar línea central
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.setLineDash([10, 10]);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Dibujar palas
        this.ctx.fillStyle = '#FFFFFF';
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
    }

        public cleanup(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    }
}
