// src/pages/ranking.ts

import { navigateTo } from '../router';
import { renderNavbar } from '../components/navbar'; // Importa el componente del navbar
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n'; // Importa las funciones de i18n

<<<<<<< HEAD
// Interfaces para los datos del ranking
interface RankingPlayer {
  user_id: number;
  username: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  points?: number;
  global_ranking?: number;
}

interface GameMode {
  mode: string;
  description?: string;
}

interface RankingResponse {
  rankings: RankingPlayer[];
  total_players: number;
  current_user_rank?: number;
}

// Estado del componente de ranking
let currentGameMode: string = 'all';
let rankingData: RankingPlayer[] = [];
let gameModes: GameMode[] = [];
let currentUserRank: number | null = null;
let isLoading: boolean = false;
let error: string | null = null;

// Función para obtener el token JWT del localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Función para obtener los modos de juego disponibles
async function fetchGameModes(): Promise<GameMode[]> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/game-modes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch game modes');
    }

    const data = await response.json();
    return data.modes || [];
  } catch (err) {
    console.error('Error fetching game modes:', err);
    return [];
  }
}

// Función para obtener el ranking global o por modo
async function fetchRankings(gameMode: string = 'all'): Promise<RankingResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const endpoint = gameMode === 'all' ? '/api/rankings' : `/api/rankings/${gameMode}`;
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rankings');
    }

    const data = await response.json();
    return {
      rankings: data.rankings || [],
      total_players: data.total_players || 0,
      current_user_rank: data.current_user_rank || null
    };
  } catch (err) {
    console.error('Error fetching rankings:', err);
    return {
      rankings: [],
      total_players: 0,
      current_user_rank: null
    };
  }
}

// Función para cargar todos los datos necesarios
async function loadRankingData(): Promise<void> {
  isLoading = true;
  error = null;

  try {
    // Cargar modos de juego y rankings en paralelo
    const [modes, rankings] = await Promise.all([
      fetchGameModes(),
      fetchRankings(currentGameMode)
    ]);

    gameModes = modes;
    rankingData = rankings.rankings;
    currentUserRank = rankings.current_user_rank;
  } catch (err) {
    console.error('Error loading ranking data:', err);
    error = 'Error al cargar los datos del ranking';
  } finally {
    isLoading = false;
  }
}

// Función para cambiar el modo de juego
async function changeGameMode(newMode: string): Promise<void> {
  if (newMode === currentGameMode) return;
  
  currentGameMode = newMode;
  await loadRankingData();
  renderRankingContent();
}

=======
>>>>>>> main
/**
 * Applies current translations to elements with data-i18n attributes within the ranking page.
 */
function applyTranslations(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const [component, textKey] = key.split('.');
      if (component && textKey) {
        element.textContent = getTranslation(component, textKey);
      }
    }
  });

  // Special handling for dynamic text within the loop
  document.querySelectorAll('.ranking-player-stats').forEach(element => {
    const winsText = getTranslation('ranking', 'wins');
    const lossesText = getTranslation('ranking', 'losses');
    const wins = element.getAttribute('data-wins');
    const losses = element.getAttribute('data-losses');
    element.textContent = `${winsText} ${wins} | ${lossesText} ${losses}`;
  });

  document.querySelectorAll('.ranking-player-points').forEach(element => {
    const points = element.getAttribute('data-points');
    const pointsAbbreviation = getTranslation('ranking', 'pointsAbbreviation');
    element.textContent = `${points} ${pointsAbbreviation}`;
  });
}

export function renderRankingPage(): void {
  // Renderiza el navbar con 'ranking' como el enlace activo
  renderNavbar('/ranking');

<<<<<<< HEAD
  // Cargar datos inmediatamente
  loadRankingData().then(() => {
    renderRankingContent();
  });

  // Renderizar el contenedor inicial con indicador de carga
  renderInitialContent();
}

function renderInitialContent(): void {
  const initialHtml = `
    <main id="ranking-main" class="flex-grow w-full p-4 sm:p-8 mt-24 sm:mt-32 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-4xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 text-center drop-shadow-md leading-tight"
            data-i18n="ranking.globalRankingTitle">${getTranslation('ranking', 'globalRankingTitle')}</h2>
        
        <!-- Filtros de modo de juego -->
        <div id="game-mode-filters" class="mb-6 flex flex-wrap justify-center gap-2">
          <button class="px-4 py-2 rounded-lg bg-[#ffc300] text-[#000814] font-semibold hover:bg-[#ffd60a] transition-all duration-200" data-mode="all">
            ${getTranslation('ranking', 'allModes')}
          </button>
        </div>

        <div id="ranking-content" class="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          <div class="flex justify-center items-center p-8">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffc300]"></div>
          </div>
        </div>

        <div class="mt-6 sm:mt-8 text-center">
          <p id="user-rank-display" class="text-lg sm:text-xl font-semibold text-gray-200 mb-4">
            ${getTranslation('ranking', 'yourCurrentPosition')}: <span class="text-[#ffd60a] font-bold">--</span>
          </p>
        </div>
      </div>
    </main>`;

  const appRoot = document.getElementById('app-root') as HTMLElement;
  if (appRoot) {
    let mainContent = appRoot.querySelector('main');
    if (mainContent) {
      mainContent.outerHTML = initialHtml;
    } else {
      appRoot.insertAdjacentHTML('beforeend', initialHtml);
    }
    applyTranslations();
  }
}

function renderRankingContent(): void {
  const rankingContent = document.getElementById('ranking-content');
  const userRankDisplay = document.getElementById('user-rank-display');
  const gameModeFilters = document.getElementById('game-mode-filters');

  if (!rankingContent) return;

  // Renderizar filtros de modo de juego
  if (gameModeFilters && gameModes.length > 0) {
    const filtersHtml = `
      <button class="px-4 py-2 rounded-lg ${currentGameMode === 'all' ? 'bg-[#ffc300] text-[#000814]' : 'bg-[#003566] text-white'} font-semibold hover:bg-[#ffd60a] hover:text-[#000814] transition-all duration-200" data-mode="all" onclick="changeGameMode('all')">
        ${getTranslation('ranking', 'allModes')}
      </button>
      ${gameModes.map(mode => `
        <button class="px-4 py-2 rounded-lg ${currentGameMode === mode.mode ? 'bg-[#ffc300] text-[#000814]' : 'bg-[#003566] text-white'} font-semibold hover:bg-[#ffd60a] hover:text-[#000814] transition-all duration-200" data-mode="${mode.mode}" onclick="changeGameMode('${mode.mode}')">
          ${mode.description || mode.mode}
        </button>
      `).join('')}
    `;
    gameModeFilters.innerHTML = filtersHtml;
  }

  // Mostrar estado de carga
  if (isLoading) {
    rankingContent.innerHTML = `
      <div class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffc300]"></div>
      </div>
    `;
    return;
  }

  // Mostrar error si existe
  if (error) {
    rankingContent.innerHTML = `
      <div class="text-center p-8">
        <p class="text-red-400 text-lg">${error}</p>
        <button onclick="loadRankingData().then(renderRankingContent)" class="mt-4 px-4 py-2 bg-[#003566] text-white rounded-lg hover:bg-[#004b80] transition-all duration-200">
          ${getTranslation('ranking', 'retry')}
        </button>
      </div>
    `;
    return;
  }

  // Mostrar mensaje si no hay datos
  if (rankingData.length === 0) {
    rankingContent.innerHTML = `
      <div class="text-center p-8">
        <p class="text-gray-300 text-lg">${getTranslation('ranking', 'noPlayersFound')}</p>
      </div>
    `;
    return;
  }

  // Renderizar datos del ranking
  const rankingHtml = rankingData.map((player, index) => {
    const rank = index + 1;
    const isFirst = rank === 1;
    const isTopThree = rank <= 3;
    
    const baseClasses = "flex items-center p-3 sm:p-4 rounded-xl shadow-md border transform hover:scale-[1.01] transition-transform duration-200";
    const rankClasses = isFirst 
      ? "bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] border-[#ffd60a] shadow-lg hover:scale-[1.02]"
      : isTopThree
      ? "bg-gradient-to-r from-[#003566] to-[#001d3d] text-gray-100 border-[#002850]"
      : "bg-[#001d3d] text-gray-100 border-[#002850] shadow-sm hover:scale-[1.005]";
    
    const rankTextClass = isFirst ? "drop-shadow-sm" : isTopThree ? "" : "text-gray-400";
    const nameClass = isFirst ? "font-bold" : isTopThree ? "font-semibold" : "font-medium";
    const statsClass = isFirst ? "opacity-90" : isTopThree ? "text-gray-300" : "text-gray-400";
    const pointsClass = isFirst ? "drop-shadow-sm" : isTopThree ? "text-[#ffd60a]" : "text-[#ffc300]";
    
    return `
      <div class="${baseClasses} ${rankClasses}">
        <span class="font-bold text-xl sm:text-2xl w-8 text-center ${rankTextClass}">${rank}</span>
        <div class="flex-1 ml-4">
          <p class="${nameClass} text-lg sm:text-xl">${player.username || 'Usuario'}</p>
          <p class="text-xs sm:text-sm ${statsClass}">
            ${getTranslation('ranking', 'wins')} ${player.matches_won || 0} | 
            ${getTranslation('ranking', 'losses')} ${player.matches_lost || 0}
          </p>
        </div>
        <span class="font-bold text-xl sm:text-2xl ${pointsClass}">
          ${player.points || Math.round((player.win_rate || 0) * 100)} ${getTranslation('ranking', 'pointsAbbreviation')}
        </span>
      </div>
    `;
  }).join('');

  rankingContent.innerHTML = rankingHtml;

  // Actualizar posición del usuario
  if (userRankDisplay) {
    const rankText = currentUserRank 
      ? `#${currentUserRank}`
      : getTranslation('ranking', 'unranked');
    userRankDisplay.innerHTML = `
      ${getTranslation('ranking', 'yourCurrentPosition')}: 
      <span class="text-[#ffd60a] font-bold">${rankText}</span>
    `;
  }
}

// Hacer la función changeGameMode accesible globalmente
(window as any).changeGameMode = changeGameMode;
=======
  const rankingHtml = `
    <main class="flex-grow w-full p-4 sm:p-8 mt-24 sm:mt-32 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-4xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 text-center drop-shadow-md leading-tight"
            data-i18n="ranking.globalRankingTitle">${getTranslation('ranking', 'globalRankingTitle')}</h2>

        <div class="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          <div class="flex items-center p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] shadow-lg border border-[#ffd60a] transform hover:scale-[1.02] transition-transform duration-200">
            <span class="font-bold text-xl sm:text-2xl w-8 text-center drop-shadow-sm">1</span>
            <div class="flex-1 ml-4">
              <p class="font-bold text-lg sm:text-xl">JugadorElite</p>
              <p class="text-xs sm:text-sm opacity-90 ranking-player-stats" data-wins="150" data-losses="10">${getTranslation('ranking', 'wins')} 150 | ${getTranslation('ranking', 'losses')} 10</p>
            </div>
            <span class="font-extrabold text-xl sm:text-2xl drop-shadow-sm ranking-player-points" data-points="2500">2500 ${getTranslation('ranking', 'pointsAbbreviation')}</span>
          </div>

          <div class="flex items-center p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#003566] to-[#001d3d] text-gray-100 shadow-md border border-[#002850] transform hover:scale-[1.01] transition-transform duration-200">
            <span class="font-bold text-lg sm:text-xl w-8 text-center">2</span>
            <div class="flex-1 ml-4">
              <p class="font-semibold text-lg sm:text-xl">MaestroPong</p>
              <p class="text-xs sm:text-sm text-gray-300 ranking-player-stats" data-wins="145" data-losses="12">${getTranslation('ranking', 'wins')} 145 | ${getTranslation('ranking', 'losses')} 12</p>
            </div>
            <span class="font-bold text-xl sm:text-2xl text-[#ffd60a] ranking-player-points" data-points="2450">2450 ${getTranslation('ranking', 'pointsAbbreviation')}</span>
          </div>

          <div class="flex items-center p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#003566] to-[#001d3d] text-gray-100 shadow-md border border-[#002850] transform hover:scale-[1.01] transition-transform duration-200">
            <span class="font-bold text-lg sm:text-xl w-8 text-center">3</span>
            <div class="flex-1 ml-4">
              <p class="font-semibold text-lg sm:text-xl">ProGamerXD</p>
              <p class="text-xs sm:text-sm text-gray-300 ranking-player-stats" data-wins="130" data-losses="15">${getTranslation('ranking', 'wins')} 130 | ${getTranslation('ranking', 'losses')} 15</p>
            </div>
            <span class="font-bold text-xl sm:text-2xl text-[#ffd60a] ranking-player-points" data-points="2300">2300 ${getTranslation('ranking', 'pointsAbbreviation')}</span>
          </div>

          ${Array.from({ length: 7 }, (_, i) => {
            const rank = i + 4;
            const playerName = ["Campeon_Z", "UltraPlayer", "NewGenius", "QuickSilver", "MasterChef", "AcePlayer", "GameChanger"][i];
            const wins = 125 - (i * 5); // Example: decreasing wins
            const losses = 18 + (i * 3); // Example: increasing losses
            const points = 2250 - (i * 50); // Example: decreasing points
            return `
              <div class="flex items-center p-3 sm:p-4 rounded-xl bg-[#001d3d] text-gray-100 shadow-sm border border-[#002850] transform hover:scale-[1.005] transition-transform duration-200">
                <span class="font-bold text-lg sm:text-xl w-8 text-center text-gray-400">${rank}</span>
                <div class="flex-1 ml-4">
                  <p class="font-medium text-lg sm:text-xl">${playerName}</p>
                  <p class="text-xs sm:text-sm text-gray-400 ranking-player-stats" data-wins="${wins}" data-losses="${losses}">${getTranslation('ranking', 'wins')} ${wins} | ${getTranslation('ranking', 'losses')} ${losses}</p>
                </div>
                <span class="font-bold text-xl sm:text-2xl text-[#ffc300] ranking-player-points" data-points="${points}">${points} ${getTranslation('ranking', 'pointsAbbreviation')}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mt-6 sm:mt-8 text-center">
          <p class="text-lg sm:text-xl font-semibold text-gray-200 mb-4"
             data-i18n="ranking.yourCurrentPosition"><span class="text-[#ffd60a] font-bold">#123</span></p>
          <button
            id="find-my-rank-button"
            class="bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-2 sm:py-3 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="ranking.viewMyPositionButton"
          >
            ${getTranslation('ranking', 'viewMyPositionButton')}
          </button>
        </div>
      </div>
    </main>
    <style>
        /* Custom Scrollbar for Ranking List */
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
            background: #001d3d; /* Darker track */
            border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #003566; /* Match border color */
            border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #004b80; /* Slightly lighter on hover */
        }

        .animate__animated.animate__fadeIn {
            animation-duration: 0.5s;
        }

        /* Custom Shadow for Hover Effect (deeper glow) */
        .hover\\:shadow-custom-deep:hover {
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3); /* Deeper, yellowish glow */
        }
    </style>
  `;
  const appRoot = document.getElementById('app-root') as HTMLElement;
  if (appRoot) {
    // Busca el elemento <main> existente para actualizar solo el contenido principal
    let mainContent = appRoot.querySelector('main');
    if (mainContent) {
        // Si ya existe un elemento <main>, reemplaza su contenido
        mainContent.outerHTML = rankingHtml;
    } else {
        // Si no existe, añade el HTML de clasificación al final del appRoot
        appRoot.insertAdjacentHTML('beforeend', rankingHtml);
    }

    // Aplica las traducciones después de que el HTML se haya insertado en el DOM
    applyTranslations();

    // Event listener para el cambio de idioma
    window.removeEventListener('languageChange', applyTranslations); // Evita duplicados
    window.addEventListener('languageChange', applyTranslations);

    // Event listener for "Ver mi posición" button
    const findMyRankButton = document.getElementById('find-my-rank-button');
    if (findMyRankButton) {
      findMyRankButton.addEventListener('click', () => {
        console.log('Finding user\'s rank...');
        // Implement logic to find and highlight the user's rank, or navigate
        // Example: navigateTo('/profile?highlightRank=true');
      });
    }
  } else {
    console.error('Element with id "app-root" not found for rendering the ranking page.');
  }
}
>>>>>>> main
