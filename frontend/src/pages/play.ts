// src/pages/play.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

export function renderPlay(): void {
    const playHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-4xl w-full">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                        ${getTranslation('play', 'selectGameMode')}
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                        ${getTranslation('play', 'chooseModeDescription')}
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- 1v1 Classic -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.02] transition-all duration-500 cursor-pointer game-mode-card" data-mode="1v1">
                        <div class="text-center">
                            <div class="w-16 h-16 mx-auto mb-4 bg-[#ffc300] rounded-full flex items-center justify-center">
                                <span class="text-[#000814] font-bold text-2xl">1v1</span>
                            </div>
                            <h3 class="text-2xl font-display font-bold text-[#ffc300] mb-3">
                                ${getTranslation('play', 'oneVsOne')}
                            </h3>
                            <p class="text-gray-300 mb-6">
                                ${getTranslation('play', 'oneVsOneDescription')}
                            </p>
                            <button class="w-full py-3 rounded-xl bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold text-lg hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 transform hover:scale-105">
                                ${getTranslation('play', 'vsAIButton')}
                            </button>
                        </div>
                    </div>

                    <!-- Tournament -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.02] transition-all duration-500 cursor-not-allowed game-mode-card opacity-60" data-mode="tournament">
                        <div class="text-center">
                            <div class="w-16 h-16 mx-auto mb-4 bg-gray-500 rounded-full flex items-center justify-center">
                                <span class="text-white font-bold text-xl">🏆</span>
                            </div>
                            <h3 class="text-2xl font-display font-bold text-gray-400 mb-3">
                                ${getTranslation('play', 'tournament')}
                            </h3>
                            <p class="text-gray-400 mb-6">
                                ${getTranslation('play', 'tournamentDescription')}
                            </p>
                            <button disabled class="w-full py-3 rounded-xl bg-gray-600 text-gray-300 font-bold text-lg cursor-not-allowed">
                                ${getTranslation('play', 'comingSoon')}
                            </button>
                        </div>
                    </div>

                    <!-- Custom Game -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.02] transition-all duration-500 cursor-pointer game-mode-card" data-mode="custom">
                        <div class="text-center">
                            <div class="w-16 h-16 mx-auto mb-4 bg-[#003566] rounded-full flex items-center justify-center">
                                <span class="text-[#ffc300] font-bold text-xl">⚙️</span>
                            </div>
                            <h3 class="text-2xl font-display font-bold text-[#ffc300] mb-3">
                                ${getTranslation('play', 'customGame')}
                            </h3>
                            <p class="text-gray-300 mb-6">
                                ${getTranslation('play', 'customGameDescription')}
                            </p>
                            <button class="w-full py-3 rounded-xl border-2 border-[#ffc300] text-[#ffc300] font-bold text-lg hover:bg-[#ffc300] hover:text-[#000814] transition-all duration-300 transform hover:scale-105">
                                ${getTranslation('play', 'comingSoon')}
                            </button>
                        </div>
                    </div>

                    <!-- AI Modes -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.02] transition-all duration-500 cursor-pointer game-mode-card" data-mode="ai">
                        <div class="text-center">
                            <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <span class="text-white font-bold text-xl">🤖</span>
                            </div>
                            <h3 class="text-2xl font-display font-bold text-[#ffc300] mb-3">
                                ${getTranslation('play', 'vsAIButton')}
                            </h3>
                            <p class="text-gray-300 mb-6">
                                ${getTranslation('play', 'vsAIDescription')}
                            </p>
                            <button class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105">
                                ${getTranslation('play', 'selectDifficulty')}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Back to Home Button -->
                <div class="text-center mt-12">
                    <button id="back-to-home" class="px-8 py-3 rounded-xl border-2 border-[#003566] text-[#ffc300] font-semibold text-lg hover:bg-[#001d3d] hover:text-white transition-all duration-300 transform hover:scale-105">
                        ${getTranslation('common', 'backToHome')}
                    </button>
                </div>
            </div>
        </main>
        <style>
            /* Custom Shadow for Hover Effect */
            .hover\\:shadow-custom-deep:hover {
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.2);
            }
        </style>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = playHtml;

        // Event listeners para las tarjetas de modo de juego
        const gameModeCards = document.querySelectorAll('.game-mode-card');
        gameModeCards.forEach(card => {
            card.addEventListener('click', (event) => {
                const mode = card.getAttribute('data-mode');
                if (mode && !card.classList.contains('cursor-not-allowed')) {
                    console.log(`Game mode selected: ${mode}`);
                    
                    switch (mode) {
                        case '1v1':
                            alert(getTranslation('play', 'demoFunctionality1v1'));
                            break;
                        case 'custom':
                            alert(getTranslation('play', 'demoFunctionalityCustom'));
                            break;
                        case 'ai':
                            alert(getTranslation('play', 'demoFunctionalityAI'));
                            break;
                        default:
                            console.log('Mode not implemented');
                    }
                }
            });
        });

        // Botón para volver al inicio
        const backToHomeButton = document.getElementById('back-to-home');
        if (backToHomeButton) {
            backToHomeButton.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/home');
            });
        }

    } else {
        console.error('Element with id "page-content" not found to render play page.');
    }
}
