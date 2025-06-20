// src/services/websocket.ts

/**
 * WebSocket service for online matchmaking and game synchronization
 */

export interface GameSyncData {
    type: 'game_sync';
    ball: {
        x: number;
        y: number;
        dx: number;
        dy: number;
    };
    player1: {
        y: number;
        paddle2Y?: number; // For 2v1 and 2v2 modes
    };
    player2: {
        y: number;
        paddle2Y?: number; // For 1v2 and 2v2 modes
    };
    score1: number;
    score2: number;
    gameState: string;
    timestamp: number;
}

export interface PlayerInputData {
    type: 'player_input';
    playerId: string;
    input: {
        paddle1: { dy: number };
        paddle2?: { dy: number }; // For multi-paddle modes
    };
    timestamp: number;
}

export interface MatchFoundData {
    type: 'opponentFound';
    opponent: string;
    message: string;
    gameMode: string;
    isHost: boolean; // Host controls game state
}

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export class OnlineGameService {
    private ws: WebSocket | null = null;
    private playerName: string = '';
    private isConnected: boolean = false;
    private isHost: boolean = false;
    private opponent: string = '';
    private gameMode: string = '';
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;

    // Event callbacks
    private onConnectionChange: ((connected: boolean) => void) | null = null;
    private onMatchFound: ((data: MatchFoundData) => void) | null = null;
    private onGameSync: ((data: GameSyncData) => void) | null = null;
    private onPlayerInput: ((data: PlayerInputData) => void) | null = null;
    private onOpponentDisconnected: (() => void) | null = null;
    private onError: ((error: string) => void) | null = null;

    constructor() {
        this.playerName = this.generatePlayerName();
    }

    private generatePlayerName(): string {
        const adjectives = ['Swift', 'Mighty', 'Clever', 'Bold', 'Quick', 'Sharp', 'Brave', 'Smart'];
        const nouns = ['Pong', 'Player', 'Master', 'Champion', 'Ace', 'Pro', 'Star', 'Hero'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        return `${adj}${noun}${num}`;
    }

    public setPlayerName(name: string): void {
        this.playerName = name.trim() || this.generatePlayerName();
    }

    public getPlayerName(): string {
        return this.playerName;
    }

    public isGameHost(): boolean {
        return this.isHost;
    }

    public getOpponent(): string {
        return this.opponent;
    }

    // Event listeners
    public onConnectionChanged(callback: (connected: boolean) => void): void {
        this.onConnectionChange = callback;
    }

    public onMatchFoundEvent(callback: (data: MatchFoundData) => void): void {
        this.onMatchFound = callback;
    }

    public onGameSyncEvent(callback: (data: GameSyncData) => void): void {
        this.onGameSync = callback;
    }

    public onPlayerInputEvent(callback: (data: PlayerInputData) => void): void {
        this.onPlayerInput = callback;
    }

    public onOpponentDisconnectedEvent(callback: () => void): void {
        this.onOpponentDisconnected = callback;
    }

    public onErrorEvent(callback: (error: string) => void): void {
        this.onError = callback;
    }

    public async connect(gameMode: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.gameMode = gameMode;
                this.ws = new WebSocket('ws://localhost:3000/ws');

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.onConnectionChange?.(true);
                    
                    // Send join game message
                    this.sendMessage({
                        type: 'join-game',
                        name: this.playerName,
                        gameMode: gameMode
                    });
                    
                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.isConnected = false;
                    this.onConnectionChange?.(false);
                    this.attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.onError?.('Connection error. Please check if the server is running.');
                    reject(error);
                };

            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                this.onError?.('Failed to connect to game server.');
                reject(error);
            }
        });
    }

    private handleMessage(data: WebSocketMessage): void {
        switch (data.type) {
            case 'status':
                console.log('Server status:', data.message);
                break;

            case 'waiting':
                console.log('Waiting for opponent:', data.message);
                break;

            case 'opponentFound':
                console.log('Match found:', data);
                this.opponent = data.opponent;
                this.isHost = data.isHost || false; // Backend should send this
                
                const matchData: MatchFoundData = {
                    type: 'opponentFound',
                    opponent: data.opponent,
                    message: data.message,
                    gameMode: this.gameMode,
                    isHost: this.isHost
                };
                this.onMatchFound?.(matchData);
                break;

            case 'game_sync':
                this.onGameSync?.(data as GameSyncData);
                break;

            case 'player_input':
                this.onPlayerInput?.(data as PlayerInputData);
                break;

            case 'opponent_disconnected':
                this.onOpponentDisconnected?.();
                break;

            case 'error':
                console.error('Server error:', data.message);
                this.onError?.(data.message);
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                if (!this.isConnected && this.gameMode) {
                    this.connect(this.gameMode);
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.onError?.('Connection lost. Maximum reconnection attempts reached.');
        }
    }

    public sendGameSync(data: Omit<GameSyncData, 'type' | 'timestamp'>): void {
        if (!this.isConnected || !this.ws) return;

        const message: GameSyncData = {
            type: 'game_sync',
            ...data,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    public sendPlayerInput(input: PlayerInputData['input']): void {
        if (!this.isConnected || !this.ws) return;

        const message: PlayerInputData = {
            type: 'player_input',
            playerId: this.playerName,
            input,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    public sendGameStart(): void {
        if (!this.isConnected || !this.ws || !this.isHost) return;

        this.sendMessage({
            type: 'game_start',
            timestamp: Date.now()
        });
    }

    public sendGameEnd(winner: string, score1: number, score2: number): void {
        if (!this.isConnected || !this.ws) return;

        this.sendMessage({
            type: 'game_end',
            winner,
            score1,
            score2,
            timestamp: Date.now()
        });
    }

    private sendMessage(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    public disconnect(): void {
        if (this.ws) {
            this.isConnected = false;
            this.ws.close();
            this.ws = null;
        }
        this.reset();
    }

    private reset(): void {
        this.isHost = false;
        this.opponent = '';
        this.gameMode = '';
        this.reconnectAttempts = 0;
    }

    public getConnectionStatus(): {
        connected: boolean;
        playerName: string;
        opponent: string;
        isHost: boolean;
        gameMode: string;
    } {
        return {
            connected: this.isConnected,
            playerName: this.playerName,
            opponent: this.opponent,
            isHost: this.isHost,
            gameMode: this.gameMode
        };
    }
}

// Singleton instance
export const onlineGameService = new OnlineGameService();
