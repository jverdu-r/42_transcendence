import { UnifiedGameRenderer } from '../components/UnifiedGameRenderer';
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { setGameResults } from '../router';
import { getTranslation } from '../i18n';
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
        // Check if we're reconnecting to an existing game
        const savedGameId = sessionStorage.getItem('currentGameId');
        const savedPlayerNumber = sessionStorage.getItem('playerNumber');
        const isReconnecting = savedGameId && savedPlayerNumber;
        
        if (isReconnecting) {
            // Try to reconnect
            console.log(`🔄 Attempting to reconnect to game ${savedGameId} as player ${savedPlayerNumber}`);
            this.state.gameId = savedGameId;
            this.state.playerNumber = parseInt(savedPlayerNumber);
            
            // Show reconnection message
            this.showReconnectionMessage();
        }
        
        this.render();
        await this.connectToGameService();
    }
    
    private showReconnectionMessage(): void {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-pulse';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-2xl">🔄</div>
                <div>
                    <div class="font-bold">Reconectando...</div>
                    <div class="text-sm">Volviendo a tu partida</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    private async connectToGameService(): Promise<void> {
        try {
            // 1. Obtener gameId desde URL o sessionStorage
            const urlParams = new URLSearchParams(window.location.search);
            let gameId = urlParams.get('gameId');

            if (!gameId) {
            gameId = sessionStorage.getItem('currentGameId');
            }

            if (!gameId) {
            console.error('No game ID found in URL or session storage');
            navigateTo('/unified-game-online');
            return;
            }

            // Guardar en sessionStorage (por si acaso)
            sessionStorage.setItem('currentGameId', gameId);

            // 2. Obtener datos del usuario
            const currentUser = getCurrentUser();
            const username = encodeURIComponent(currentUser?.username || 'Usuario');
            const userId = currentUser?.id || '';

            // 3. Construir URL del WebSocket con ambos parámetros
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/pong/${gameId}?username=${username}&user_id=${userId}`;

            // 4. Conectar
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
            console.log('✅ Connected to game service:', wsUrl);
            };

            this.ws.onmessage = (event) => {
            this.handleWebSocketMessage(event);
            };

            this.ws.onclose = () => {
            console.log('🔌 Disconnected from game service');
            this.cleanup();
            };

            this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            };

        } catch (error) {
            console.error('💥 Failed to connect to game service:', error);
            navigateTo('/unified-game-online');
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
                    
                    // Save to sessionStorage for reconnection
                    sessionStorage.setItem('currentGameId', data.gameId);
                    sessionStorage.setItem('playerNumber', data.playerNumber.toString());
                    sessionStorage.setItem('inGame', 'true');
                    
                    // Store opponent name if provided
                    if (data.opponentName) {
                        this.state.opponentName = data.opponentName;
                    }
                    
                    // If reconnecting and game already started, start the game immediately
                    if (data.reconnected && data.gameStarted) {
                        console.log('🎮 Reconnecting to game in progress...');
                        this.state.gameStarted = true;
                        
                        // Delay to let UI update and then start game
                        setTimeout(() => {
                            this.startGame();
                        }, 500);
                    } else {
                        this.updateUI();
                    }
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

                case 'playerReconnected':
                    // Handle player reconnection
                    if (data.playerNumber !== this.state.playerNumber) {
                        this.state.opponentName = data.playerName;
                        this.showNotification(`🔄 ${data.playerName} se ha reconectado`, 'info');
                    }
                    this.state.playersConnected = data.playersConnected;
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

                case 'playerLeft':
                    // Handle player leaving before game starts
                    if (!this.state.gameStarted) {
                        // Clean session storage
                        sessionStorage.removeItem('currentGameId');
                        sessionStorage.removeItem('playerNumber');
                        sessionStorage.removeItem('inGame');
                        
                        alert(`${data.data?.playerName || 'Un jugador'} ha abandonado la partida`);
                        navigateTo('/unified-game-online');
                    }
                    break;

                case 'gameEnded':
                    // Handle game end (including disconnections) if not yet transferred to renderer
                    if (!this.state.gameStarted && data.data?.reason === 'opponent_disconnected') {
                        // Clean session storage
                        sessionStorage.removeItem('currentGameId');
                        sessionStorage.removeItem('playerNumber');
                        sessionStorage.removeItem('inGame');
                        
                        alert(`${data.data.message || 'El oponente ha abandonado'}`);
                        navigateTo('/unified-game-online');
                    }
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
        // Clear session storage as game has ended
        sessionStorage.removeItem('currentGameId');
        sessionStorage.removeItem('playerNumber');
        sessionStorage.removeItem('inGame');
        
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
                    <h1>${getTranslation('gameLobby', 'title')}</h1>
                    ${this.state.gameId ? `<p class="game-id">${getTranslation('gameLobby', 'gameId')}: ${this.state.gameId}</p>` : ''}
                </div>

                <div class="players-section">
                    <div class="player-slot ${this.state.playerNumber === 1 ? 'current-player' : ''}">
                        <div class="player-info">
                            <h3>${getTranslation('gameLobby', 'player1')}</h3>
                            <p>${this.state.playerNumber === 1 ? getTranslation('gameLobby', 'you') : (this.state.opponentName || getTranslation('gameLobby', 'waitingChallenger'))}</p>
                        </div>
                        <div class="player-status ${this.state.playersConnected >= 1 ? 'connected' : 'waiting'}">
                            ${this.state.playersConnected >= 1 ? getTranslation('gameLobby', 'connected') : getTranslation('gameLobby', 'waiting')}
                        </div>
                    </div>

                    <div class="vs-divider">VS</div>

                    <div class="player-slot ${this.state.playerNumber === 2 ? 'current-player' : ''}">
                        <div class="player-info">
                            <h3>${getTranslation('gameLobby', 'player2')}</h3>
                            <p>${this.state.playerNumber === 2 ? getTranslation('gameLobby', 'you') : (this.state.opponentName || getTranslation('gameLobby', 'waitingChallenger'))}</p>
                        </div>
                        <div class="player-status ${this.state.playersConnected >= 2 ? 'connected' : 'waiting'}">
                            ${this.state.playersConnected >= 2 ? getTranslation('gameLobby', 'connected') : getTranslation('gameLobby', 'waiting')}
                        </div>
                    </div>
                </div>

                ${this.state.countdownActive ? `
                    <div class="countdown-section">
                        <div class="countdown-circle">
                            <span class="countdown-number">${this.state.countdownValue}</span>
                        </div>
                        <p class="countdown-text">${getTranslation('gameLobby', 'gameStartingSoon')}</p>
                    </div>
                ` : ''}

                ${this.state.playersConnected < 2 ? `
                    <div class="waiting-section">
                        <div class="loading-spinner"></div>
                        <p>${getTranslation('gameLobby', 'waitingForPlayer')}</p>
                    </div>
                ` : ''}

                <div class="lobby-actions">
                    <button class="btn-secondary" onclick="window.gameLobby.leaveLobby()">
                        ${getTranslation('gameLobby', 'leaveRoom')}
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = lobbyHTML;
    }

    private render(): void {
        this.updateUI();
    }
    
    private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
        const notification = document.createElement('div');
        const bgColors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            error: 'bg-red-500'
        };
        
        notification.className = `fixed top-4 right-4 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    public leaveLobby(): void {
        // Clear session storage when intentionally leaving
        sessionStorage.removeItem('currentGameId');
        sessionStorage.removeItem('playerNumber');
        sessionStorage.removeItem('inGame');
        
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

// Render function for the router
export function renderGameLobby(): void {
    const container = document.getElementById('page-content');
    if (!container) {
        console.error('Container #page-content not found');
        return;
    }

    // Create lobby instance
const gameLobby = new GameLobby(container);
    
    // Make it globally available for buttons
    window.gameLobby = gameLobby;
    
    // Initialize the lobby
    gameLobby.init();
}
