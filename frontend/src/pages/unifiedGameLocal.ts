import { UnifiedGameRenderer, GameMode } from '../components/UnifiedGameRenderer';
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { getTranslation } from '../i18n';
import { setGameResults } from '../router';

// Local game state
let game: UnifiedGameRenderer | null = null;
let startedAt: string | null = null;
let player1Name = getTranslation('unifiedGameLocal', 'player1');
let player2Name = getTranslation('unifiedGameLocal', 'player2');
let rallieCount = 0;

export function renderUnifiedGameLocal(): void {
    const pageContent = document.getElementById('page-content');
    
    if (!pageContent) {
        console.error(getTranslation('unifiedGameLocal', 'containerNotFound'));
        return;
    }

    // Configurar la interfaz de juego directamente (sin botones)
    pageContent.innerHTML = `
        <div class="w-full max-w-6xl mx-auto">
            <!-- Header del juego -->
            <div class="text-center mb-6">
                <h1 class="text-3xl font-bold text-white mb-2">🏠 ${getTranslation('game_local', 'title')}</h1>
                <p class="text-gray-300">${getTranslation('game_local', 'subtitle')}</p>
            </div>

            <!-- Información de controles -->
            <div class="bg-gray-800 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="text-center">
                        <h3 class="text-lg font-bold text-yellow-400 mb-2">🟡 ${getTranslation('game_local', 'player_1')}</h3>
                        <div class="bg-yellow-600 text-black rounded-lg p-3">
                            <div class="text-xl font-bold mb-2">${getTranslation('game_local', 'controls')}:</div>
                            <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">W</kbd> - ${getTranslation('game_local', 'move_up')}</div>
                            <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">S</kbd> - ${getTranslation('game_local', 'move_down')}</div>
                        </div>
                    </div>
                    <div class="text-center">
                        <h3 class="text-lg font-bold text-blue-400 mb-2">🔵 ${getTranslation('game_local', 'player_2')}</h3>
                        <div class="bg-blue-600 text-white rounded-lg p-3">
                            <div class="text-xl font-bold mb-2">${getTranslation('game_local', 'controls')}:</div>
                            <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">O</kbd> - ${getTranslation('game_local', 'move_up')}</div>
                            <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">L</kbd> - ${getTranslation('game_local', 'move_down')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Área de juego -->
            <div class="bg-black rounded-lg p-4 flex justify-center">
                <canvas id="game-canvas" width="800" height="600" class="border-2 border-white rounded"></canvas>
            </div>

            <!-- Información del juego -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div id="player-info" class="bg-gray-800 rounded-lg p-4">
                    <h3 class="text-lg font-bold text-green-400 mb-2">📊 ${getTranslation('game_local', 'game_info')}</h3>
                    <div class="space-y-2 text-sm">
                        <div>🏆 ${getTranslation('game_local', 'first_to')} <span class="font-bold text-yellow-400">5</span> ${getTranslation('game_local', 'points_win')}</div>
                        <div>⚡ ${getTranslation('game_local', 'physics_speed_up')}</div>
                        <div>🎯 ${getTranslation('game_local', 'angle_on_contact')}</div>
                    </div>
                </div>
                <div id="score-display" class="bg-gray-800 rounded-lg p-4 text-center">
                    <h3 class="text-lg font-bold text-purple-400 mb-4">⚽ ${getTranslation('game_local', 'score')}</h3>
                    <div class="flex justify-between items-center">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-yellow-400" id="score-left">0</div>
                            <div class="text-sm text-gray-400">${getTranslation('game_local', 'player_1').split(' (')[0]}</div>
                        </div>
                        <div class="text-2xl font-bold text-white">-</div>
                        <div class="text-center">
                            <div class="text-3xl font-bold text-blue-400" id="score-right">0</div>
                            <div class="text-sm text-gray-400">${getTranslation('game_local', 'player_2').split(' (')[0]}</div>
                        </div>
                    </div>
                </div>
                <div id="game-status" class="bg-gray-800 rounded-lg p-4">
                    <h3 class="text-lg font-bold text-blue-400 mb-2">🎮 ${getTranslation('game_local', 'game_status')}</h3>
                    <div id="status-message" class="text-sm text-gray-300">${getTranslation('game_local', 'preparing')}</div>
                    <div id="rally-counter" class="text-xs text-gray-500 mt-2">${getTranslation('game_local', 'rallies')}: 0</div>
                </div>
            </div>

            <!-- Botón de regreso -->
            <div class="text-center mt-6">
                <button id="back-button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
                    ← ${getTranslation('game_local', 'back_to_menu')}
                </button>
            </div>
        </div>
    `;

    // Configurar el juego
    setupLocalGame();
}

function setupLocalGame(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const currentUser = getCurrentUser();
  
  if (!canvas || !currentUser) {
    console.error(getTranslation('unifiedGameLocal', 'canvasOrUserNotFound'));
    return;
  }

  // ✅ Generar marca de tiempo al inicio
  const startedAt = new Date().toISOString();

  // Crear instancia del juego
  const game = new UnifiedGameRenderer(canvas, 'local');
  
  // Set up player info
  player1Name = getTranslation('unifiedGameLocal', 'player1');
  player2Name = getTranslation('unifiedGameLocal', 'player2');
  rallieCount = 0;
  
  const player1Info = {
    numero: 1,
    displayName: player1Name,
    username: currentUser?.username || 'player1',
    controls: 'W/S'
  };

  const player2Info = {
    numero: 2,
    displayName: player2Name, 
    username: 'player2',
    controls: '↑/↓'
  };

  game.setPlayerInfo(player1Info, player2Info);
  
  // Configurar callbacks del juego
  game.setCallbacks({
    onScoreUpdate: (score) => {
      const leftScore = document.getElementById('score-left');
      const rightScore = document.getElementById('score-right');
      if (leftScore) leftScore.textContent = score.left.toString();
      if (rightScore) rightScore.textContent = score.right.toString();
    },

    onGameEnd: async (winner, finalScore) => {
      // ✅ 1. Upload scores to database first
      let dbGameId: number | null = null;
      try {
        const response = await fetch('/api/auth/games/id-by-started-at', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startedAt })
        });
        const data = await response.json();
        if (data.gameId) {
          dbGameId = data.gameId;
        } else {
          console.error(getTranslation('unifiedGameLocal', 'gameIdNotFound'));
        }
      } catch (err) {
        console.error(getTranslation('unifiedGameLocal', 'errorGettingGameId'), err);
      }

      // ✅ 2. Update the game in the database
      if (dbGameId) {
        try {
          await fetch('/api/auth/games/finish/local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: dbGameId,
              winnerTeam: finalScore.left > finalScore.right ? 'Team A' : 'Team B',
              score1: finalScore.left,
              score2: finalScore.right
            })
          });
        } catch (err) {
          console.error(getTranslation('unifiedGameLocal', 'errorFinishingGame'), err);
        }
      }

      // ✅ 3. Prepare results data and redirect to results page
      const gameResults = {
        winner,
        loser: finalScore.left > finalScore.right ? player2Name : player1Name,
        finalScore,
        gameMode: 'local' as const,
        gameDuration: game?.getGameStartTime() ? Date.now() - game.getGameStartTime()!.getTime() : undefined,
        rallieCount: rallieCount,
        gameId: dbGameId
      };

      setGameResults(gameResults);
      navigateTo('/results');
    },

    onStatusUpdate: (status) => {
      const statusMsg = document.getElementById('status-message');
      if (statusMsg) statusMsg.textContent = status;
    },

    onGameStateUpdate: (gameState) => {
      rallieCount = gameState.rallieCount || 0;
      const rallyCounter = document.getElementById('rally-counter');
      if (rallyCounter) {
        rallyCounter.textContent = `${getTranslation('game_local', 'rallies')}: ${rallieCount}`;
      }
    }
  });

  // ✅ 3. Crear partida en la base de datos al inicio
  try {
    fetch('/api/auth/games/create/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1Id: currentUser.id,
        tournamentId: null, // o pasa un valor si es torneo
        startedAt
      })
    }).catch(err => console.error(getTranslation('unifiedGameLocal', 'errorCreatingLocalGame'), err));
  } catch (err) {
    console.error(getTranslation('unifiedGameLocal', 'errorInCreateCall'), err);
  }

  // Iniciar cuenta atrás automáticamente
  game.startCountdown();
  
  // Setup back button
  const backButton = document.getElementById('back-button');
  backButton?.addEventListener('click', () => {
    game.cleanup();
    navigateTo('/play');
  });
  
  // Cleanup al salir de la página
  window.addEventListener('beforeunload', () => {
    game.cleanup();
  });
}
