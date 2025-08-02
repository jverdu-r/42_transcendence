import { UnifiedGameRenderer } from '../components/UnifiedGameRenderer';
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
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
            // LAN manual input prompt
            let serverHost = window.prompt('Introduce la IP o hostname del host (LAN):', window.location.hostname);
            if (!serverHost) serverHost = window.location.hostname;
            const currentUser = getCurrentUser();
            const username = encodeURIComponent(currentUser?.username || 'Usuario');
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${serverHost}:8002/pong/${gameId}?username=${username}`;
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
        try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);

            switch (data.type) {
                case 'game_joined':
                    this.state.gameId = data.gameId;
                    this.state.playerNumber = data.playerNumber;
                    this.state.playersConnected = data.playersConnected;
                    this.updateUI();
                    break;

                case 'player_joined':
                    this.state.playersConnected = data.playersConnected;
                    if (data.playerName && data.playerNumber !== this.state.playerNumber) {
                        this.state.opponentName = data.playerName;
                    }
                    this.updateUI();
                    break;

                case 'countdown_start':
                    this.startCountdown();
                    break;

                case 'countdown_update':
                    this.state.countdownValue = data.count;
                    this.updateUI();
                    break;

                case 'gameStarted':
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
        
        // Initialize the game renderer
        this.renderer = new UnifiedGameRenderer(canvas, 'online');
        this.renderer.setCallbacks({
            onScoreUpdate: (score: { left: number; right: number }) => {
                console.log('Score updated:', score);
            },
            onGameEnd: (winner: string) => {
                console.log('Game ended, winner:', winner);
                this.handleGameEnd(winner);
            }
        });

        // Don't create a new WebSocket connection, the game is already started
        // Just start the renderer's game loop
        console.log('Game renderer initialized, starting game...');
        this.renderer.startGame();
        
        // Forward WebSocket messages from lobby to renderer
        if (this.ws) {
            const originalOnMessage = this.ws.onmessage;
            const ws = this.ws; // Store reference to avoid null check issues
            this.ws.onmessage = (event) => {
                // First handle lobby messages
                if (originalOnMessage) {
                    originalOnMessage.call(ws, event);
                }
                
                // Then forward game state messages to renderer
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'gameState' && this.renderer) {
                        this.renderer.updateGameState(data.data.gameState);
                    }
                } catch (error) {
                    console.error('Error forwarding message to renderer:', error);
                }
            };
        }
    }

    private handleGameEnd(winner: string): void {
        // Show game end screen or navigate back
        setTimeout(() => {
            navigateTo('/unified-game-online');
        }, 3000);
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
