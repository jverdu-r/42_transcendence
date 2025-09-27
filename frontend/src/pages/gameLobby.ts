import { UnifiedGameRenderer } from '../components/UnifiedGameRenderer';
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { setGameResults } from '../router';
import './gameLobby.css';

interface GameLobbyState {
    gameId: string | null;
    playersConnected: number;
    countdownValue: number;
    countdownActive: boolean;
    gameStarted: boolean;
    playerNumber: number | null;
    opponentName: string | null;
}

class GameLobby {
    private container: HTMLElement;
    private ws: WebSocket | null = null;
    private state: GameLobbyState;
    private countdownInterval: number | null = null;
    private renderer: UnifiedGameRenderer | null = null;
    
    // Game results tracking
    private gameStartTime: Date | null = null;
    private finalScore: { left: number; right: number } = { left: 0, right: 0 };
    private rallieCount: number = 0;
    private player1Name: string = '';
    private player2Name: string = '';

    constructor(container: HTMLElement) {
        this.container = container;
        this.state = {
            gameId: null,
            playersConnected: 0,
            countdownValue: 3,
            countdownActive: false,
            gameStarted: false,
            playerNumber: null,
            opponentName: null
        };
    }

    public async init(): Promise<void> {
        this.render();
        await this.connectToGameService();
    }

    private async connectToGameService(): Promise<void> {
        try {
            const gameId = sessionStorage.getItem('currentGameId');
            if (!gameId) {
                console.error('No game ID found in session storage');
                navigateTo('/unified-game-online');
                return;
            }
            // Use current host (hostname + port) for correct reverse proxying
            const currentUser = getCurrentUser();
            const username = encodeURIComponent(currentUser?.username || 'Usuario');
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/pong/${gameId}?username=${username}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Connected to game service [' + wsUrl + ']');
                // No need to send a join message, the connection itself handles joining
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };

            this.ws.onclose = () => {
                console.log('Disconnected from game service');
                this.cleanup();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to connect to game service:', error);
        }
    }


    private handleWebSocketMessage(event: MessageEvent): void {
        const determinePlayerInfo = (): void => {
            const currentUser = getCurrentUser();
            const currentUserName = currentUser?.username || 'Usuario';
            this.state.opponentName = (this.state.playersConnected > 1 && this.state.opponentName) || 'Oponente';

            const player1Info = {
                numero: 1,
                username: this.state.playerNumber === 1 ? currentUserName : this.state.opponentName,
                displayName: this.state.playerNumber === 1 ? currentUserName : this.state.opponentName,
                isCurrentUser: this.state.playerNumber === 1
            };
            const player2Info = {
                numero: 2,
                username: this.state.playerNumber === 2 ? currentUserName : this.state.opponentName,
                displayName: this.state.playerNumber === 2 ? currentUserName : this.state.opponentName,
                isCurrentUser: this.state.playerNumber === 2
            };
            this.renderer?.setPlayerInfo(player1Info, player2Info);
        };
        try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);

            switch (data.type) {
                case 'gameJoined':
                    this.state.gameId = data.gameId;
                    this.state.playerNumber = data.playerNumber;
                    this.state.playersConnected = data.playersConnected;
                    this.updateUI();
                    break;

                case 'playerJoined':
                    this.state.playersConnected = data.playersConnected;
                    if (data.playerName && data.playerNumber !== this.state.playerNumber) {
                        this.state.opponentName = data.playerName;
                        
                        // Synchronize player information
                        determinePlayerInfo();
                    }
                    this.updateUI();
                    break;

                case 'countdownStart':
                    this.startCountdown();
                    break;

                case 'countdownUpdate':
                    this.state.countdownValue = data.count;
                    this.updateUI();
                    break;

                case 'gameStarted':
                    determinePlayerInfo(); // Ensure player names are set before starting
                    this.startGame();
                    break;

                case 'error':
                    console.error('Game service error:', data.message);
                    alert('Error: ' + data.message);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    private startCountdown(): void {
        this.state.countdownActive = true;
        this.state.countdownValue = 3;
        this.updateUI();
    }

    private async startGame(): Promise<void> {
        console.log('Starting game...');
        this.state.gameStarted = true;
        this.state.countdownActive = false;

        // Clear the lobby UI
        this.container.innerHTML = '';

        // Create canvas element for the game
        const canvas = document.createElement('canvas');
        canvas.style.border = '2px solid #fff';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        this.container.appendChild(canvas);
        
            // Initialize the game renderer and transfer the WebSocket connection
            this.renderer = new UnifiedGameRenderer(canvas, 'online');
            
            // Set player information for display
            const currentUser = getCurrentUser();
            const currentUserName = currentUser?.username || 'Usuario';
            const player1Info = {
                numero: 1,
                username: this.state.playerNumber === 1 ? currentUserName : (this.state.opponentName || 'Oponente'),
                displayName: this.state.playerNumber === 1 ? currentUserName : (this.state.opponentName || 'Oponente'),
                isCurrentUser: this.state.playerNumber === 1
            };
            const player2Info = {
                numero: 2,
                username: this.state.playerNumber === 2 ? currentUserName : (this.state.opponentName || 'Oponente'),
                displayName: this.state.playerNumber === 2 ? currentUserName : (this.state.opponentName || 'Oponente'),
                isCurrentUser: this.state.playerNumber === 2
            };
            this.renderer.setPlayerInfo(player1Info, player2Info);
            
            // Store player names and start time
            this.player1Name = player1Info.displayName;
            this.player2Name = player2Info.displayName;
            this.gameStartTime = new Date();
            
            this.renderer.setCallbacks({
                onScoreUpdate: (score: { left: number; right: number }) => {
                    console.log('Score updated:', score);
                    this.finalScore = score;
                },
                onGameStateUpdate: (gameState: any) => {
                    this.rallieCount = gameState.rallieCount || 0;
                },
                onGameEnd: (winner: string, score: { left: number; right: number }) => {
                    console.log('Game ended, winner:', winner, 'score:', score);
                    this.finalScore = score;
                    this.handleGameEnd(winner);
                }
            });

            // Transfer the existing WebSocket connection to the renderer
            if (this.state.gameId && this.state.playerNumber !== null && this.renderer && this.ws) {
                console.log('Transferring WebSocket connection to game renderer...');
                this.renderer.setWebSocketConnection(this.ws, this.state.gameId);
                this.renderer.startGame();
                
                // Transfer WebSocket message handling to the renderer
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.renderer?.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message in game:', error);
                    }
                };
                
                // Don't close the WebSocket in cleanup anymore since renderer owns it
                this.ws = null;
            }

            // Do NOT re-assign this.ws.onmessage (let renderer do it)
    }

    private handleGameEnd(winner: string): void {
        // Prepare results data and redirect to results page
        const loser = winner === this.player1Name ? this.player2Name : this.player1Name;
        const gameDuration = this.gameStartTime ? Date.now() - this.gameStartTime.getTime() : undefined;
        
        const gameResults = {
            winner,
            loser,
            finalScore: this.finalScore,
            gameMode: 'online' as const,
            gameDuration,
            rallieCount: this.rallieCount,
            gameId: this.state.gameId
        };

        setGameResults(gameResults);
        navigateTo('/results');
    }

    private updateUI(): void {
        if (this.state.gameStarted) {
            return; // Don't update UI once game has started
        }

        const lobbyHTML = `
            <div class="game-lobby">
                <div class="lobby-header">
                    <h1>Sala de Juego</h1>
                    ${this.state.gameId ? `<p class="game-id">ID: ${this.state.gameId}</p>` : ''}
                </div>

                <div class="players-section">
                    <div class="player-slot ${this.state.playerNumber === 1 ? 'current-player' : ''}">
                        <div class="player-info">
                            <h3>Jugador 1</h3>
                            <p>${this.state.playerNumber === 1 ? 'Tú' : (this.state.opponentName || 'Waiting for a new challenger')}</p>
                        </div>
                        <div class="player-status ${this.state.playersConnected >= 1 ? 'connected' : 'waiting'}">
                            ${this.state.playersConnected >= 1 ? '✓ Conectado' : '⏳ Esperando'}
                        </div>
                    </div>

                    <div class="vs-divider">VS</div>

                    <div class="player-slot ${this.state.playerNumber === 2 ? 'current-player' : ''}">
                        <div class="player-info">
                            <h3>Jugador 2</h3>
                            <p>${this.state.playerNumber === 2 ? 'Tú' : (this.state.opponentName || 'Waiting for a new challenger')}</p>
                        </div>
                        <div class="player-status ${this.state.playersConnected >= 2 ? 'connected' : 'waiting'}">
                            ${this.state.playersConnected >= 2 ? '✓ Conectado' : '⏳ Esperando'}
                        </div>
                    </div>
                </div>

                ${this.state.countdownActive ? `
                    <div class="countdown-section">
                        <div class="countdown-circle">
                            <span class="countdown-number">${this.state.countdownValue}</span>
                        </div>
                        <p class="countdown-text">¡El juego comenzará pronto!</p>
                    </div>
                ` : ''}

                ${this.state.playersConnected < 2 ? `
                    <div class="waiting-section">
                        <div class="loading-spinner"></div>
                        <p>Esperando a que se conecte otro jugador...</p>
                    </div>
                ` : ''}

                <div class="lobby-actions">
                    <button class="btn-secondary" onclick="window.gameLobby.leaveLobby()">
                        Abandonar Sala
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = lobbyHTML;
    }

    private render(): void {
        this.updateUI();
    }

    public leaveLobby(): void {
        this.cleanup();
        navigateTo('/unified-game-online');
    }

    private cleanup(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.renderer) {
            this.renderer.cleanup();
            this.renderer = null;
        }
    }

    public destroy(): void {
        this.cleanup();
    }
}

// Export for global access
export { GameLobby };

// Global instance for button handlers
declare global {
    interface Window {
        gameLobby: GameLobby;
    }
}

// Función de renderizado para el router
export function renderGameLobby(): void {
    const container = document.getElementById('page-content');
    if (!container) {
        console.error('Container #page-content not found');
        return;
    }

    // Crear instancia del lobby
const gameLobby = new GameLobby(container);
    
    // Hacer disponible globalmente para los botones
    window.gameLobby = gameLobby;
    
    // Inicializar el lobby
    gameLobby.init();
}
