import { UnifiedGameRenderer, GameMode } from '../components/UnifiedGameRenderer';
import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';

export function renderUnifiedGameLocal(): void {
    const pageContent = document.getElementById('page-content');
    
    if (!pageContent) {
        console.error('No se encontró el contenedor de contenido de la página para "/unified-game-local".');
        return;
    }

    // Configurar la interfaz de juego directamente (sin botones)
    pageContent.innerHTML = `
        <div class="w-full max-w-6xl mx-auto">
            <!-- Header del juego -->
            <div class="text-center mb-6">
                <h1 class="text-3xl font-bold text-white mb-2">🏠 Juego Local - 2 Jugadores</h1>
                <p class="text-gray-300">¡Enfréntense cara a cara en el mismo dispositivo!</p>
            </div>

            <!-- Información de controles -->
            <div class="bg-gray-800 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="text-center">
                        <h3 class="text-lg font-bold text-yellow-400 mb-2">🟡 Jugador 1 (Izquierda)</h3>
                        <div class="bg-yellow-600 text-black rounded-lg p-3">
                            <div class="text-xl font-bold mb-2">Controles:</div>
                            <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">W</kbd> - Subir</div>
                            <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">S</kbd> - Bajar</div>
                        </div>
                    </div>
                    <div class="text-center">
                        <h3 class="text-lg font-bold text-blue-400 mb-2">🔵 Jugador 2 (Derecha)</h3>
                        <div class="bg-blue-600 text-white rounded-lg p-3">
                            <div class="text-xl font-bold mb-2">Controles:</div>
                            <div>⬆️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">O</kbd> - Subir</div>
                            <div>⬇️ <kbd class="bg-gray-200 text-black px-2 py-1 rounded">L</kbd> - Bajar</div>
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
                            <div class="text-3xl font-bold text-yellow-400" id="score-left">0</div>
                            <div class="text-sm text-gray-400">Jugador 1</div>
                        </div>
                        <div class="text-2xl font-bold text-white">-</div>
                        <div class="text-center">
                            <div class="text-3xl font-bold text-blue-400" id="score-right">0</div>
                            <div class="text-sm text-gray-400">Jugador 2</div>
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
                    ← Volver al Menú Principal
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
    console.error('No se encontró el canvas del juego o no hay usuario autenticado');
    return;
  }

  // ✅ Generar marca de tiempo al inicio
  const startedAt = new Date().toISOString();

  // Crear instancia del juego
  const game = new UnifiedGameRenderer(canvas, 'local');
  
  // Set up player info
  const player1Info = {
    numero: 1,
    displayName: 'Jugador 1',
    username: currentUser?.username || 'player1',
    controls: 'W/S'
  };

  const player2Info = {
    numero: 2,
    displayName: 'Jugador 2', 
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
      const statusMsg = document.getElementById('status-message');
      if (statusMsg) {
        statusMsg.innerHTML = `
          <div class="text-green-400 font-bold">🎉 ¡${winner} ha ganado!</div>
          <div class="text-sm text-gray-400 mt-1">Resultado final: ${finalScore.left} - ${finalScore.right}</div>
          <button onclick="location.reload()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mt-2 text-sm">
            🔄 Jugar de Nuevo
          </button>
        `;
      }

      // ✅ 1. Recuperar el gameId real usando startedAt
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
          console.error('No se encontró el gameId en la base de datos');
        }
      } catch (err) {
        console.error('Error al obtener gameId por startedAt:', err);
      }

      // ✅ 2. Actualizar la partida en la base de datos
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
          console.error('Error al finalizar partida en DB:', err);
        }
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
    }).catch(err => console.error('Error creando partida local en DB:', err));
  } catch (err) {
    console.error('Error en la llamada a create/local:', err);
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
