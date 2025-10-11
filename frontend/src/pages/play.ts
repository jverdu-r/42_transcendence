import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { getTranslation } from '../i18n';

export function renderPlay(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error(getTranslation('playPage', 'containerNotFound'));
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-6xl mx-auto text-center">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🎮 ${getTranslation('playPage', 'selectGameMode')}
        </h1>
        <p class="text-lg text-gray-300">
          ${getTranslation('playPage', 'chooseHowToPlay')}
        </p>
      </div>

      <!-- Grid adjusted to 4 columns for better distribution -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- Juego Local -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-yellow-400" 
             id="local-game-card">
          <div class="text-6xl mb-4">🏠</div>
          <h2 class="text-xl font-bold text-yellow-400 mb-2">${getTranslation('playPage', 'localGame')}</h2>
          <p class="text-gray-300 mb-4 text-sm">
            ${getTranslation('playPage', 'localGameDescription')}
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>👥 ${getTranslation('playPage', 'twoPlayers')}</div>
            <div>🎮 ${getTranslation('playPage', 'sameDevice')}</div>
            <div>⚡ ${getTranslation('playPage', 'instantMatch')}</div>
            <div>🕹️ ${getTranslation('playPage', 'localControls')}</div>
          </div>
          <button class="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded transition-colors w-full">
            ${getTranslation('playPage', 'playLocal')}
          </button>
        </div>

        <!-- Juego vs IA -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-green-400" 
             id="ai-game-card">
          <div class="text-6xl mb-4">🤖</div>
          <h2 class="text-xl font-bold text-green-400 mb-2">${getTranslation('playPage', 'vsAI')}</h2>
          <p class="text-gray-300 mb-4 text-sm">
            ${getTranslation('playPage', 'aiGameDescription')}
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>🎯 ${getTranslation('playPage', 'threeDifficulties')}</div>
            <div>🧠 ${getTranslation('playPage', 'adaptiveAI')}</div>
            <div>⚡ ${getTranslation('playPage', 'improvedPhysics')}</div>
            <div>📊 ${getTranslation('playPage', 'trainSkills')}</div>
          </div>
          <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors w-full">
            ${getTranslation('playPage', 'playVsAI')}
          </button>
        </div>

        <!-- Juego Online -->
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-blue-400" 
             id="online-game-card">
          <div class="text-6xl mb-4">🌐</div>
          <h2 class="text-xl font-bold text-blue-400 mb-2">${getTranslation('playPage', 'onlineGame')}</h2>
          <p class="text-gray-300 mb-4 text-sm">
            ${getTranslation('playPage', 'onlineGameDescription')}
          </p>
          <div class="text-xs text-gray-400 mb-4 space-y-1">
            <div>🌍 ${getTranslation('playPage', 'globalMultiplayer')}</div>
            <div>🏆 ${getTranslation('playPage', 'competitiveMatches')}</div>
            <div>💬 ${getTranslation('playPage', 'realTimeChat')}</div>
            <div>⚡ ${getTranslation('playPage', 'synchronizedPhysics')}</div>
          </div>
          <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors w-full">
            ${getTranslation('playPage', 'playOnline')}
          </button>
        </div>
      </div>

      <!-- Quick statistics section -->
      <div class="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 class="text-2xl font-bold mb-4 text-purple-400">📊 ${getTranslation('playPage', 'yourStatistics')}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-container">
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-400" id="total-games">-</div>
            <div class="text-sm text-gray-400">${getTranslation('playPage', 'totalMatches')}</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-400" id="total-wins">-</div>
            <div class="text-sm text-gray-400">${getTranslation('playPage', 'victories')}</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-400" id="win-rate">-</div>
            <div class="text-sm text-gray-400">${getTranslation('playPage', 'winPercentage')}</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-400" id="best-streak">-</div>
            <div class="text-sm text-gray-400">${getTranslation('playPage', 'bestStreak')}</div>
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
}

function loadGameStats(): void {
  // Show loading state
  showStatsLoading();

  // Get stats from database via API (same method as profile page)
  getUserStats()
    .then(stats => {
      if (stats) {
        updateStatsDisplay({
          totalGames: stats.totalGames || 0,
          totalWins: stats.wins || 0,
          winRate: Math.round(stats.winRate || 0),
          bestStreak: calculateBestStreak(stats.matchHistory || [])
        });
      } else {
        // If no stats from API, show default values
        updateStatsDisplay({
          totalGames: 0,
          totalWins: 0,
          winRate: 0,
          bestStreak: 0
        });
      }
    })
    .catch(error => {
      console.error('Error loading game stats from database:', error);
      // Show default values on error
      updateStatsDisplay({
        totalGames: 0,
        totalWins: 0,
        winRate: 0,
        bestStreak: 0
      });
    });
}

async function getUserStats(): Promise<{
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  elo: number;
  ranking: number;
  matchHistory: Array<{
    id: number;
    result: 'win' | 'loss';
    opponent: string;
    score: string;
    date: string;
  }>;
} | null> {
  const token = localStorage.getItem('jwt');
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/profile/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function calculateBestStreak(matchHistory: Array<{ result: 'win' | 'loss' }>): number {
  let bestStreak = 0;
  let currentStreak = 0;
  
  // Calculate streaks from match history
  for (const match of matchHistory) {
    if (match.result === 'win') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return bestStreak;
}

async function fetchUserStats(): Promise<{
  totalGames: number;
  totalWins: number;
  winRate: number;
  bestStreak: number;
}> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser?.username) {
      throw new Error('No authenticated user found');
    }

    // Make API call to get user statistics
    const response = await fetch(`/api/users/${currentUser.username}/stats`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform API response to expected format
    return {
      totalGames: data.totalGames || 0,
      totalWins: data.totalWins || 0,
      winRate: data.winRate || 0,
      bestStreak: data.bestStreak || 0
    };

  } catch (error) {
    console.error('Error fetching user stats from API:', error);
    throw error;
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

function showStatsLoading(): void {
  const totalGamesEl = document.getElementById('total-games');
  const totalWinsEl = document.getElementById('total-wins');
  const winRateEl = document.getElementById('win-rate');
  const bestStreakEl = document.getElementById('best-streak');

  if (totalGamesEl) totalGamesEl.textContent = '...';
  if (totalWinsEl) totalWinsEl.textContent = '...';
  if (winRateEl) winRateEl.textContent = '...';
  if (bestStreakEl) bestStreakEl.textContent = '...';
}

function getCurrentUserName(): string {
  // Use the getCurrentUser function from auth.ts
  try {
    const user = getCurrentUser();
    return user?.username || getTranslation('playPage', 'player');
  } catch {
    return getTranslation('playPage', 'player');
  }
}
