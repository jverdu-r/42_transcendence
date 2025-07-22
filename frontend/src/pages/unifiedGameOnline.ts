/**
 * Unified Online Game Page - Uses UnifiedGameRenderer
 */
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { UnifiedGameRenderer, GameCallbacks } from '../components/UnifiedGameRenderer';
import { PlayerDisplay, PlayerInfo } from '../components/playerDisplay';

export function renderUnifiedGameOnline(): void {
    const pageContent = document.getElementById('page-content');
    
    if (!pageContent) {
        console.error('No se encontró el contenedor de contenido para la página online.');
        return;
    }

    // Interfaz principal del modo online mejorada
    pageContent.innerHTML = `
        <div class="w-full max-w-6xl mx-auto">
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-white mb-4">🌐 Juego Online - Multijugador</h1>
                <p class="text-lg text-gray-300">Juega contra otros jugadores en tiempo real</p>
            </div>

            <!-- Menú principal online -->
            <div id="online-menu" class="space-y-6">
                <!-- Botones de acción principales -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 hover:from-green-700 hover:to-green-900 transition-all cursor-pointer transform hover:scale-105" id="create-game-card">
                        <div class="text-center">
                            <div class="text-6xl mb-4">🎮</div>
                            <h2 class="text-2xl font-bold text-white mb-2">Crear Nueva Partida</h2>
                            <p class="text-green-100 mb-4">Inicia una nueva partida y espera a que otros jugadores se unan</p>
                            <button class="bg-white text-green-800 font-bold py-2 px-6 rounded-full hover:bg-gray-100 transition-colors">
                                ✨ Crear Partida
                            </button>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 hover:from-blue-700 hover:to-blue-900 transition-all cursor-pointer transform hover:scale-105" id="refresh-games-card">
                        <div class="text-center">
                            <div class="text-6xl mb-4">📋</div>
                            <h2 class="text-2xl font-bold text-white mb-2">Partidas Disponibles</h2>
                            <p class="text-blue-100 mb-4">Ve la lista de partidas activas y únete a una</p>
                            <button class="bg-white text-blue-800 font-bold py-2 px-6 rounded-full hover:bg-gray-100 transition-colors">
                                🔄 Actualizar Lista
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Lista de partidas disponibles -->
                <div id="games-list-section" class="bg-gray-800 rounded-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-white">🎯 Partidas Disponibles</h3>
                        <div id="loading-indicator" class="hidden">
                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                    </div>
                    <div id="games-list">
                        <div class="text-center py-8 text-gray-400">
                            <div class="text-4xl mb-2">🔍</div>
                            <p>Haz clic en "Actualizar Lista" para ver las partidas disponibles</p>
                        </div>
                    </div>
                </div>

                <!-- Estadísticas del jugador -->
                <div class="bg-gradient-to-r from-purple-800 to-pink-800 rounded-lg p-6">
                    <h3 class="text-xl font-bold text-white mb-4">📊 Tu Información de Jugador</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-200" id="player-name">-</div>
                            <div class="text-sm text-purple-400">Nombre</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-pink-200" id="games-played">0</div>
                            <div class="text-sm text-pink-400">Partidas Jugadas</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-200" id="wins">0</div>
                            <div class="text-sm text-purple-400">Victorias</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-pink-200" id="win-rate">0%</div>
                            <div class="text-sm text-pink-400">% Victorias</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lobby de espera -->
            <div id="waiting-lobby" class="hidden space-y-6">
                <div class="bg-gradient-to-br from-yellow-600 to-orange-800 rounded-lg p-8 text-center">
                    <div class="text-6xl mb-4">⏳</div>
                    <h2 class="text-3xl font-bold text-white mb-4">Buscando oponente...</h2>
                    <p class="text-lg text-yellow-100 mb-6">Tu partida está lista. Esperando a que otro jugador se una.</p>
                    
                    <div id="game-info" class="bg-black bg-opacity-30 rounded-lg p-4 mb-6">
                        <div class="grid grid-cols-2 gap-4 text-white">
                            <div>
                                <div class="text-sm text-gray-300">ID de Partida</div>
                                <div class="text-lg font-bold" id="lobby-game-id">-</div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-300">Jugadores</div>
                                <div class="text-lg font-bold" id="lobby-players">1/2</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Animación de espera -->
                    <div class="flex justify-center mb-6">
                        <div class="flex space-x-2">
                            <div class="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                            <div class="w-3 h-3 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                            <div class="w-3 h-3 bg-white rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        </div>
                    </div>
                    
                    <button id="cancel-waiting" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full transition-colors">
                        ❌ Cancelar Búsqueda
                    </button>
                </div>
            </div>

            <!-- Área de juego (oculta inicialmente) -->
            <div id="game-area" class="hidden">
                <div class="bg-black rounded-lg p-4 flex justify-center mb-6">
                    <canvas id="game-canvas" width="800" height="600" class="border-2 border-white rounded"></canvas>
                </div>

                <!-- Información del juego online -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gray-800 rounded-lg p-4">
                        <h3 class="text-lg font-bold text-green-400 mb-2">🌐 Estado de Conexión</h3>
                        <div id="connection-status" class="text-sm text-gray-300">Desconectado</div>
                        <div id="game-id-display" class="text-xs text-gray-500 mt-2">ID: -</div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 text-center">
                        <h3 class="text-lg font-bold text-purple-400 mb-4">⚽ Marcador</h3>
                        <div class="flex justify-between items-center">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-green-400" id="score-left">0</div>
                                <div class="text-sm text-gray-400" id="player1-name">Jugador 1</div>
                            </div>
                            <div class="text-2xl font-bold text-white">-</div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-blue-400" id="score-right">0</div>
                                <div class="text-sm text-gray-400" id="player2-name">Jugador 2</div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4">
                        <h3 class="text-lg font-bold text-blue-400 mb-2">🎮 Estado del Juego</h3>
                        <div id="status-message" class="text-sm text-gray-300">Preparando...</div>
                        <div id="rally-counter" class="text-xs text-gray-500 mt-2">Rebotes: 0</div>
                    </div>
                </div>

                <!-- Botones de control de juego -->
                <div class="text-center mt-6">
                    <button id="leave-game" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition-colors mr-4">
                        🚪 Abandonar Partida
                    </button>
                    <button id="back-to-online-menu" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition-colors">
                        🏠 Menú Online
                    </button>
                </div>
            </div>

            <!-- Botón de regreso al menú principal -->
            <div class="text-center mt-8">
                <button id="back-to-main-menu" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
                    ← Volver al Menú Principal
                </button>
            </div>
        </div>
    `;

    // Inicializar la interfaz online
    setupOnlineInterface();
}

let currentGameId: string | null = null;
let gameCheckInterval: number | null = null;

function setupOnlineInterface(): void {
    const currentUser = getCurrentUser();
    const playerName = currentUser?.username || 'Jugador';
    
    // Mostrar información del jugador
    const playerNameEl = document.getElementById('player-name');
    if (playerNameEl) playerNameEl.textContent = playerName;

    // Event listeners para las tarjetas principales
    document.getElementById('create-game-card')?.addEventListener('click', createNewGame);
    document.getElementById('refresh-games-card')?.addEventListener('click', loadAvailableGames);
    
    // Event listeners para navegación
    document.getElementById('back-to-main-menu')?.addEventListener('click', () => {
        navigateTo('/play');
    });

    document.getElementById('back-to-online-menu')?.addEventListener('click', () => {
        showOnlineMenu();
    });

    document.getElementById('leave-game')?.addEventListener('click', () => {
        // Aquí iría la lógica para abandonar el juego
        showOnlineMenu();
    });

    document.getElementById('cancel-waiting')?.addEventListener('click', () => {
        cancelWaiting();
    });

    // Cargar estadísticas del jugador
    loadPlayerStats();
    
    // Cargar lista inicial de partidas
    loadAvailableGames();
}

async function createNewGame(): Promise<void> {
    const currentUser = getCurrentUser();
    const playerName = currentUser?.username || 'Jugador';
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: `Partida de ${playerName}`,
                gameMode: 'pvp',
                maxPlayers: 2,
                playerName: playerName
            })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const gameData = await response.json();
        console.log('Game creation response:', gameData);
        
        // El game-service devuelve un objeto directo con el juego
        if (gameData && gameData.id) {
            console.log('✅ Partida creada exitosamente:', gameData);
            
            // Mostrar mensaje de éxito
            showStatusMessage(`🎮 Partida creada: ${gameData.id}`, 'success');
            
            // Guardar el ID de la partida y mostrar lobby
            currentGameId = gameData.id;
            showWaitingLobby(gameData.id);
            
            // Empezar a comprobar si alguien se une
            startGameStatusCheck(gameData.id);
            
        } else {
            throw new Error(gameData?.error || 'Error desconocido al crear la partida');
        }
        
    } catch (error: any) {
        console.error('❌ Error al crear partida:', error);
        showStatusMessage(`❌ Error: ${(error as Error).message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function showWaitingLobby(gameId: string): void {
    // Ocultar menú online y mostrar lobby de espera
    document.getElementById('online-menu')?.classList.add('hidden');
    document.getElementById('waiting-lobby')?.classList.remove('hidden');
    
    // Actualizar información del lobby
    const lobbyGameId = document.getElementById('lobby-game-id');
    if (lobbyGameId) lobbyGameId.textContent = gameId;
    
    const lobbyPlayers = document.getElementById('lobby-players');
    if (lobbyPlayers) lobbyPlayers.textContent = '1/2';
}

function startGameStatusCheck(gameId: string): void {
    // Comprobar cada 2 segundos si alguien se ha unido
    gameCheckInterval = window.setInterval(async () => {
        try {
            const response = await fetch(`/api/games/${gameId}`);
            if (response.ok) {
                const gameData = await response.json();
                console.log('Game status check:', gameData);
                
                // Actualizar contador de jugadores
                const lobbyPlayers = document.getElementById('lobby-players');
                if (lobbyPlayers) {
                    lobbyPlayers.textContent = `${gameData.jugadoresConectados || 1}/2`;
                }
                
                // Si hay 2 jugadores, iniciar el juego
                if (gameData.jugadoresConectados >= 2) {
                    clearInterval(gameCheckInterval!);
                    gameCheckInterval = null;
                    
                    showStatusMessage('🎮 ¡Oponente encontrado! Iniciando partida...', 'success');
                    setTimeout(() => {
                        startOnlineGame(gameId, 1); // Como creador, somos jugador 1
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error checking game status:', error);
        }
    }, 2000);
}

function cancelWaiting(): void {
    if (gameCheckInterval) {
        clearInterval(gameCheckInterval);
        gameCheckInterval = null;
    }
    
    // TODO: Aquí deberíamos notificar al server que cancelamos la partida
    // Por ahora solo volvemos al menú
    currentGameId = null;
    showOnlineMenu();
    showStatusMessage('❌ Búsqueda cancelada', 'info');
}

async function loadAvailableGames(): Promise<void> {
    try {
        showLoading(true);
        
        const response = await fetch('/api/games');
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const gamesData = await response.json();
        console.log('Games data response:', gamesData);
        
        displayGamesList(gamesData.games || []);
        
    } catch (error: any) {
        console.error('❌ Error al cargar partidas:', error);
        showStatusMessage(`❌ Error al cargar partidas: ${(error as Error).message}`, 'error');
        displayGamesList([]);
    } finally {
        showLoading(false);
    }
}

function displayGamesList(games: any[]): void {
    const gamesListEl = document.getElementById('games-list');
    if (!gamesListEl) return;

    if (games.length === 0) {
        gamesListEl.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <div class="text-4xl mb-4">😴</div>
                <p class="text-lg mb-2">No hay partidas disponibles</p>
                <p class="text-sm">¡Sé el primero en crear una!</p>
            </div>
        `;
        return;
    }

    const gamesHTML = games.map(game => `
        <div class="bg-gray-700 rounded-lg p-4 mb-3 hover:bg-gray-600 transition-colors">
            <div class="flex justify-between items-center">
                <div class="flex-1">
                    <h4 class="font-bold text-white mb-1">🎯 ${game.nombre || `Partida ${game.id}`}</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-300">
                        <div>🆔 ID: <span class="text-yellow-400">${game.id}</span></div>
                        <div>👥 Jugadores: <span class="text-blue-400">${game.jugadoresConectados}/${game.capacidadMaxima}</span></div>
                        <div>📊 Estado: <span class="text-green-400">${game.estado}</span></div>
                        <div>🎮 Tipo: <span class="text-purple-400">${game.tipoJuego}</span></div>
                    </div>
                    ${game.jugadores && game.jugadores.length > 0 ? `
                        <div class="mt-2 text-xs text-gray-400">
                            Jugadores: ${game.jugadores.map((p: any) => p.nombre).join(', ')}
                        </div>
                    ` : ''}
                </div>
                <div class="ml-4">
                    ${game.jugadoresConectados < game.capacidadMaxima ? `
                        <button onclick="joinGame('${game.id}')" 
                                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">
                            🚀 Unirse
                        </button>
                    ` : `
                        <button disabled 
                                class="bg-gray-500 text-gray-300 font-bold py-2 px-4 rounded cursor-not-allowed">
                            🔒 Llena
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');

    gamesListEl.innerHTML = gamesHTML;
}

// Función global para unirse a partidas (llamada desde el HTML)
(window as any).joinGame = async function(gameId: string): Promise<void> {
    const currentUser = getCurrentUser();
    const playerName = currentUser?.username || 'Jugador';
    
    try {
        showLoading(true);
        
        // Usar la URL correcta para join
        const response = await fetch(`/api/games/${gameId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerName: playerName
            })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const result = await response.json();
        console.log('Join game response:', result);
        
        if (result && (result.success !== false)) {
            console.log('✅ Unido a partida exitosamente:', result);
            showStatusMessage(`🎮 Te has unido a la partida ${gameId}`, 'success');
            
            // Como nos estamos uniendo, somos el jugador 2
            await startOnlineGame(gameId, 2);
        } else {
            throw new Error(result.error || 'Error desconocido al unirse a la partida');
        }
        
    } catch (error: any) {
        console.error('❌ Error al unirse a partida:', error);
        showStatusMessage(`❌ Error: ${(error as Error).message}`, 'error');
    } finally {
        showLoading(false);
    }
};

async function startOnlineGame(gameId: string, playerNumber: number): Promise<void> {
    const currentUser = getCurrentUser();
    const playerName = currentUser?.username || 'Jugador';
    
    try {
        // Limpiar interval si existe
        if (gameCheckInterval) {
            clearInterval(gameCheckInterval);
            gameCheckInterval = null;
        }
        
        // Ocultar menú online/lobby y mostrar área de juego
        document.getElementById('online-menu')?.classList.add('hidden');
        document.getElementById('waiting-lobby')?.classList.add('hidden');
        document.getElementById('game-area')?.classList.remove('hidden');
        
        // Actualizar información del juego
        const gameIdDisplay = document.getElementById('game-id-display');
        if (gameIdDisplay) gameIdDisplay.textContent = `ID: ${gameId}`;
        
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) connectionStatus.textContent = 'Conectando...';

        // Crear renderer de juego
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) {
            throw new Error('Canvas no encontrado');
        }

        const gameRenderer = new UnifiedGameRenderer(canvas, 'online');
        
        // Set up player info (initial)
        const player1Info: PlayerInfo = {
            numero: 1,
            displayName: playerNumber === 1 ? playerName : 'Esperando...',
            username: playerNumber === 1 ? (currentUser?.username || 'player1') : 'waiting',
            controls: 'W/S'
        };

        const player2Info: PlayerInfo = {
            numero: 2,
            displayName: playerNumber === 2 ? playerName : 'Esperando...',
            username: playerNumber === 2 ? (currentUser?.username || 'player2') : 'waiting',
            controls: 'W/S'
        };

        gameRenderer.setPlayerInfo(player1Info, player2Info);

        // Configurar callbacks
        gameRenderer.setCallbacks({
            onScoreUpdate: (score) => {
                const leftScore = document.getElementById('score-left');
                const rightScore = document.getElementById('score-right');
                if (leftScore) leftScore.textContent = score.left.toString();
                if (rightScore) rightScore.textContent = score.right.toString();
            },
            onGameEnd: (winner, finalScore) => {
                const statusMsg = document.getElementById('status-message');
                if (statusMsg) {
                    statusMsg.innerHTML = `
                        <div class="text-green-400 font-bold">🎉 ¡${winner} ha ganado!</div>
                        <div class="text-sm text-gray-400 mt-1">Resultado final: ${finalScore.left} - ${finalScore.right}</div>
                    `;
                }
            },
            onStatusUpdate: (status) => {
                const statusMsg = document.getElementById('status-message');
                if (statusMsg) statusMsg.textContent = status;
            },
            onGameStateUpdate: (gameState) => {
                const rallyCounter = document.getElementById('rally-counter');
                if (rallyCounter) {
                    rallyCounter.textContent = `Rebotes: ${gameState.rallieCount || 0}`;
                }
            }
        });

        // Conectar al juego online
        const connected = await gameRenderer.connectToOnlineGame(gameId, playerNumber);
        
        if (connected) {
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.innerHTML = `
                    <div class="text-green-400">🟢 Conectado</div>
                    <div class="text-xs text-gray-400">Jugador ${playerNumber}</div>
                `;
            }
        } else {
            throw new Error('No se pudo conectar al juego');
        }
        
    } catch (error: any) {
        console.error('❌ Error al iniciar juego online:', error);
        showStatusMessage(`❌ Error: ${(error as Error).message}`, 'error');
        showOnlineMenu();
    }
}

function showOnlineMenu(): void {
    // Limpiar interval si existe
    if (gameCheckInterval) {
        clearInterval(gameCheckInterval);
        gameCheckInterval = null;
    }
    
    currentGameId = null;
    
    document.getElementById('online-menu')?.classList.remove('hidden');
    document.getElementById('waiting-lobby')?.classList.add('hidden');
    document.getElementById('game-area')?.classList.add('hidden');
    
    // Recargar lista de partidas
    loadAvailableGames();
}

function showLoading(show: boolean): void {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }
}

function showStatusMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Crear elemento de notificación temporal
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function loadPlayerStats(): void {
    // Cargar estadísticas del localStorage o API
    try {
        const stats = JSON.parse(localStorage.getItem('pongGameStats') || '[]');
        const gamesPlayed = stats.length;
        const wins = stats.filter((game: any) => game.winner === getCurrentUser()?.username).length;
        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
        
        const gamesPlayedEl = document.getElementById('games-played');
        const winsEl = document.getElementById('wins');
        const winRateEl = document.getElementById('win-rate');
        
        if (gamesPlayedEl) gamesPlayedEl.textContent = gamesPlayed.toString();
        if (winsEl) winsEl.textContent = wins.toString();
        if (winRateEl) winRateEl.textContent = `${winRate}%`;
        
    } catch (error: any) {
        console.error('Error loading player stats:', error);
    }
}
