/**
 * Unified Game Renderer - Handles all game modes (Local, Online, AI)
 * This is the single rendering system for all Pong game variations
 */

import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { getTranslation } from '../i18n';
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
    
    // Movement intervals para movimiento continuo
    private movementIntervals: { [key: string]: any } = {};
    
    // Nuevo sistema de movimiento continuo para online
    private paddleMovementState = {
        up: false,
        down: false
    };

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
            
            // Detectar pérdida de foco para limpiar movimientos
            window.addEventListener('blur', this.handleWindowBlur.bind(this));
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
    }
    
    private handleKeyDown(e: KeyboardEvent): void {
        // Marcar la tecla como presionada
        const wasPressed = this.keys[e.key];
        this.keys[e.key] = true;
        
        if (this.gameMode === 'online') {
            // NUEVO SISTEMA PARA ONLINE: Solo marcar estado de movimiento
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                if (!this.paddleMovementState.up) {
                    this.paddleMovementState.up = true;
                    this.sendPlayerMove('up');
                    console.log('[handleKeyDown] Started UP movement');
                }
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                if (!this.paddleMovementState.down) {
                    this.paddleMovementState.down = true;
                    this.sendPlayerMove('down');
                    console.log('[handleKeyDown] Started DOWN movement');
                }
            }
        } else {
            // SISTEMA ANTERIOR PARA LOCAL/AI
            if (!wasPressed) {
                console.log('[handleKeyDown] Key pressed:', e.key);
                this.startPaddleMovement(e.key);
            } else {
                // Si la tecla ya estaba presionada pero no hay intervalo, reiniciarlo
                const movementKeys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
                if (movementKeys.includes(e.key) && !this.movementIntervals[e.key]) {
                    console.log('[handleKeyDown] Restarting lost movement for key:', e.key);
                    this.startPaddleMovement(e.key);
                }
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        console.log('[handleKeyUp] Key released:', e.key);
        this.keys[e.key] = false;
        
        if (this.gameMode === 'online') {
            // NUEVO SISTEMA PARA ONLINE: Solo marcar estado de parada
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                this.paddleMovementState.up = false;
                console.log('[handleKeyUp] Stopped UP movement');
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                this.paddleMovementState.down = false;
                console.log('[handleKeyUp] Stopped DOWN movement');
            }
        } else {
            // SISTEMA ANTERIOR PARA LOCAL/AI
            const movementKeys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
            if (movementKeys.includes(e.key)) {
                this.stopPaddleMovement(e.key);
                console.log('[handleKeyUp] Stopped movement for key:', e.key);
            }
        }
    }

    private handleWindowBlur(): void {
        console.log('[handleWindowBlur] Window lost focus, clearing all movements');
        this.clearAllMovementIntervals();
    }

    private handleVisibilityChange(): void {
        if (document.hidden) {
            console.log('[handleVisibilityChange] Page became hidden, clearing all movements');
            this.clearAllMovementIntervals();
        }
    }

    /**
     * For classic backend: send only up/down as soon as pressed. Never send 'stop'.
     */
    private sendPlayerMove(direction: 'up' | 'down'): void {
        if (!this.websocket) {
            console.warn('[sendPlayerMove] No websocket connection');
            return;
        }
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
    
    public updatePlayerName(playerNumber: number, playerName: string): void {
        if (playerNumber === 1 && this.player1Info) {
            this.player1Info.displayName = playerName;
            this.player1Info.username = playerName;
        } else if (playerNumber === 2 && this.player2Info) {
            this.player2Info.displayName = playerName;
            this.player2Info.username = playerName;
        }
        console.log(`Updated player ${playerNumber} name to: ${playerName}`);
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

            // Use current hostname automatically
            const serverHost = window.location.hostname;
            
            this.gameId = gameId;
            this.playerNumber = playerNumber;
            
            // Connect to WebSocket
            const currentUser = getCurrentUser();
            const username = currentUser?.username || getTranslation('auth', 'defaultUser');
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
                    console.log('[WebSocket] Message received:', message); // Debug log
                    
                    // On gameJoined, update both playerId and playerNumber from server
                    if (message.type === 'gameJoined' && message.data) {
                        if (message.data.playerId) {
                            this.playerId = message.data.playerId;
                            console.log('[WebSocket] PlayerId assigned:', this.playerId);
                        }
                        if (message.data.playerNumber) {
                            this.playerNumber = message.data.playerNumber;
                            console.log('[WebSocket] PlayerNumber assigned:', this.playerNumber);
                        }
                    }
                    if (message.type === 'gameCreated' && message.data) {
                        if (message.data.playerId) {
                            this.playerId = message.data.playerId;
                            console.log('[WebSocket] PlayerId assigned (created):', this.playerId);
                        }
                        if (message.data.playerNumber) {
                            this.playerNumber = message.data.playerNumber;
                            console.log('[WebSocket] PlayerNumber assigned (created):', this.playerNumber);
                        }
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
                    // Actualizar nombres de jugadores si vienen del backend
                    if (data.gameState.playerNames) {
                        if (data.gameState.playerNames.left && this.player1Info) {
                            this.player1Info.displayName = data.gameState.playerNames.left;
                            this.player1Info.username = data.gameState.playerNames.left;
                        }
                        if (data.gameState.playerNames.right && this.player2Info) {
                            this.player2Info.displayName = data.gameState.playerNames.right;
                            this.player2Info.username = data.gameState.playerNames.right;
                        }
                    }
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
                // Update player information if we get new player data
                if (data.playerName && data.playerNumber) {
                    this.updatePlayerName(data.playerNumber, data.playerName);
                }
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
        } else if (this.gameMode === 'online') {
            // For online mode, start paddle update loop (server handles ball physics)
            this.paddleUpdateLoop();
        }
    }
    
    public pauseGame(): void {
        this.gameState.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Limpiar todos los intervalos de movimiento al pausar
        this.clearAllMovementIntervals();
        
        this.callbacks.onStatusUpdate?.('⏸️ Juego pausado');
    }
    
    public resetGame(): void {
        this.pauseGame();
        
        // Limpiar todos los intervals de movimiento usando la función centralizada
        this.clearAllMovementIntervals();
        
        this.initializeGameState();
        this.gameStartTime = null;
        this.draw();
        this.callbacks.onScoreUpdate?.(this.gameState.score);
        this.callbacks.onStatusUpdate?.('🔄 Preparando la partida...');
    }
    
    public updateGameState(newState: Partial<UnifiedGameState>): void {
        // Update game state (used for online mode)
        if (newState.ball) this.gameState.ball = newState.ball;
        if (newState.paddles) {
            if (this.gameMode === 'online') {
                // En modo online, actualizar solo ocasionalmente para sincronización
                // Permitir control local la mayoría del tiempo
                if (newState.paddles.left && this.playerNumber !== 1) {
                    // Solo actualizar paleta izquierda si no la controlo yo
                    this.gameState.paddles.left = newState.paddles.left;
                }
                if (newState.paddles.right && this.playerNumber !== 2) {
                    // Solo actualizar paleta derecha si no la controlo yo
                    this.gameState.paddles.right = newState.paddles.right;
                }
                console.log('[updateGameState] Selective update - my player:', this.playerNumber);
            } else {
                // Para modos local/AI, actualizar todas las paletas normalmente
                this.gameState.paddles = newState.paddles;
            }
        }
        if (newState.score) {
            this.gameState.score = newState.score;
            this.callbacks.onScoreUpdate?.(this.gameState.score);
        }
        if (newState.gameRunning !== undefined) this.gameState.gameRunning = newState.gameRunning;
        if (newState.rallieCount !== undefined) this.gameState.rallieCount = newState.rallieCount;
        
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
    
    private paddleUpdateLoop(): void {
        if (!this.gameState.gameRunning) {
            return;
        }
        
        // Only update local player paddle for online mode
        this.updateOnlinePaddles();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.paddleUpdateLoop());
    }
    
    private startPaddleMovement(key: string): void {
        // Solo procesar teclas de movimiento
        const movementKeys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
        if (!movementKeys.includes(key)) {
            return;
        }
        
        // Para modo online, no usar intervalos - el movimiento se maneja en paddleUpdateLoop
        if (this.gameMode === 'online') {
            console.log('[startPaddleMovement] Online mode - movement handled by paddleUpdateLoop');
            return;
        }
        
        // Si ya existe un intervalo para esta tecla, no crear otro
        if (this.movementIntervals[key]) {
            console.log('[startPaddleMovement] ⚠️ Interval already exists for key:', key);
            return;
        }
        
        // Movimiento inmediato al presionar
        this.movePaddle(key);
        
        // Para modos local/AI, usar intervalo con mayor frecuencia
        this.movementIntervals[key] = setInterval(() => {
            // Verificar que la tecla sigue presionada antes de mover
            if (this.keys[key]) {
                this.movePaddle(key);
                this.draw(); // Redibujar solo si se movió la paleta
            } else {
                // Si la tecla ya no está presionada, detener el movimiento
                console.log('[startPaddleMovement] Key released during interval, stopping:', key);
                this.stopPaddleMovement(key);
            }
        }, 8); // Aumentar frecuencia a ~120 FPS para movimiento más suave
        
        console.log('[startPaddleMovement] ✅ Started movement for key:', key);
        console.log('[startPaddleMovement] Active intervals:', Object.keys(this.movementIntervals));
    }
    
    private stopPaddleMovement(key: string): void {
        // Detener movimiento continuo
        if (this.movementIntervals[key]) {
            clearInterval(this.movementIntervals[key]);
            delete this.movementIntervals[key];
            console.log('[stopPaddleMovement] ✅ Stopped movement for key:', key);
        } else {
            console.log('[stopPaddleMovement] ⚠️ No interval found for key:', key);
        }
        
        // Debug: mostrar intervals activos
        console.log('[stopPaddleMovement] Active intervals:', Object.keys(this.movementIntervals));
    }
    
    private clearAllMovementIntervals(): void {
        console.log('[clearAllMovementIntervals] Clearing all movement intervals');
        Object.keys(this.movementIntervals).forEach(key => {
            clearInterval(this.movementIntervals[key]);
            delete this.movementIntervals[key];
        });
        
        // También resetear el estado de todas las teclas
        this.keys = {};
        
        // Resetear el nuevo estado de movimiento para online
        this.paddleMovementState = {
            up: false,
            down: false
        };
        
        console.log('[clearAllMovementIntervals] All intervals cleared and keys reset');
    }
    
    private movePaddle(key: string): void {
        const speed = 4; // Velocidad ajustada para movimiento más fluido
        
        if (this.gameMode === 'online') {
            // Para modo online, usar playerNumber
            if (!this.playerNumber) return;
            
            if (this.playerNumber === 1) {
                // Jugador 1 controla paleta izquierda
                if ((key === 'w' || key === 'W' || key === 'ArrowUp') && this.gameState.paddles.left.y > 0) {
                    this.gameState.paddles.left.y -= speed;
                    if (this.gameState.paddles.left.y < 0) this.gameState.paddles.left.y = 0;
                }
                if ((key === 's' || key === 'S' || key === 'ArrowDown') && 
                    this.gameState.paddles.left.y < this.canvas.height - this.gameState.paddles.left.height) {
                    this.gameState.paddles.left.y += speed;
                    if (this.gameState.paddles.left.y > this.canvas.height - this.gameState.paddles.left.height) {
                        this.gameState.paddles.left.y = this.canvas.height - this.gameState.paddles.left.height;
                    }
                }
            } else if (this.playerNumber === 2) {
                // Jugador 2 controla paleta derecha
                if ((key === 'w' || key === 'W' || key === 'ArrowUp') && this.gameState.paddles.right.y > 0) {
                    this.gameState.paddles.right.y -= speed;
                    if (this.gameState.paddles.right.y < 0) this.gameState.paddles.right.y = 0;
                }
                if ((key === 's' || key === 'S' || key === 'ArrowDown') && 
                    this.gameState.paddles.right.y < this.canvas.height - this.gameState.paddles.right.height) {
                    this.gameState.paddles.right.y += speed;
                    if (this.gameState.paddles.right.y > this.canvas.height - this.gameState.paddles.right.height) {
                        this.gameState.paddles.right.y = this.canvas.height - this.gameState.paddles.right.height;
                    }
                }
            }
        } else {
            // Para modos local/AI
            // Jugador 1 (izquierda)
            if ((key === 'w' || key === 'W' || key === 'ArrowUp') && this.gameState.paddles.left.y > 0) {
                this.gameState.paddles.left.y -= speed;
            }
            if ((key === 's' || key === 'S' || key === 'ArrowDown') && 
                this.gameState.paddles.left.y < this.canvas.height - this.gameState.paddles.left.height) {
                this.gameState.paddles.left.y += speed;
            }
            
            // Jugador 2 (derecha) solo en modo local
            if (this.gameMode === 'local') {
                if ((key === 'o' || key === 'O') && this.gameState.paddles.right.y > 0) {
                    this.gameState.paddles.right.y -= speed;
                }
                if ((key === 'l' || key === 'L') && 
                    this.gameState.paddles.right.y < this.canvas.height - this.gameState.paddles.right.height) {
                    this.gameState.paddles.right.y += speed;
                }
            }
        }
    }
    
    private updateOnlinePaddles(): void {
        if (!this.playerNumber) return;
        
        // NUEVO SISTEMA: Velocidad más alta para movimiento ultrasuave
        const speed = 6; 
        
        // Mover paleta basándose en el estado de movimiento continuo
        if (this.playerNumber === 1) {
            // Jugador 1 controla paleta izquierda
            if (this.paddleMovementState.up && this.gameState.paddles.left.y > 0) {
                this.gameState.paddles.left.y -= speed;
                if (this.gameState.paddles.left.y < 0) this.gameState.paddles.left.y = 0;
            }
            if (this.paddleMovementState.down && 
                this.gameState.paddles.left.y < this.canvas.height - this.gameState.paddles.left.height) {
                this.gameState.paddles.left.y += speed;
                if (this.gameState.paddles.left.y > this.canvas.height - this.gameState.paddles.left.height) {
                    this.gameState.paddles.left.y = this.canvas.height - this.gameState.paddles.left.height;
                }
            }
        } else if (this.playerNumber === 2) {
            // Jugador 2 controla paleta derecha
            if (this.paddleMovementState.up && this.gameState.paddles.right.y > 0) {
                this.gameState.paddles.right.y -= speed;
                if (this.gameState.paddles.right.y < 0) this.gameState.paddles.right.y = 0;
            }
            if (this.paddleMovementState.down && 
                this.gameState.paddles.right.y < this.canvas.height - this.gameState.paddles.right.height) {
                this.gameState.paddles.right.y += speed;
                if (this.gameState.paddles.right.y > this.canvas.height - this.gameState.paddles.right.height) {
                    this.gameState.paddles.right.y = this.canvas.height - this.gameState.paddles.right.height;
                }
            }
        }
    }
    
    private updatePaddles(): void {
        const speed = 4; // Velocidad consistente con otras funciones
        
        // Left paddle (Player 1) - W/S or Arrow Up/Down
        if ((this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) && this.gameState.paddles.left.y > 0) {
            this.gameState.paddles.left.y -= speed;
        }
        if ((this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) && 
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
    
    private updatePaddleImmediate(key: string, isKeyDown: boolean): void {
        // For immediate response, we'll trigger an immediate render after movement
        // This makes the paddle respond instantly to input while maintaining smooth frame-based movement
        if (isKeyDown) {
            if (this.gameMode === 'online') {
                this.updateOnlinePaddles();
            } else {
                this.updatePaddles();
            }
            this.draw();
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
        
        // Draw paddles with colors
        // Left paddle (verde para jugador)
        this.ctx.fillStyle = '#00ff00'; // Verde para jugador 1 siempre
        this.ctx.fillRect(
            this.gameState.paddles.left.x,
            this.gameState.paddles.left.y,
            this.gameState.paddles.left.width,
            this.gameState.paddles.left.height
        );
        
        // Right paddle (rojo para oponente/IA/jugador 2)
        this.ctx.fillStyle = '#ff0000'; // Rojo para oponente/IA/jugador 2 siempre
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
        
        // Draw player names and scores
        this.drawScoresAndPlayerNames();
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
            this.ctx.fillText(getTranslation('unifiedGameRenderer', 'connectingToOnlineGame'), this.canvas.width / 2, this.canvas.height / 2 + 40);
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

    private drawScoresAndPlayerNames(): void {
        this.ctx.save();

        // Player 1 Name and Score (Top Left) - Verde como su pala
        const player1Name = this.player1Info?.displayName || 'Jugador 1';
        this.ctx.fillStyle = '#00ff00'; // Verde como la pala izquierda
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${player1Name}: ${this.gameState.score.left}`, 20, 30);

        // Player 2 Name and Score (Top Right) - Rojo como su pala
        const player2Name = this.player2Info?.displayName || (this.gameMode === 'ai' ? 'IA' : 'Jugador 2');
        this.ctx.fillStyle = '#ff0000'; // Rojo como la pala derecha
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${player2Name}: ${this.gameState.score.right}`, this.canvas.width - 20, 30);

        this.ctx.restore();
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
        
        // Limpiar todos los intervals de movimiento usando la función centralizada
        this.clearAllMovementIntervals();
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        window.removeEventListener('blur', this.handleWindowBlur.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
}
