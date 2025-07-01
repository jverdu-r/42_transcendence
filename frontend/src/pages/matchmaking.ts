// src/pages/matchmaking.ts

import { getTranslation as t } from '../i18n';
import { onlineGameManager } from './pong/onlineGameManager';
import { onlineGameService, MatchFoundData } from '../services/websocket';

export function renderMatchmakingPage(): void {
  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (!pageContent) {
    console.error('Page content container not found');
    return;
  }

  pageContent.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      <div class="container mx-auto px-4 py-8 relative z-10">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            ${t('MATCHMAKING_TITLE', 'Online Matchmaking')}
          </h1>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            ${t('MATCHMAKING_SUBTITLE', 'Choose your game mode and find opponents for an exciting online match')}
          </p>
        </div>

        <!-- Matchmaking Status Container -->
        <div id="matchmaking-status" class="hidden">
          <div class="max-w-md mx-auto bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 text-center">
            <!-- Searching State -->
            <div id="searching-state" class="hidden">
              <div class="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <h3 class="text-2xl font-bold mb-4">${t('SEARCHING_MATCH', 'Searching for match...')}</h3>
              <p class="text-gray-300 mb-2">${t('GAME_MODE', 'Game Mode')}: <span id="current-mode" class="text-yellow-400 font-semibold"></span></p>
              <p class="text-gray-400 text-sm mb-6">${t('MATCHMAKING_WAIT', 'Please wait while we find the perfect opponent for you')}</p>
              <button id="cancel-matchmaking" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
                ${t('CANCEL', 'Cancel')}
              </button>
            </div>

            <!-- Match Found State -->
            <div id="match-found-state" class="hidden">
              <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold mb-4 text-green-400">${t('MATCH_FOUND', 'Match Found!')}</h3>
              <div id="opponent-info" class="mb-6">
                <!-- Opponent info will be populated here -->
              </div>
              <div class="text-sm text-gray-400 mb-4">${t('STARTING_GAME', 'Starting game in a few seconds...')}</div>
            </div>
          </div>
        </div>

        <!-- Game Mode Selection -->
        <div id="mode-selection" class="max-w-4xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 1v1 Mode -->
            <div class="game-mode-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer" data-mode="1v1">
              <div class="text-center">
                <div class="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-10 h-10 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H9V3H15.5L20 7.5V9H21ZM15 22.5L12 19.5L9 22.5L7.5 21L10.5 18H13.5L16.5 21L15 22.5Z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  ${t('MODE_1V1', '1 vs 1')}
                </h3>
                <p class="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  ${t('MODE_1V1_DESC', 'Classic one-on-one battle. Test your skills against a single opponent.')}
                </p>
              </div>
            </div>

            <!-- 1v2 Mode -->
            <div class="game-mode-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer" data-mode="1v2">
              <div class="text-center">
                <div class="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H9V3H15.5L20 7.5V9H21ZM15 22.5L12 19.5L9 22.5L7.5 21L10.5 18H13.5L16.5 21L15 22.5Z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  ${t('MODE_1V2', '1 vs 2')}
                </h3>
                <p class="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  ${t('MODE_1V2_DESC', 'Challenge mode! Face two opponents alone. Are you brave enough?')}
                </p>
              </div>
            </div>

            <!-- 2v1 Mode -->
            <div class="game-mode-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer" data-mode="2v1">
              <div class="text-center">
                <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 4C16 5.11 15.11 6 14 6C12.89 6 12 5.11 12 4C12 2.89 12.89 2 14 2C15.11 2 16 2.89 16 4ZM20 22.5L17 19.5L14 22.5L12.5 21L15.5 18H16.5L19.5 21L20 22.5ZM12.5 11.5C12.5 12.61 11.61 13.5 10.5 13.5C9.39 13.5 8.5 12.61 8.5 11.5C8.5 10.39 9.39 9.5 10.5 9.5C11.61 9.5 12.5 10.39 12.5 11.5Z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  ${t('MODE_2V1', '2 vs 1')}
                </h3>
                <p class="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  ${t('MODE_2V1_DESC', 'Team up with a partner against a solo challenger. Cooperation is key!')}
                </p>
              </div>
            </div>

            <!-- 2v2 Mode -->
            <div class="game-mode-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer" data-mode="2v2">
              <div class="text-center">
                <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 4C16 5.11 15.11 6 14 6C12.89 6 12 5.11 12 4C12 2.89 12.89 2 14 2C15.11 2 16 2.89 16 4ZM20 22.5L17 19.5L14 22.5L12.5 21L15.5 18H16.5L19.5 21L20 22.5ZM12.5 11.5C12.5 12.61 11.61 13.5 10.5 13.5C9.39 13.5 8.5 12.61 8.5 11.5C8.5 10.39 9.39 9.5 10.5 9.5C11.61 9.5 12.5 10.39 12.5 11.5ZM8 22.5L5 19.5L2 22.5L0.5 21L3.5 18H4.5L7.5 21L8 22.5Z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  ${t('MODE_2V2', '2 vs 2')}
                </h3>
                <p class="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  ${t('MODE_2V2_DESC', 'Epic team battles! Coordinate with your teammate to defeat the opposing duo.')}
                </p>
              </div>
            </div>
          </div>

          <!-- Back to Play Button -->
          <div class="text-center mt-12">
            <button id="back-to-play" class="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
              ${t('BACK_TO_PLAY', 'Back to Play Menu')}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  setupMatchmakingEventListeners();
}

function setupMatchmakingEventListeners(): void {
  // Game mode selection
  const gameModeCards = document.querySelectorAll('.game-mode-card');
  gameModeCards.forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-mode');
      if (mode) {
        startMatchmaking(mode);
      }
    });
  });

  // Cancel matchmaking
  const cancelButton = document.getElementById('cancel-matchmaking');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      cancelMatchmaking();
    });
  }

  // Back to play button
  const backButton = document.getElementById('back-to-play');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Import and use navigateTo function
      import('../router').then(({ navigateTo }) => {
        navigateTo('/play');
      });
    });
  }

  // Listen for matchmaking events from onlineGameService
  onlineGameService.onConnectionChanged(() => showModeSelection());
  onlineGameService.onMatchFoundEvent((matchData: any) => showMatchFound(matchData));
  onlineGameService.onErrorEvent(() => showModeSelection());
  onlineGameService.onOpponentDisconnectedEvent(() => showModeSelection());
  
  // Additional event handling for game flow
  // Note: Game navigation is handled by showMatchFound function
}

function startMatchmaking(mode: string): void {
  const modeSelection = document.getElementById('mode-selection');
  const matchmakingStatus = document.getElementById('matchmaking-status');
  const searchingState = document.getElementById('searching-state');
  const currentModeSpan = document.getElementById('current-mode');

  if (modeSelection && matchmakingStatus && searchingState && currentModeSpan) {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Debes estar autenticado para jugar online. Por favor, inicia sesión.');
      import('../router').then(({ navigateTo }) => {
        navigateTo('/login');
      });
      return;
    }

    // Hide mode selection and show searching state
    modeSelection.classList.add('hidden');
    matchmakingStatus.classList.remove('hidden');
    searchingState.classList.remove('hidden');
    
    // Update current mode display
    currentModeSpan.textContent = mode;

    // Start matchmaking with the new user-based system
    console.log(`Starting user-based matchmaking for mode: ${mode}`);
    
    // Connect to online game service directly
    onlineGameService.connect(mode)
      .then(() => {
        console.log('Connected to matchmaking service');
      })
      .catch((error) => {
        console.error('Failed to connect to matchmaking:', error);
        showModeSelection();
        alert('No se pudo conectar al servicio de matchmaking. Inténtalo de nuevo.');
      });
  }
}

function cancelMatchmaking(): void {
  // Cancel matchmaking through onlineGameManager
  onlineGameManager.cancelMatchmaking();
  
  // Return to mode selection
  showModeSelection();
}

function showModeSelection(): void {
  const modeSelection = document.getElementById('mode-selection');
  const matchmakingStatus = document.getElementById('matchmaking-status');
  const searchingState = document.getElementById('searching-state');
  const matchFoundState = document.getElementById('match-found-state');

  if (modeSelection && matchmakingStatus && searchingState && matchFoundState) {
    // Hide all status screens
    matchmakingStatus.classList.add('hidden');
    searchingState.classList.add('hidden');
    matchFoundState.classList.add('hidden');
    
    // Show mode selection
    modeSelection.classList.remove('hidden');
  }
}


function showMatchFound(matchData: any): void {
  const searchingState = document.getElementById('searching-state');
  const matchFoundState = document.getElementById('match-found-state');
  const opponentInfo = document.getElementById('opponent-info');

  if (searchingState && matchFoundState && opponentInfo) {
    // Hide searching state
    searchingState.classList.add('hidden');
    
    // Show match found state
    matchFoundState.classList.remove('hidden');

    // Populate opponent info
    if (matchData.opponents && matchData.opponents.length > 0) {
      const opponentCards = matchData.opponents.map((opponent: any) => `
        <div class="bg-slate-700/50 rounded-lg p-4 mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
              <span class="text-slate-900 font-bold text-lg">${opponent.username ? opponent.username.charAt(0).toUpperCase() : 'P'}</span>
            </div>
            <div>
              <h4 class="font-semibold text-white">${opponent.username || 'Player'}</h4>
              <p class="text-sm text-gray-400">${t('LEVEL', 'Level')} ${opponent.level || 1}</p>
            </div>
          </div>
        </div>
      `).join('');

      opponentInfo.innerHTML = `
        <h4 class="text-lg font-semibold mb-4">${t('YOUR_OPPONENTS', 'Your Opponents')}:</h4>
        ${opponentCards}
      `;
    } else {
      opponentInfo.innerHTML = `
        <div class="bg-slate-700/50 rounded-lg p-4">
          <p class="text-gray-300">${t('OPPONENT_INFO_LOADING', 'Loading opponent information...')}</p>
        </div>
      `;
    }
  }
}

