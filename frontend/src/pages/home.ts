// src/pages/home.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

export function renderHomePage(): void {
    const homeHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-12 text-gray-100 animate__animated animate__fadeIn">
          <!-- Hero Section -->
          <div class="max-w-4xl w-full text-center animate__animated animate__fadeInUp">
              <div class="rounded-2xl p-8 sm:p-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-filter backdrop-blur-sm border border-slate-600/30 shadow-lg">
                  <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 leading-tight">
                      Transcendence
                  </h1>
                  <p class="text-xl sm:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                      ${getTranslation('home', 'welcomeSubtitle')}
                  </p>
                  <div class="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                      <button id="play-button"
                          class="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                      >
                          🎮 ${getTranslation('home', 'playNowButton')}
                      </button>
                      <button id="tournaments-button"
                          class="bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 text-slate-200 hover:text-white py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                      >
                          🏆 ${getTranslation('home', 'viewTournamentsButton')}
                      </button>
                  </div>
              </div>
          </div>

          <!-- Features Grid -->
          <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate__animated animate__fadeInUp animate__delay-1s">
              <!-- Game Modes Card -->
              <div class="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-filter backdrop-blur-sm border border-slate-600/30 rounded-xl p-6 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                  <div class="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
                  <h3 class="text-xl font-semibold text-slate-200 mb-3">${getTranslation('home', 'multipleModesTitle')}</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">${getTranslation('home', 'multipleModesDescription')}</p>
              </div>

              <!-- Profile Card -->
              <a href="/profile" class="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-filter backdrop-blur-sm border border-slate-600/30 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 block">
                  <div class="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">👤</div>
                  <h3 class="text-xl font-semibold text-slate-200 mb-3">${getTranslation('home', 'yourProfileTitle')}</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">${getTranslation('home', 'yourProfileSubtitle')}</p>
              </a>

              <!-- Ranking Card -->
              <a href="/ranking" class="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-filter backdrop-blur-sm border border-slate-600/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 block">
                  <div class="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">🏆</div>
                  <h3 class="text-xl font-semibold text-slate-200 mb-3">${getTranslation('home', 'globalRankingTitle')}</h3>
                  <p class="text-slate-400 text-sm leading-relaxed">${getTranslation('home', 'globalRankingSubtitle')}</p>
              </a>
          </div>
        </main>
        <style>
            .animate__animated.animate__fadeIn {
                animation-duration: 0.6s;
            }

            .animate__animated.animate__fadeInUp {
                animation-duration: 0.8s;
            }

            .animate__animated.animate__delay-1s {
                animation-delay: 0.3s;
            }
        </style>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = homeHtml;

        // Listener para el botón "Jugar Ahora"
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/play');
            });
        }

        // Listener para el botón "Ver Torneos"
        const tournamentsButton = document.getElementById('tournaments-button');
        if (tournamentsButton) {
            tournamentsButton.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/tournaments');
            });
        }

        // Listeners para las tarjetas de perfil y ranking
        const profileCardLink = document.querySelector('a[href="/profile"]');
        if (profileCardLink) {
            profileCardLink.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/profile');
            });
        }

        const rankingCardLink = document.querySelector('a[href="/ranking"]');
        if (rankingCardLink) {
            rankingCardLink.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/ranking');
            });
        }

    } else {
        console.error(getTranslation('home', 'contentNotFound'));
    }
}