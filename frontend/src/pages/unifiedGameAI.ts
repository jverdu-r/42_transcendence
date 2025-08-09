import { UnifiedGameRenderer, GameMode } from '../components/UnifiedGameRenderer';
import { getCurrentUser, getSetting } from '../auth';
import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

export function renderUnifiedGameAI(): void {
  const pageContent = document.getElementById('page-content');

  if (!pageContent) {
    console.error('No se encontró el contenedor de contenido de la página para "/unified-game-ai".');
    return;
  }

  // Obtener dificultad preferida del usuario
  const defaultDifficulty = getSetting('game_difficulty') || 'normal'; // fallback

  // Interfaz inicial para seleccionar la dificultad de la IA
  pageContent.innerHTML = `
    <div class="w-full max-w-4xl mx-auto text-center">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-4">${getTranslation('game_AI', 'title')}</h1>
        <p class="text-lg text-gray-300 mb-6">${getTranslation('game_AI', 'subtitle')}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Fácil -->
        <div id="easy-card" class="difficulty-card ${defaultDifficulty === 'easy' ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' : 'border-gray-600'} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20">
          <h3 class="text-xl font-bold text-yellow-400 mb-2">🐢 ${getTranslation('game_AI', 'easy')}</h3>
          <p class="text-sm text-gray-300">${getTranslation('game_AI', 'easy_desc')}</p>
        </div>

        <!-- Normal -->
        <div id="medium-card" class="difficulty-card ${defaultDifficulty === 'normal' ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' : 'border-gray-600'} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20">
          <h3 class="text-xl font-bold text-blue-400 mb-2">⚖️ ${getTranslation('game_AI', 'normal')}</h3>
          <p class="text-sm text-gray-300">${getTranslation('game_AI', 'normal_desc')}</p>
        </div>

        <!-- Difícil -->
        <div id="hard-card" class="difficulty-card ${defaultDifficulty === 'hard' ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' : 'border-gray-600'} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20">
          <h3 class="text-xl font-bold text-red-400 mb-2">💀 ${getTranslation('game_AI', 'hard')}</h3>
          <p class="text-sm text-gray-300">${getTranslation('game_AI', 'hard_desc')}</p>
        </div>
      </div>

      <div class="text-center">
        <button id="back-button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
          ← ${getTranslation('game_AI', 'back')}
        </button>
      </div>
    </div>
  `;

  // Event listeners para las tarjetas de dificultad
  document.getElementById('easy-card')?.addEventListener('click', () => startGameWithDifficulty('easy'));
  document.getElementById('medium-card')?.addEventListener('click', () => startGameWithDifficulty('medium'));
  document.getElementById('hard-card')?.addEventListener('click', () => startGameWithDifficulty('hard'));

  // Event listener para el botón de regreso
  document.getElementById('back-button')?.addEventListener('click', () => {
    navigateTo('/play');
  });
}

function startGameWithDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
  const pageContent = document.getElementById('page-content');

  if (!pageContent) {
    console.error('No se encontró el contenedor de contenido de la página para iniciar el juego.');
    return;
  }

  // Configurar la interfaz de juego
  pageContent.innerHTML = `
    <div class="w-full max-w-6xl mx-auto">
      <!-- Header del juego -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-white mb-2">🤖 vs IA - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h1>
        <p class="text-gray-300">${getTranslation('game_AI', 'vs_ai')}</p>
      </div>

      <!-- Información de controles -->
      <div class="bg-gray-800 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="text-center">
            <h3 class="text-lg font-bold text-green-400 mb-2">🎮 ${getTranslation('game_AI', 'player')}</h3>
            <div class="bg-green-600 text-white rounded-lg p-3">
              <div class="text-xl font-bold mb-2">${getTranslation('game_AI', 'controls')}:</div>
              <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">W</kbd> - ${getTranslation('game_AI', 'move_up')}</div>
              <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">S</kbd> - ${getTranslation('game_AI', 'move_down')}</div>
            </div>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-bold text-purple-400 mb-2">🤖 ${getTranslation('game_AI', 'bot')}</h3>
            <div class="bg-purple-600 text-white rounded-lg p-3">
              <div class="text-xl font-bold mb-2">${getTranslation('game_AI', 'features')}:</div>
              <div id="ai-info">
                ${getAIDescription(difficulty)}
              </div>
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
          <h3 class="text-lg font-bold text-green-400 mb-2">📊 ${getTranslation('game_AI', 'game_info')}</h3>
          <div class="space-y-2 text-sm">
            <div>🏆 ${getTranslation('game_AI', 'first_to')} <span class="font-bold text-yellow-400">5</span> ${getTranslation('game_AI', 'points_win')}</div>
            <div>⚡ ${getTranslation('game_AI', 'physics_speed_up')}</div>
            <div>🎯 ${getTranslation('game_AI', 'angle_on_contact')}</div>
          </div>
        </div>
        <div id="score-display" class="bg-gray-800 rounded-lg p-4 text-center">
          <h3 class="text-lg font-bold text-purple-400 mb-4">⚽ ${getTranslation('game_AI', 'score')}</h3>
          <div class="flex justify-between items-center">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400" id="score-left">0</div>
              <div class="text-sm text-gray-400">${getTranslation('game_AI', 'player')}</div>
            </div>
            <div class="text-2xl font-bold text-white">-</div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-400" id="score-right">0</div>
              <div class="text-sm text-gray-400">${getTranslation('game_AI', 'bot')}</div>
            </div>
          </div>
        </div>
        <div id="game-status" class="bg-gray-800 rounded-lg p-4">
          <h3 class="text-lg font-bold text-blue-400 mb-2">🎮 ${getTranslation('game_AI', 'game_status')}</h3>
          <div id="status-message" class="text-sm text-gray-300">${getTranslation('game_AI', 'preparing')}</div>
          <div id="rally-counter" class="text-xs text-gray-500 mt-2">${getTranslation('game_AI', 'rallies')}: 0</div>
        </div>
      </div>

      <!-- Botón de regreso -->
      <div class="text-center mt-6">
        <button id="back-button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
          ← ${getTranslation('game_AI', 'back_to_selector')}
        </button>
      </div>
    </div>
  `;

  // Configurar el juego
  setupAIGame(difficulty);
}

function setupAIGame(difficulty: 'easy' | 'medium' | 'hard'): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const currentUser = getCurrentUser();
  if (!canvas || !currentUser) {
    console.error('Canvas o usuario no disponibles');
    return;
  }
  
  if (!canvas) {
    console.error('No se encontró el canvas del juego');
    return;
  }

  // Generar startedAt
  const startedAt = new Date().toISOString();

  // ✅ Crear partida en DB
  fetch('/api/auth/games/create/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1Id: currentUser.id,
      difficulty,
      startedAt
    })
  }).catch(err => console.error('Error creando partida contra IA en DB:', err));

  // Crear instancia del juego
  const game = new UnifiedGameRenderer(canvas, 'ai');
  
  // Configurar dificultad de la IA
  game.setAIDifficulty(difficulty);
  
  const player1Info = {
    numero: 1,
    displayName: currentUser.username,
    username: currentUser.username,
    controls: 'W/S'
  };

  const player2Info = {
    numero: 2,
    displayName: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot`,
    username: 'AI',
    controls: 'Automático'
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
      console.log('Final score:', finalScore);
      // Recuperar gameId
      let dbGameId: number | null = null;
      try {
        const response = await fetch('/api/auth/games/id-by-started-at', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startedAt })
        });
        const data = await response.json();
        dbGameId = data.gameId;
      } catch (err) {
        console.error('Error obteniendo gameId:', err);
      }
      // Actualizar DB
      if (dbGameId) {
        try {
          await fetch('/api/auth/games/finish/ai', {
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
          console.error('Error al finalizar partida contra IA en DB:', err);
        }
      }
      // Mostrar mensaje
      const statusMsg = document.getElementById('status-message');
      if (statusMsg) {
        const isPlayerWinner = winner === currentUser.username;
        statusMsg.innerHTML = `
          <div class="${isPlayerWinner ? 'text-green-400' : 'text-red-400'} font-bold">
            ${isPlayerWinner ? '🎉' : '😢'} ${winner} ${getTranslation('game_AI', 'has_won')}!
          </div>
          <div class="text-sm text-gray-400 mt-1">${getTranslation('game_AI', 'final_score')}: ${finalScore.left} - ${finalScore.right}</div>
          <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2 text-sm">
            🔄 ${getTranslation('game_AI', 'play_again')}
          </button>
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

  // Iniciar cuenta atrás automáticamente
  game.startCountdown();
  
  // Setup back button
  const backButton = document.getElementById('back-button');
  backButton?.addEventListener('click', () => {
    game.cleanup();
    renderUnifiedGameAI(); // Volver al selector de dificultad
  });
  
  // Cleanup al salir de la página
  window.addEventListener('beforeunload', () => {
    game.cleanup();
  });
}

function getAIDescription(difficulty: 'easy' | 'medium' | 'hard'): string {
  const descriptions = {
    'easy': `🐌 ${getTranslation('game_AI', 'speed')}: ${getTranslation('game_AI', 'slow')}<br>🎯 ${getTranslation('game_AI', 'accuracy')}: ${getTranslation('game_AI', 'low')}<br>📚 ${getTranslation('game_AI', 'ideal_for_learning')}`,
    'medium': `⚖️ ${getTranslation('game_AI', 'speed')}: ${getTranslation('game_AI', 'medium')}<br>🎯 ${getTranslation('game_AI', 'accuracy')}: ${getTranslation('game_AI', 'medium')}<br>🏆 ${getTranslation('game_AI', 'balanced_challenge')}`,
    'hard': `🚀 ${getTranslation('game_AI', 'speed')}: ${getTranslation('game_AI', 'very_high')}<br>🎯 ${getTranslation('game_AI', 'accuracy')}: ${getTranslation('game_AI', 'very_high')}<br>💀 ${getTranslation('game_AI', 'maximum_challenge')}`
  };
  return descriptions[difficulty];
}