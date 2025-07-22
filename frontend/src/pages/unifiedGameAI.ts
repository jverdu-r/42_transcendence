import { UnifiedGameRenderer, GameMode } from '../components/UnifiedGameRenderer';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';

export function renderUnifiedGameAI(): void {
  const pageContent = document.getElementById('page-content');

  if (!pageContent) {
    console.error('No se encontró el contenedor de contenido de la página para "/unified-game-ai".');
    return;
  }

  // Interfaz inicial para seleccionar la dificultad de la IA
  pageContent.innerHTML = `
    <div class="w-full max-w-4xl mx-auto text-center">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-4">🤖 Juego vs Inteligencia Artificial</h1>
        <p class="text-lg text-gray-300 mb-6">Selecciona el nivel de desafío que prefieras</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Dificultad Fácil -->
        <div class="bg-green-800 rounded-lg p-6 hover:bg-green-700 transition-colors cursor-pointer transform hover:scale-105" 
             id="easy-card">
          <div class="text-6xl mb-4">😊</div>
          <h2 class="text-2xl font-bold text-green-400 mb-3">Fácil</h2>
          <p class="text-gray-300 mb-4">
            Perfecto para principiantes. La IA reacciona lentamente y tiene margen de error.
          </p>
          <div class="text-sm text-gray-400 mb-4">
            <div>🐌 IA con velocidad reducida</div>
            <div>🎯 Gran margen de error (40px)</div>
            <div>📚 Ideal para aprender</div>
          </div>
          <button class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded transition-colors">
            Jugar Fácil
          </button>
        </div>

        <!-- Dificultad Media -->
        <div class="bg-yellow-800 rounded-lg p-6 hover:bg-yellow-700 transition-colors cursor-pointer transform hover:scale-105" 
             id="medium-card">
          <div class="text-6xl mb-4">😐</div>
          <h2 class="text-2xl font-bold text-yellow-400 mb-3">Medio</h2>
          <p class="text-gray-300 mb-4">
            Un desafío equilibrado. La IA es más inteligente pero aún tiene errores ocasionales.
          </p>
          <div class="text-sm text-gray-400 mb-4">
            <div>⚖️ IA equilibrada</div>
            <div>🎯 Margen medio de error (20px)</div>
            <div>🏆 Desafío justo</div>
          </div>
          <button class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded transition-colors">
            Jugar Medio
          </button>
        </div>

        <!-- Dificultad Difícil -->
        <div class="bg-red-800 rounded-lg p-6 hover:bg-red-700 transition-colors cursor-pointer transform hover:scale-105" 
             id="hard-card">
          <div class="text-6xl mb-4">😤</div>
          <h2 class="text-2xl font-bold text-red-400 mb-3">Difícil</h2>
          <p class="text-gray-300 mb-4">
            Solo para expertos. La IA es casi perfecta y reacciona muy rápidamente.
          </p>
          <div class="text-sm text-gray-400 mb-4">
            <div>🚀 IA muy rápida</div>
            <div>🎯 Margen mínimo de error (5px)</div>
            <div>💀 Máximo desafío</div>
          </div>
          <button class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded transition-colors">
            Jugar Difícil
          </button>
        </div>
      </div>

      <!-- Botón de regreso -->
      <div class="text-center">
        <button id="back-button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
          ← Volver al Menú Principal
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
        <h1 class="text-3xl font-bold text-white mb-2">🤖 vs IA - Dificultad ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h1>
        <p class="text-gray-300">¡Enfréntate a la inteligencia artificial!</p>
      </div>

      <!-- Información de controles -->
      <div class="bg-gray-800 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="text-center">
            <h3 class="text-lg font-bold text-green-400 mb-2">🎮 Jugador (Izquierda)</h3>
            <div class="bg-green-600 text-white rounded-lg p-3">
              <div class="text-xl font-bold mb-2">Controles:</div>
              <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">W</kbd> - Subir</div>
              <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">S</kbd> - Bajar</div>
            </div>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-bold text-purple-400 mb-2">🤖 IA (Derecha)</h3>
            <div class="bg-purple-600 text-white rounded-lg p-3">
              <div class="text-xl font-bold mb-2">Características:</div>
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
          <h3 class="text-lg font-bold text-green-400 mb-2">📊 Información del Juego</h3>
          <div class="space-y-2 text-sm">
            <div>🏆 Primer jugador en llegar a <span class="font-bold text-yellow-400">5 puntos</span> gana</div>
            <div>⚡ Las físicas se aceleran con cada rebote</div>
            <div>🎯 Ángulo de rebote basado en el punto de contacto</div>
          </div>
        </div>
        <div id="score-display" class="bg-gray-800 rounded-lg p-4 text-center">
          <h3 class="text-lg font-bold text-purple-400 mb-4">⚽ Marcador</h3>
          <div class="flex justify-between items-center">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400" id="score-left">0</div>
              <div class="text-sm text-gray-400">Jugador</div>
            </div>
            <div class="text-2xl font-bold text-white">-</div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-400" id="score-right">0</div>
              <div class="text-sm text-gray-400">IA</div>
            </div>
          </div>
        </div>
        <div id="game-status" class="bg-gray-800 rounded-lg p-4">
          <h3 class="text-lg font-bold text-blue-400 mb-2">🎮 Estado del Juego</h3>
          <div id="status-message" class="text-sm text-gray-300">Preparando juego...</div>
          <div id="rally-counter" class="text-xs text-gray-500 mt-2">Rebotes: 0</div>
        </div>
      </div>

      <!-- Botón de regreso -->
      <div class="text-center mt-6">
        <button id="back-button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors">
          ← Volver al Selector de Dificultad
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
  
  if (!canvas) {
    console.error('No se encontró el canvas del juego');
    return;
  }

  // Crear instancia del juego
  const game = new UnifiedGameRenderer(canvas, 'ai');
  
  // Configurar dificultad de la IA
  game.setAIDifficulty(difficulty);
  
  // Set up player info
  const playerName = currentUser?.username || 'Jugador';
  const difficultyNames = {
    'easy': 'IA Fácil',
    'medium': 'IA Media', 
    'hard': 'IA Difícil'
  };

  const player1Info = {
    numero: 1,
    displayName: playerName,
    username: currentUser?.username || 'player',
    controls: 'W/S'
  };

  const player2Info = {
    numero: 2,
    displayName: difficultyNames[difficulty],
    username: 'ai',
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
    onGameEnd: (winner, finalScore) => {
      const statusMsg = document.getElementById('status-message');
      if (statusMsg) {
        const isPlayerWinner = winner === playerName;
        statusMsg.innerHTML = `
          <div class="${isPlayerWinner ? 'text-green-400' : 'text-red-400'} font-bold">
            ${isPlayerWinner ? '🎉' : '😢'} ${winner} ha ganado!
          </div>
          <div class="text-sm text-gray-400 mt-1">Resultado final: ${finalScore.left} - ${finalScore.right}</div>
          <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2 text-sm">
            🔄 Jugar de Nuevo
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
    'easy': '🐌 Velocidad: Lenta<br>🎯 Precisión: Baja<br>📚 Ideal para aprender',
    'medium': '⚖️ Velocidad: Media<br>🎯 Precisión: Media<br>🏆 Desafío equilibrado',
    'hard': '🚀 Velocidad: Muy alta<br>🎯 Precisión: Muy alta<br>💀 Máximo desafío'
  };
  
  return descriptions[difficulty];
}
