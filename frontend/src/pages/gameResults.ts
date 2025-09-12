import { navigateTo } from '../router.js';
import { getTranslation } from '../i18n.js';
import { getCurrentUser } from '../auth.js';

interface GameResults {
  winner: string;
  loser: string;
  finalScore: { left: number; right: number };
  gameMode: 'local' | 'ai' | 'online';
  gameDuration?: number;
  rallieCount?: number;
  gameId?: string | number;
}

export class GameResultsPage {
  private container: HTMLElement;
  private results: GameResults;

  constructor(container: HTMLElement, results: GameResults) {
    this.container = container;
    this.results = results;
  }

  public async init(): Promise<void> {
    await this.render();
    this.setupEventListeners();
  }

  private async render(): Promise<void> {
    const currentUser = getCurrentUser();
    const isCurrentUserWinner = this.results.winner === currentUser?.username;
    
    // Calculate game statistics
    const totalScore = this.results.finalScore.left + this.results.finalScore.right;
    const winnerScore = Math.max(this.results.finalScore.left, this.results.finalScore.right);
    const loserScore = Math.min(this.results.finalScore.left, this.results.finalScore.right);
    const scoreDifference = winnerScore - loserScore;
    const formattedDuration = this.results.gameDuration ? 
      this.formatDuration(this.results.gameDuration) : 'N/A';

    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div class="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-white mb-2">
              ${getTranslation('results', 'game_finished')}
            </h1>
            <div class="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <!-- Winner Announcement -->
          <div class="text-center mb-8">
            <div class="text-6xl mb-4">
              ${isCurrentUserWinner ? '🏆' : (this.results.gameMode === 'ai' && !isCurrentUserWinner ? '🤖' : '👑')}
            </div>
            <h2 class="text-3xl font-bold ${isCurrentUserWinner ? 'text-green-400' : 'text-blue-400'} mb-2">
              ${this.results.winner}
            </h2>
            <p class="text-xl text-gray-300">
              ${getTranslation('results', 'is_the_winner')}
            </p>
          </div>

          <!-- Final Score -->
          <div class="bg-gray-700 rounded-lg p-6 mb-8">
            <h3 class="text-xl font-semibold text-white mb-4 text-center">
              ${getTranslation('results', 'final_score')}
            </h3>
            <div class="flex justify-center items-center space-x-8">
              <div class="text-center">
                <div class="text-3xl font-bold text-green-400">${this.results.finalScore.left}</div>
                <div class="text-sm text-gray-300">${getTranslation('results', 'player_1')}</div>
              </div>
              <div class="text-2xl text-gray-400">-</div>
              <div class="text-center">
                <div class="text-3xl font-bold text-red-400">${this.results.finalScore.right}</div>
                <div class="text-sm text-gray-300">${getTranslation('results', 'player_2')}</div>
              </div>
            </div>
          </div>

          <!-- Game Statistics -->
          <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-400">${this.results.gameMode.toUpperCase()}</div>
              <div class="text-sm text-gray-300">${getTranslation('results', 'game_mode')}</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-purple-400">${formattedDuration}</div>
              <div class="text-sm text-gray-300">${getTranslation('results', 'duration')}</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-yellow-400">${totalScore}</div>
              <div class="text-sm text-gray-300">${getTranslation('results', 'total_points')}</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-orange-400">${this.results.rallieCount || 0}</div>
              <div class="text-sm text-gray-300">${getTranslation('results', 'rallies')}</div>
            </div>
          </div>

          <!-- Performance Analysis -->
          <div class="bg-gray-700 rounded-lg p-6 mb-8">
            <h3 class="text-lg font-semibold text-white mb-4">
              ${getTranslation('results', 'performance_analysis')}
            </h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-300">${getTranslation('results', 'margin_of_victory')}:</span>
                <span class="text-white font-semibold">${scoreDifference} ${getTranslation('results', 'points')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-300">${getTranslation('results', 'winner_accuracy')}:</span>
                <span class="text-white font-semibold">${Math.round((winnerScore / totalScore) * 100)}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-300">${getTranslation('results', 'game_intensity')}:</span>
                <span class="text-white font-semibold">${this.getGameIntensity(scoreDifference)}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4">
            <button id="play-again-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
              🔄 ${getTranslation('results', 'play_again')}
            </button>
            <button id="view-stats-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
              📊 ${getTranslation('results', 'view_stats')}
            </button>
            <button id="main-menu-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
              🏠 ${getTranslation('results', 'main_menu')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const playAgainBtn = document.getElementById('play-again-btn');
    const viewStatsBtn = document.getElementById('view-stats-btn');
    const mainMenuBtn = document.getElementById('main-menu-btn');

    playAgainBtn?.addEventListener('click', () => {
      this.handlePlayAgain();
    });

    viewStatsBtn?.addEventListener('click', () => {
      navigateTo('/statistics');
    });

    mainMenuBtn?.addEventListener('click', () => {
      navigateTo('/dashboard');
    });
  }

  private handlePlayAgain(): void {
    switch (this.results.gameMode) {
      case 'local':
        navigateTo('/unified-game-local');
        break;
      case 'ai':
        navigateTo('/unified-game-ai');
        break;
      case 'online':
        navigateTo('/unified-game-online');
        break;
      default:
        navigateTo('/dashboard');
    }
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  private getGameIntensity(scoreDifference: number): string {
    if (scoreDifference <= 1) {
      return getTranslation('results', 'very_close');
    } else if (scoreDifference <= 2) {
      return getTranslation('results', 'competitive');
    } else if (scoreDifference <= 3) {
      return getTranslation('results', 'dominant');
    } else {
      return getTranslation('results', 'crushing');
    }
  }

  public destroy(): void {
    // Clean up any event listeners or timers if needed
    this.container.innerHTML = '';
  }
}
