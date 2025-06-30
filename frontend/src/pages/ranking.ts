// src/pages/ranking.ts

import { navigateTo } from '../router';
import { renderNavbar } from '../components/navbar'; // Importa el componente del navbar
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n'; // Importa las funciones de i18n

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