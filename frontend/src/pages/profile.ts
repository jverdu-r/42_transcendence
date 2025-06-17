// src/pages/profile.ts

import { navigateTo } from '../router';
// Importa las funciones de internacionalización
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n';

export function renderProfilePage(): void {
  // Quita el listener de languageChange antes de añadir uno nuevo para evitar duplicados
  window.removeEventListener('languageChange', renderProfilePage);

  const lang = getCurrentLanguage(); // Obtiene el idioma actual para la bandera inicial

  const profileHtml = `
    <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
      <div class="w-full max-w-2xl rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex flex-col items-center text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <div class="relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden mb-4
                    bg-[#001d3d] border-4 border-[#ffc300] shadow-xl ring-4 ring-[#000814] ring-inset
                    transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-custom-avatar">
          <div class="absolute inset-2 rounded-full bg-[#000814] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-20 w-20 text-[#ffc300]">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
              <path d="M11 6h2v12h-2zm-5 4h2v4H6zm10 0h2v4h-2z"/>
            </svg>
            </div>
          </div>
        <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-4 sm:mb-6 drop-shadow-md leading-tight" data-i18n="profile.username">${getTranslation('profile', 'username')}</h2>
        <button
          id="edit-profile-button"
          class="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-2 sm:py-3 px-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
          data-i18n="profile.editProfileButton"
        >
          ${getTranslation('profile', 'editProfileButton')}
        </button>
      </div>

      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h3 class="text-2xl sm:text-3xl font-display font-extrabold text-[#ffc300] mb-4 sm:mb-6 text-center drop-shadow-md leading-tight" data-i18n="profile.gameStatsTitle">${getTranslation('profile', 'gameStatsTitle')}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.matchesPlayed">${getTranslation('profile', 'matchesPlayed')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffc300]">120</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.wins">${getTranslation('profile', 'wins')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffd60a]">85</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.losses">${getTranslation('profile', 'losses')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-300">35</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.winRate">${getTranslation('profile', 'winRate')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffc300]">70.8%</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.totalPoints">${getTranslation('profile', 'totalPoints')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffd60a]">15400</p>
          </div>
          <div class="bg-[#003566] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#ffc300]">
            <p class="text-sm sm:text-base text-gray-200 mb-1" data-i18n="profile.globalRanking">${getTranslation('profile', 'globalRanking')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-white">#123</p>
          </div>
        </div>
      </div>

      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h3 class="text-2xl sm:text-3xl font-display font-extrabold text-[#ffc300] mb-4 sm:mb-6 text-center drop-shadow-md leading-tight" data-i18n="profile.matchHistoryTitle">${getTranslation('profile', 'matchHistoryTitle')}</h3>
        <div class="space-y-4 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
          <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
            <div>
              <p class="font-semibold text-gray-100 text-base sm:text-lg" data-i18n="profile.opponentX">${getTranslation('profile', 'opponentX')}</p>
              <p class="text-sm sm:text-base text-gray-400">${getTranslation('profile', 'victory')} - 3/2 - ${getTranslation('profile', '1dayAgo')}</p>
            </div>
            <span class="text-lg sm:text-xl font-bold text-[#ffd60a]">+15 pts</span>
          </div>
          <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
            <div>
              <p class="font-semibold text-gray-100 text-base sm:text-lg" data-i18n="profile.opponentY">${getTranslation('profile', 'opponentY')}</p>
              <p class="text-sm sm:text-base text-gray-400">${getTranslation('profile', 'defeat')} - 1/3 - ${getTranslation('profile', '3daysAgo')}</p>
            </div>
            <span class="text-lg sm:text-xl font-bold text-gray-400">-10 pts</span>
          </div>
          <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
            <div>
              <p class="font-semibold text-gray-100 text-base sm:text-lg" data-i18n="profile.opponentZ">${getTranslation('profile', 'opponentZ')}</p>
              <p class="text-sm sm:text-base text-gray-400">${getTranslation('profile', 'victory')} - 3/0 - ${getTranslation('profile', '1weekAgo')}</p>
            </div>
            <span class="text-lg sm:text-xl font-bold text-[#ffd60a]">+20 pts</span>
          </div>
          <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
            <div>
              <p class="font-semibold text-gray-100 text-base sm:text-lg" data-i18n="profile.opponentNew">${getTranslation('profile', 'opponentNew')}</p>
              <p class="text-sm sm:text-base text-gray-400">${getTranslation('profile', 'victory')} - 3/1 - ${getTranslation('profile', '2weeksAgo')}</p>
            </div>
            <span class="text-lg sm:text-xl font-bold text-[#ffd60a]">+18 pts</span>
          </div>
          <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
            <div>
              <p class="font-semibold text-gray-100 text-base sm:text-lg" data-i18n="profile.opponentPro">${getTranslation('profile', 'opponentPro')}</p>
              <p class="text-sm sm:text-base text-gray-400">${getTranslation('profile', 'defeat')} - 0/3 - ${getTranslation('profile', '3weeksAgo')}</p>
            </div>
            <span class="text-lg sm:text-xl font-bold text-gray-400">-12 pts</span>
          </div>
        </div>
        </div>
    </main>
    <style>
        /* Custom Scrollbar for Match History */
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

        /* Custom Shadow for Avatar Hover Effect */
        .hover\\:shadow-custom-avatar:hover {
            box-shadow: 0 0 20px rgba(255, 195, 0, 0.7), 0 0 40px rgba(255, 214, 10, 0.5); /* Glowing yellow effect */
        }
    </style>
  `;
  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (pageContent) {
    pageContent.innerHTML = profileHtml;

    // Apply translations to all elements with data-i18n attributes
    applyTranslations();

    // Event listener for "Edit Profile" button
    const editProfileButton = document.getElementById('edit-profile-button');
    if (editProfileButton) {
      editProfileButton.addEventListener('click', () => {
        navigateTo('/settings'); // Navigate to settings page
      });
    }

    // El event listener para "Edit Avatar" button ha sido eliminado
  } else {
    console.error('Element with id "page-content" no encontrado para renderizar la página de perfil.');
  }
}

// Función auxiliar para aplicar traducciones a todos los elementos con `data-i18n`
function applyTranslations(): void {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const [component, textKey] = key.split('.');
            const translatedText = getTranslation(component, textKey);
            // Only update textContent if it's not already set by direct getTranslation in the HTML string
            // This prevents redundant updates and ensures the initial render is correct.
            // Also handles placeholder for input elements if any were added with data-i18n
            if (element.tagName === 'INPUT') {
                const inputElement = element as HTMLInputElement;
                if (inputElement.placeholder !== undefined) {
                    inputElement.placeholder = translatedText;
                }
            } else if (element.textContent !== translatedText) {
                element.textContent = translatedText;
            }
        }
    });
}