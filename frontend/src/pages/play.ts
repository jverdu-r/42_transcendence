import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';

export function renderPlay(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor para mostrar la página de juego.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-6xl mx-auto text-center">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🎮 Selecciona tu modo de juego
        </h1>
        <p class="text-lg text-gray-300">
          Elige cómo quieres jugar al clásico Pong con físicas mejoradas
        </p>
      </div>

      <!-- Grid ajustado a 4 columnas para mejor distribución -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Juego Local -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-yellow-400" 
             id="local-game-card">
          <div class="text-6xl mb-4">🏠</div>
          <h2 class="text-xl font-bold text-yellow-400 mb-2">Juego Local</h2>
          <p class="text-gray-300 mb-4 text-sm">
            Juega contra un amigo en el mismo dispositivo. 
            Perfecto para partidas rápidas cara a cara.
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>👥 2 Jugadores</div>
            <div>🎮 Mismo dispositivo</div>
            <div>⚡ Partida instantánea</div>
            <div>🕹️ W/S vs ↑/↓</div>
          </div>
          <button class="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded transition-colors w-full">
            Jugar Local
          </button>
        </div>

        <!-- Juego vs IA -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-green-400" 
             id="ai-game-card">
          <div class="text-6xl mb-4">🤖</div>
          <h2 class="text-xl font-bold text-green-400 mb-2">vs Inteligencia Artificial</h2>
          <p class="text-gray-300 mb-4 text-sm">
            Enfréntate a la IA con físicas realistas del Pong original. 
            Elige tu nivel de desafío.
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>🎯 3 Dificultades</div>
            <div>🧠 IA adaptativa</div>
            <div>⚡ Físicas mejoradas</div>
            <div>📊 Entrena habilidades</div>
          </div>
          <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors w-full">
            Jugar vs IA
          </button>
        </div>

        <!-- Juego Online -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-blue-400" 
             id="online-game-card">
          <div class="text-6xl mb-4">🌐</div>
          <h2 class="text-xl font-bold text-blue-400 mb-2">Juego Online</h2>
          <p class="text-gray-300 mb-4 text-sm">
            Conéctate con jugadores de todo el mundo.
            Crea o únete a partidas online multijugador.
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>🌍 Multijugador global</div>
            <div>🏆 Partidas competitivas</div>
            <div>💬 Chat en tiempo real</div>
            <div>⚡ Físicas sincronizadas</div>
          </div>
          <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors w-full">
            Jugar Online
          </button>
        </div>

        <!-- Visor de Partidas -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-purple-400" 
             id="observer-game-card">
          <div class="text-6xl mb-4">👁️</div>
          <h2 class="text-xl font-bold text-purple-400 mb-2">Modo Espectador</h2>
          <p class="text-gray-300 mb-4 text-sm">
            Observa partidas en vivo de otros jugadores.
            Aprende estrategias y disfruta del espectáculo.
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>📺 Visualización en tiempo real</div>
            <div>🍿 Modo espectador</div>
            <div>📊 Estadísticas de partida</div>
            <div>🎯 Aprende de otros</div>
          </div>
          <button class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors w-full">
            Ver Partidas
          </button>
        </div>
      </div>

      <!-- Sección de estadísticas rápidas -->
      <div class="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 class="text-2xl font-bold mb-4 text-purple-400">📊 Tus Estadísticas</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-container">
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-400" id="total-games">-</div>
            <div class="text-sm text-gray-400">Partidas Totales</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-400" id="total-wins">-</div>
            <div class="text-sm text-gray-400">Victorias</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-400" id="win-rate">-</div>
            <div class="text-sm text-gray-400">% Victorias</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-400" id="best-streak">-</div>
            <div class="text-sm text-gray-400">Mejor Racha</div>
          </div>
        </div>
      </div>

      <!-- Información sobre las mejoras -->
      <div class="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
        <h3 class="text-xl font-bold mb-4 text-yellow-400">⚡ Físicas Mejoradas del Pong Original</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div>
            <h4 class="font-semibold text-green-400 mb-2">🎯 Rebotes Realistas</h4>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Ángulo basado en punto de contacto</li>
              <li>• Velocidad variable según posición</li>
              <li>• Incremento progresivo de velocidad</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-blue-400 mb-2">🚀 Mecánicas Clásicas</h4>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Física de pelota fiel al original</li>
              <li>• Rebotes en paredes superior/inferior</li>
              <li>• Sistema de puntuación clásico</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-yellow-400 mb-2">⏰ Nuevas Características</h4>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Cuenta atrás antes de iniciar</li>
              <li>• Partidas inmediatas sin botones</li>
              <li>• Selector de dificultad para IA</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load and display stats
  loadGameStats();

  // Set up event listeners for main game modes
  document.getElementById('local-game-card')?.addEventListener('click', () => {
    navigateTo('/unified-game-local');
  });

  document.getElementById('ai-game-card')?.addEventListener('click', () => {
    navigateTo('/unified-game-ai');
  });

  document.getElementById('online-game-card')?.addEventListener('click', () => {
    navigateTo('/unified-game-online');
  });

  document.getElementById('observer-game-card')?.addEventListener('click', () => {
    navigateTo('/spectator');
  });
}

function loadGameStats(): void {
  try {
    // Load stats from localStorage
    const savedStats = localStorage.getItem('pongGameStats');
    if (!savedStats) {
      // Show default values
      updateStatsDisplay({
        totalGames: 0,
        totalWins: 0,
        winRate: 0,
        bestStreak: 0
      });
      return;
    }

    const allStats = JSON.parse(savedStats);
    
    // Calculate aggregated stats
    const totalGames = allStats.length;
    const totalWins = allStats.filter((game: any) => 
      (game.player1Name === getCurrentUserName() && game.player1Score > game.player2Score) ||
      (game.player2Name === getCurrentUserName() && game.player2Score > game.player1Score)
    ).length;
    
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    
    // Calculate best streak (simplified)
    let bestStreak = 0;
    let currentStreak = 0;
    
    for (const game of allStats) {
      const userWon = (game.player1Name === getCurrentUserName() && game.player1Score > game.player2Score) ||
                      (game.player2Name === getCurrentUserName() && game.player2Score > game.player1Score);
      
      if (userWon) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    updateStatsDisplay({
      totalGames,
      totalWins,
      winRate,
      bestStreak
    });

  } catch (error) {
    console.error('Error loading game stats:', error);
    updateStatsDisplay({
      totalGames: 0,
      totalWins: 0,
      winRate: 0,
      bestStreak: 0
    });
  }
}

function updateStatsDisplay(stats: {
  totalGames: number;
  totalWins: number;
  winRate: number;
  bestStreak: number;
}): void {
  const totalGamesEl = document.getElementById('total-games');
  const totalWinsEl = document.getElementById('total-wins');
  const winRateEl = document.getElementById('win-rate');
  const bestStreakEl = document.getElementById('best-streak');

  if (totalGamesEl) totalGamesEl.textContent = stats.totalGames.toString();
  if (totalWinsEl) totalWinsEl.textContent = stats.totalWins.toString();
  if (winRateEl) winRateEl.textContent = `${stats.winRate}%`;
  if (bestStreakEl) bestStreakEl.textContent = stats.bestStreak.toString();
}

function getCurrentUserName(): string {
  // Use the getCurrentUser function from auth.ts
  try {
    const user = getCurrentUser();
    return user?.username || 'Jugador';
  } catch {
    return 'Jugador';
  }
}
