// src/pages/play.ts

// Importa la función navigateTo desde el router
import { navigateTo } from '../router';
// Importa la función renderPongPage desde el módulo del juego Pong
import { renderPongPage } from './pong/index';
// Importa el MOBILE_BREAKPOINT para detectar dispositivos móviles
import { MOBILE_BREAKPOINT } from './pong/constants';
// Importa las funciones de internacionalización (solo necesitamos getTranslation para el contenido de la página)
import { getTranslation } from '../i18n';

/**
 * Checks if the current window width is considered a mobile dimension.
 * @returns {boolean} True if it's a mobile dimension, false otherwise.
 */
function isMobileDevice(): boolean {
    return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Applies current translations to elements with data-i18n attributes.
 */
function applyTranslations(): void {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const [component, textKey] = key.split('.');
            if (component && textKey) {
                // Check if it's a special case like the tournament button's coming soon span
                if (element.tagName === 'SPAN' && element.classList.contains('text-sm')) {
                    element.textContent = getTranslation(component, textKey);
                } else {
                    element.textContent = getTranslation(component, textKey);
                }
            }
        }
    });
}

/**
 * Renders the main play page with game mode selections.
 */
export function renderPlay(): void {
  const playHtml = `
    <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.chooseModeTitle">${getTranslation('play', 'chooseModeTitle')}</h2>
        <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.chooseModeDescription">${getTranslation('play', 'chooseModeDescription')}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <button
            id="play-ia-button"
            class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="play.vsAIButton"
          >
            ${getTranslation('play', 'vsAIButton')}
          </button>

          <button
            id="play-1v1-button"
            class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="play.oneVsOneButton"
          >
            ${getTranslation('play', 'oneVsOneButton')}
          </button>

          <button
            id="play-2v2-button"
            class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="play.twoVsTwoButton"
          >
            ${getTranslation('play', 'twoVsTwoButton')}
          </button>

          <button
            id="play-1v2-button"
            class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="play.oneVsTwoButton"
          >
            ${getTranslation('play', 'oneVsTwoButton')}
          </button>

          <button
            id="play-2v1-button"
            class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
            data-i18n="play.twoVsOneButton"
          >
            ${getTranslation('play', 'twoVsOneButton')}
          </button>

          <button
            id="play-tournament-button"
            class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
            data-i18n="play.tournamentButton"
          >
            ${getTranslation('play', 'tournamentButton')} <span class="text-sm font-normal" data-i18n="play.comingSoon">${getTranslation('play', 'comingSoon')}</span>
          </button>
        </div>
    </div>
    <style>
        .animate__animated.animate__fadeIn {
            animation-duration: 0.5s;
        }

        /* Custom Shadow for Hover Effect (deeper glow) */
        .hover\\:shadow-custom-deep:hover {
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3); /* Deeper, yellowish glow */
        }
    </style>
  `;

  // Asumimos que el "app-root" contendrá la estructura principal (ej. header + main)
  // y que el contenido específico de cada página se inyectará en un elemento con id "page-content"
  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (pageContent) {
    pageContent.innerHTML = playHtml;

    // Game mode button event listeners
    document.getElementById('play-ia-button')?.addEventListener('click', renderAIOptions);
    document.getElementById('play-1v1-button')?.addEventListener('click', render1v1Options);
    document.getElementById('play-1v2-button')?.addEventListener('click', render1v2Options);
    document.getElementById('play-2v1-button')?.addEventListener('click', render2v1Options);
    document.getElementById('play-2v2-button')?.addEventListener('click', render2v2Options);

    const playTournamentButton = document.getElementById('play-tournament-button');
    if (playTournamentButton) {
      playTournamentButton.addEventListener('click', () => {
        showCustomMessage(getTranslation('play', 'tournamentComingSoonMessage'));
      });
    }

    // Apply translations after rendering HTML
    applyTranslations();
  } else {
    console.error('Elemento con id "page-content" no encontrado para renderizar la página de juego.');
  }
}

/**
 * Renders the options for 1 vs 1 mode (Local or Online).
 */
function render1v1Options(): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const mobileDisabledClass = isMobileDevice() ? 'opacity-50 cursor-not-allowed' : '';
    const mobileDisabledAttr = isMobileDevice() ? 'disabled' : '';
    // Use getTranslation for mobile specific text
    const mobileLocalText = isMobileDevice() ? getTranslation('play', 'localOnlyDesktop') : '';

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play1v1Title">${getTranslation('play', 'play1v1Title')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play1v1Description">${getTranslation('play', 'play1v1Description')}</p>

        <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                id="play-1v1-local-button"
                class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                ${mobileDisabledAttr}
                data-i18n="play.localOption1v1"
            >
                ${getTranslation('play', 'localOption1v1')}
            </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-1v1-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation('play', 'onlineOption')}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation('play', 'backToModes')}
            </button>
        </div>
    `;
    pageContent.innerHTML = optionsHtml;

    document.getElementById('play-1v1-local-button')?.addEventListener('click', () => {
        renderPongPage('1v1_local'); // Pasa el gameMode '1v1_local'
    });

    document.getElementById('play-1v1-online-button')?.addEventListener('click', () => {
        renderOnlineMatchmaking('1v1_online');
    });

    document.getElementById('back-to-play-modes-button')?.addEventListener('click', renderPlay);

    applyTranslations(); // Apply translations to newly rendered content
}

/**
 * Renders the options for 1 vs 2 mode (Local or Online).
 */
function render1v2Options(): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const mobileDisabledClass = isMobileDevice() ? 'opacity-50 cursor-not-allowed' : '';
    const mobileDisabledAttr = isMobileDevice() ? 'disabled' : '';
    const mobileLocalText = isMobileDevice() ? getTranslation('play', 'localOnlyDesktop') : '';

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play1v2Title">${getTranslation('play', 'play1v2Title')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play1v2Description">${getTranslation('play', 'play1v2Description')}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-1v2-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption1v2"
                >
                    ${getTranslation('play', 'localOption1v2')}
                </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-1v2-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation('play', 'onlineOption')}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation('play', 'backToModes')}
            </button>
        </div>
    `;
    pageContent.innerHTML = optionsHtml;

    document.getElementById('play-1v2-local-button')?.addEventListener('click', () => {
        renderPongPage('1v2_local');
    });

    document.getElementById('play-1v2-online-button')?.addEventListener('click', () => {
        renderOnlineMatchmaking('1v2_online');
    });

    document.getElementById('back-to-play-modes-button')?.addEventListener('click', renderPlay);

    applyTranslations();
}

/**
 * Renders the options for 2 vs 1 mode (Local or Online).
 */
function render2v1Options(): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const mobileDisabledClass = isMobileDevice() ? 'opacity-50 cursor-not-allowed' : '';
    const mobileDisabledAttr = isMobileDevice() ? 'disabled' : '';
    const mobileLocalText = isMobileDevice() ? getTranslation('play', 'localOnlyDesktop') : ''; // Same text for 1v2 and 2v1 local if only one player controls multiple paddles. Adjust if different.

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play2v1Title">${getTranslation('play', 'play2v1Title')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play2v1Description">${getTranslation('play', 'play2v1Description')}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-2v1-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption2v1"
                >
                    ${getTranslation('play', 'localOption2v1')}
                </button>
                    ${mobileLocalText}
                </button>

                <button
                    id="play-2v1-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation('play', 'onlineOption')}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation('play', 'backToModes')}
            </button>
        </div>
    `;
    pageContent.innerHTML = optionsHtml;

    document.getElementById('play-2v1-local-button')?.addEventListener('click', () => {
        renderPongPage('2v1_local');
    });

    document.getElementById('play-2v1-online-button')?.addEventListener('click', () => {
        renderOnlineMatchmaking('2v1_online');
    });

    document.getElementById('back-to-play-modes-button')?.addEventListener('click', renderPlay);

    applyTranslations();
}

/**
 * Renders the options for 2 vs 2 mode (Local or Online).
 */
function render2v2Options(): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const mobileDisabledClass = isMobileDevice() ? 'opacity-50 cursor-not-allowed' : '';
    const mobileDisabledAttr = isMobileDevice() ? 'disabled' : '';
    // Assuming mobileLocalText is meant to be appended to the local button's translation
    const mobileLocalText = isMobileDevice() ? ` (${getTranslation('play', 'localOnlyDesktop')})` : '';

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.play2v2Title">${getTranslation('play', 'play2v2Title')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.play2v2Description">${getTranslation('play', 'play2v2Description')}</p>

            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="play-2v2-local-button"
                    class="group bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 ${mobileDisabledClass}"
                    ${mobileDisabledAttr}
                    data-i18n="play.localOption2v2"
                >
                    ${getTranslation('play', 'localOption2v2')}${mobileLocalText}
                </button>
                <button
                    id="play-2v2-online-button"
                    class="group bg-[#001d3d] text-gray-100 py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:bg-[#003566] hover:text-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.onlineOption"
                >
                    ${getTranslation('play', 'onlineOption')}
                </button>
            </div>

            <button
                id="back-to-play-modes-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation('play', 'backToModes')}
            </button>
        </div>
    `;
    pageContent.innerHTML = optionsHtml;

    document.getElementById('play-2v2-local-button')?.addEventListener('click', () => {
        renderPongPage('2v2_local');
    });

    document.getElementById('play-2v2-online-button')?.addEventListener('click', () => {
        renderOnlineMatchmaking('2v2_online');
    });

    document.getElementById('back-to-play-modes-button')?.addEventListener('click', renderPlay);

    applyTranslations();
}

/**
 * Renders the AI difficulty options.
 */
function renderAIOptions(): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.selectAIDifficultyTitle">${getTranslation('play', 'selectAIDifficultyTitle')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-8" data-i18n="play.selectAIDifficultyDescription">${getTranslation('play', 'selectAIDifficultyDescription')}</p>
            
            <div class="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                <button
                    id="ai-easy-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiEasy"
                >
                    ${getTranslation('play', 'aiEasy')}
                </button>

                <button
                    id="ai-medium-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiNormal"
                >
                    ${getTranslation('play', 'aiNormal')}
                </button>

                <button
                    id="ai-hard-button"
                    class="group bg-gradient-to-r from-[#ffd60a] to-[#ffc300] text-[#000814] py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl hover:from-[#ffc300] hover:to-[#ffd60a] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffd60a] focus:ring-opacity-75"
                    data-i18n="play.aiHard"
                >
                    ${getTranslation('play', 'aiHard')}
                </button>
            </div>

            <button 
                id="back-to-play-modes-from-ai-button"
                class="mt-4 bg-[#003566] text-gray-100 py-3 px-6 rounded-lg font-semibold hover:bg-[#001d3d] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95"
                data-i18n="play.backToModes"
            >
                ${getTranslation('play', 'backToModes')}
            </button>
        </div>
    `;

    pageContent.innerHTML = optionsHtml;

    document.getElementById('ai-easy-button')?.addEventListener('click', () => {
        renderPongPage('vs_ai', 'EASY');
    });
    document.getElementById('ai-medium-button')?.addEventListener('click', () => {
        renderPongPage('vs_ai', 'MEDIUM');
    });
    document.getElementById('ai-hard-button')?.addEventListener('click', () => {
        renderPongPage('vs_ai', 'HARD');
    });

    document.getElementById('back-to-play-modes-from-ai-button')?.addEventListener('click', renderPlay);

    applyTranslations();
}

/**
 * Renders the online matchmaking page.
 * @param gameMode The selected online game mode.
 */
function renderOnlineMatchmaking(gameMode: string): void {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('Page content area not found!');
        return;
    }

    const optionsHtml = `
        <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl text-center transition-all duration-500 ease-in-out">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 drop-shadow-md leading-tight" data-i18n="play.searchingMatchTitle">${getTranslation('play', 'searchingMatchTitle')}</h2>
            <p class="text-base sm:text-lg text-gray-300 mb-6" data-i18n="play.searchingMatchDescription">
                ${getTranslation('play', 'searchingMatchDescriptionPrefix')} ${gameMode.replace('_', ' ')}...
                <br>
                ${getTranslation('play', 'pleaseWaitMessage')}
            </p>
            <div class="loader ease-linear rounded-full border-8 border-t-8 border-[#ffd60a] h-24 w-24 mb-6 mx-auto"></div>
            <button
                id="cancel-matchmaking-button"
                class="bg-[#ffc300] text-[#000814] py-3 px-6 rounded-lg font-semibold hover:bg-[#ffd60a] transition-colors duration-300 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
                data-i18n="play.cancelSearchButton"
            >
                ${getTranslation('play', 'cancelSearchButton')}
            </button>
        </div>
        <style>
            .loader {
                border-top-color: #ffc300; /* Primary yellow for animation */
                -webkit-animation: spinner 1.5s linear infinite;
                animation: spinner 1.5s linear infinite;
            }
            @-webkit-keyframes spinner {
                0% { -webkit-transform: rotate(0deg); }
                100% { -webkit-transform: rotate(360deg); }
            }
            @keyframes spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            /* Custom Modal Styles (re-using and adapting from previous sections for consistency) */
            .custom-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 8, 20, 0.8); /* Using primary color with opacity */
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .custom-modal-content {
                background: #001d3d; /* Secondary blue */
                color: #e0e0e0; /* Light gray for text */
                padding: 2rem;
                border-radius: 1.5rem; /* rounded-3xl */
                border: 1px solid #003566; /* Accent blue border */
                box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2), 0 0 30px rgba(0, 53, 102, 0.5); /* Deep blue glow */
            }
            .custom-modal-buttons {
                display: flex;
                justify-content: flex-end; /* Align buttons to the right */
                gap: 1rem; /* Space between buttons */
                margin-top: 1.5rem;
            }
            .custom-modal-button {
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .custom-modal-button.confirm {
                background-color: #ffc300;
                color: #000814;
            }
            .custom-modal-button.confirm:hover {
                background-color: #ffd60a;
                transform: scale(1.05);
            }
            .custom-modal-button.cancel {
                background-color: #003566;
                color: #e0e0e0;
            }
            .custom-modal-button.cancel:hover {
                background-color: #001d3d;
                transform: scale(1.05);
            }
        </style>
    `;
    pageContent.innerHTML = optionsHtml;

    document.getElementById('cancel-matchmaking-button')?.addEventListener('click', showCancelConfirmation);

    // Simulate matchmaking success (for demonstration)
    // In a real app, this would be triggered by a WebSocket message from the server
    setTimeout(() => {
         // showCustomMessage(`¡Partida encontrada para ${gameMode.replace('_', ' ')}! Iniciando juego...`);
         // setTimeout(() => renderPongPage(gameMode as any), 1500); // Simulate game start after message
         console.log(`Simulando matchmaking para ${gameMode}. No se inicia el juego automáticamente.`);
    }, 8000); // Increased delay for a more realistic "waiting" feel

    applyTranslations(); // Apply translations to newly rendered content
}

/**
 * Displays a custom message in a modal-like pop-up.
 * @param message The message to display.
 */
function showCustomMessage(message: string): void {
    const modalHtml = `
        <div id="custom-message-modal" class="custom-modal-overlay">
            <div class="custom-modal-content">
                <h3 class="text-2xl font-bold text-[#ffc300] mb-4" data-i18n="common.infoTitle">${getTranslation('common', 'infoTitle')}</h3>
                <p class="text-base text-gray-300 mb-6">${message}</p>
                <div class="custom-modal-buttons">
                    <button id="close-message-button" class="custom-modal-button cancel" data-i18n="common.okButton">${getTranslation('common', 'okButton')}</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-message-button')?.addEventListener('click', () => {
        document.getElementById('custom-message-modal')?.remove();
    });
    applyTranslations(); // Apply translations to modal content
}

/**
 * Displays a confirmation modal for cancelling matchmaking.
 */
function showCancelConfirmation(): void {
    const modalHtml = `
        <div id="cancel-confirmation-modal" class="custom-modal-overlay">
            <div class="custom-modal-content">
                <h3 class="text-2xl font-bold text-[#ffc300] mb-4" data-i18n="play.cancelSearchConfirmationTitle">${getTranslation('play', 'cancelSearchConfirmationTitle')}</h3>
                <p class="text-base text-gray-300 mb-6" data-i18n="play.cancelSearchConfirmationDescription">${getTranslation('play', 'cancelSearchConfirmationDescription')}</p>
                <div class="custom-modal-buttons">
                    <button id="cancel-yes-button" class="custom-modal-button confirm" data-i18n="play.yesCancelButton">${getTranslation('play', 'yesCancelButton')}</button>
                    <button id="cancel-no-button" class="custom-modal-button cancel" data-i18n="play.noStayButton">${getTranslation('play', 'noStayButton')}</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('cancel-yes-button')?.addEventListener('click', () => {
        document.getElementById('cancel-confirmation-modal')?.remove();
        renderPlay(); // Go back to the main play page
    });

    document.getElementById('cancel-no-button')?.addEventListener('click', () => {
        document.getElementById('cancel-confirmation-modal')?.remove();
    });
    applyTranslations(); // Apply translations to modal content
}