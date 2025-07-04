// src/services/websocket.ts

/**
 * Servicio WebSocket para el emparejamiento online y la sincronización del juego.
 * Este archivo gestiona la conexión WebSocket del cliente al servidor de emparejamiento.
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
        paddle2Y?: number; // Para modos 2v1 y 2v2
    };
    player2: {
        y: number;
        paddle2Y?: number; // Para modos 1v2 y 2v2
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
        paddle2?: { dy: number }; // Para modos de múltiples paletas
    };
    timestamp: number;
}

export interface MatchFoundData {
    type: 'opponentFound';
    opponent: string;
    message: string;
    gameMode: string;
    isHost: boolean; // El host controla el estado del juego
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

    // Callbacks para eventos del servicio
    private onConnectionChange: ((connected: boolean) => void) | null = null;
    private onMatchFound: ((data: MatchFoundData) => void) | null = null;
    private onGameSync: ((data: GameSyncData) => void) | null = null;
    private onPlayerInput: ((data: PlayerInputData) => void) | null = null;
    private onOpponentDisconnected: (() => void) | null = null;
    private onGameEnd: ((data: any) => void) | null = null;
    private onError: ((error: string) => void) | null = null;

    constructor() {
        this.playerName = this.generatePlayerName();
    }

    // Obtiene el nombre de usuario autenticado o genera uno aleatorio
    private generatePlayerName(): string {
        // Intentar obtener el nombre de usuario del token JWT si está autenticado
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.username) {
                    console.log('🔐 Usando nombre de usuario autenticado:', payload.username);
                    return payload.username;
                }
            } catch (error) {
                console.warn('No se pudo obtener el username del token:', error);
            }
        }
        
        // Fallback: generar nombre aleatorio
        const adjectives = ['Swift', 'Mighty', 'Clever', 'Bold', 'Quick', 'Sharp', 'Brave', 'Smart'];
        const nouns = ['Pong', 'Player', 'Master', 'Champion', 'Ace', 'Pro', 'Star', 'Hero'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        console.log('🎲 Generando nombre aleatorio para usuario no autenticado');
        return `${adj}${noun}${num}`;
    }

    // Establece el nombre del jugador
    public setPlayerName(name: string): void {
        this.playerName = name.trim() || this.generatePlayerName();
    }

    // Obtiene el nombre del jugador
    public getPlayerName(): string {
        return this.playerName;
    }

    // Obtiene las preferencias del usuario para el matchmaking
    private getUserPreferences(): any {
        const token = localStorage.getItem('authToken');
        const preferences: any = {
            skill_level: 'beginner', // Default skill level
            preferred_modes: ['1v1', 'classic'],
            max_wait_time: 30000 // 30 seconds
        };

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                // Aquí podrías agregar más datos del usuario si están disponibles en el token
                preferences.user_id = payload.userId;
                preferences.authenticated = true;
            } catch (error) {
                console.warn('No se pudo obtener información adicional del token:', error);
            }
        }

        return preferences;
    }

    // Verifica si es el host del juego
    public isGameHost(): boolean {
        return this.isHost;
    }

    // Obtiene el nombre del oponente
    public getOpponent(): string {
        return this.opponent;
    }

    // Métodos para registrar callbacks de eventos
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

    public onGameEndEvent(callback: (data: any) => void): void {
        this.onGameEnd = callback;
    }

    public onErrorEvent(callback: (error: string) => void): void {
        this.onError = callback;
    }

    // Conecta al servicio WebSocket
    public async connect(gameMode: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.gameMode = gameMode;
                // Safari-compatible WebSocket URL generation
                let wsUrl: string;
                
                // For Safari, ensure we use the correct protocol
                if (window.location.protocol === 'https:') {
                    wsUrl = 'wss://' + window.location.host + '/ws';
                } else {
                    wsUrl = 'ws://' + window.location.host + '/ws';
                }
                
                // Safari fallback: if on localhost, try different ports
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
                           window.location.hostname + ':3000/ws';
                }
                
                console.log('🍎 Safari-compatible WebSocket URL:', wsUrl);
                this.ws = new WebSocket(wsUrl);

                // Evento al abrir la conexión WebSocket
                this.ws.onopen = () => {
                    console.log('WebSocket conectado');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.onConnectionChange?.(true); // Llama al callback de cambio de conexión
                    
                    // Envía el mensaje de unirse al juego con información adicional del usuario
                    this.sendMessage({
                        type: 'join-game',
                        name: this.playerName,
                        gameMode: gameMode,
                        userPreferences: this.getUserPreferences() // Agregar preferencias del usuario
                    });
                    
                    resolve(true); // Resuelve la promesa indicando éxito
                };

                // Evento al recibir un mensaje del WebSocket
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data); // Parsea el mensaje JSON
                        this.handleMessage(data); // Procesa el mensaje
                    } catch (error) {
                        console.error('Error al parsear mensaje WebSocket:', error);
                    }
                };

                // Evento al cerrar la conexión WebSocket
                this.ws.onclose = () => {
                    console.log('WebSocket desconectado');
                    this.isConnected = false;
                    this.onConnectionChange?.(false); // Llama al callback de cambio de conexión
                    this.attemptReconnect(); // Intenta reconectar automáticamente
                };

                // Evento de error del WebSocket
                this.ws.onerror = (error) => {
                    console.error('Error WebSocket:', error);
                    this.onError?.('Error de conexión. Por favor, verifica si el servidor está funcionando.'); // Llama al callback de error
                    reject(error); // Rechaza la promesa indicando un error
                };

            } catch (error) {
                console.error('Fallo al crear la conexión WebSocket:', error);
                this.onError?.('Fallo al conectar al servidor de juego.'); // Llama al callback de error
                reject(error); // Rechaza la promesa
            }
        });
    }

    // Maneja los diferentes tipos de mensajes recibidos del servidor
    private handleMessage(data: WebSocketMessage): void {
        switch (data.type) {
            case 'status':
                console.log('Estado del servidor:', data.message);
                break;

            case 'waiting':
                console.log('Esperando oponente:', data.message);
                break;

            case 'opponentFound':
                console.log('Emparejamiento encontrado:', data);
                this.opponent = data.opponent;
                this.isHost = data.isHost || false; // Asigna si es el host (viene del backend)
                
                const matchData: MatchFoundData = {
                    type: 'opponentFound',
                    opponent: data.opponent,
                    message: data.message,
                    gameMode: this.gameMode,
                    isHost: this.isHost
                };
                this.onMatchFound?.(matchData); // Llama al callback de emparejamiento encontrado
                break;

            case 'game_sync':
                this.onGameSync?.(data as GameSyncData); // Llama al callback de sincronización de juego
                break;

            case 'player_input':
                this.onPlayerInput?.(data as PlayerInputData); // Llama al callback de entrada del jugador
                break;

            case 'opponent_disconnected':
                this.onOpponentDisconnected?.(); // Llama al callback de desconexión del oponente
                break;

            case 'game_end':
                this.onGameEnd?.(data); // Llama al callback de fin de juego
                break;

            case 'waiting_timeout':
                console.log('Timeout en matchmaking:', data.message);
                this.onError?.(data.message || 'No se encontró oponente a tiempo');
                break;

            case 'error':
                console.error('Error del servidor:', data.message);
                this.onError?.(data.message); // Llama al callback de error
                break;

            default:
                console.warn('Tipo de mensaje desconocido:', data.type);
        }
    }

    // Intenta reconectar al servidor después de una desconexión
    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                // Solo intenta reconectar si no está ya conectado y el modo de juego está definido
                if (!this.isConnected && this.gameMode) {
                    this.connect(this.gameMode);
                }
            }, this.reconnectDelay * this.reconnectAttempts); // Retraso exponencial
        } else {
            this.onError?.('Conexión perdida. Se alcanzó el máximo de intentos de reconexión.'); // Llama al callback de error
        }
    }

    // Envía datos de sincronización del juego al servidor
    public sendGameSync(data: Omit<GameSyncData, 'type' | 'timestamp'>): void {
        if (!this.isConnected || !this.ws) return;

        const message: GameSyncData = {
            type: 'game_sync',
            ...data,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    // Envía la entrada del jugador al servidor
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

    // Envía un mensaje de inicio de juego (solo si es el host)
    public sendGameStart(): void {
        if (!this.isConnected || !this.ws || !this.isHost) return;

        this.sendMessage({
            type: 'game_start',
            timestamp: Date.now()
        });
    }

    // Envía un mensaje de fin de juego - CADA JUGADOR ENVÍA SU PROPIO RESULTADO
    public sendGameEnd(winner: string, score1: number, score2: number, duration?: number): void {
        if (!this.isConnected || !this.ws) return;

        // Determinar si este jugador ganó o perdió
        let didIWin: boolean;
        let myScore: number;
        let opponentScore: number;
        
        if (this.isHost) {
            // Soy el host (player1)
            didIWin = (winner === 'player1');
            myScore = score1;
            opponentScore = score2;
        } else {
            // Soy el guest (player2)
            didIWin = (winner === 'player2');
            myScore = score2;
            opponentScore = score1;
        }

        // Cada jugador envía SOLO su propio resultado
        this.sendMessage({
            type: 'individual_game_result',
            player_name: this.playerName,  // Mi nombre
            opponent_name: this.opponent, // Nombre del oponente
            my_score: myScore,           // Mi puntuación
            opponent_score: opponentScore, // Puntuación del oponente
            did_i_win: didIWin,          // Si yo gané o no
            gameMode: this.gameMode,
            duration: duration || 0,
            timestamp: Date.now(),
            is_host: this.isHost         // Para referencia
        });
    }

    // Método privado para enviar mensajes a través del WebSocket
    private sendMessage(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // Desconecta el WebSocket y reinicia el estado del servicio
    public disconnect(): void {
        if (this.ws) {
            this.isConnected = false;
            this.ws.close();
            this.ws = null;
        }
        this.reset();
    }

    // Reinicia el estado interno del servicio
    private reset(): void {
        this.isHost = false;
        this.opponent = '';
        this.gameMode = '';
        this.reconnectAttempts = 0;
    }

    // Obtiene el estado actual de la conexión y el jugador
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

// Instancia Singleton del servicio para asegurar una única conexión
export const onlineGameService = new OnlineGameService();
