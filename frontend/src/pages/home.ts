// src/pages/home.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

export function renderHomePage(): void {
    const homeHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl w-full animate__animated animate__fadeInUp">
              <div
                  id="welcome-card"
                  class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep flex flex-col justify-between"
              >
                  <div>
                      <h2 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                          ${getTranslation('home', 'welcomeTitle')} <span class="text-[#ffd60a]">Transcendence</span>!
                      </h2>
                      <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                          ${getTranslation('home', 'welcomeSubtitle')}
                      </p>
                  </div>
                  <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-6 pb-6 mt-auto">
                      <button id="play-button"
                          class="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-4 px-10 rounded-xl font-bold text-xl sm:text-2xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
                      >
                          ${getTranslation('home', 'playNowButton')}
                      </button>
                      <button id="tournaments-button"
                          type="button"
                          class="border-2 border-[#003566] text-[#ffc300] py-4 px-10 rounded-xl font-semibold text-xl sm:text-2xl hover:bg-[#001d3d] hover:text-white transition-all duration-300 shadow transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#003566] focus:ring-opacity-75"
                      >
                          ${getTranslation('home', 'viewTournamentsButton')}
                      </button>
                  </div>
              </div>

              <div
                  id="live-matches-box"
                  class="rounded-3xl p-4 sm:p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex flex-col transition-all duration-500 ease-in-out hover:scale-[1.01] hover:shadow-custom-deep"
              >
                  <h3 class="text-2xl sm:text-3xl font-display font-extrabold text-[#ffc300] drop-shadow-md mb-6 text-center">
                      ${getTranslation('home', 'liveMatchesTitle')}
                  </h3>
                  <p class="text-base sm:text-lg text-gray-300 mb-6 text-center">
                      ${getTranslation('home', 'liveMatchesSubtitle')}
                  </p>
                  <div id="live-matches-container" class="flex-grow space-y-4 overflow-y-auto max-h-96 pr-2 custom-scrollbar"></div>
              </div>
          </div>

          <section class="w-full max-w-7xl mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 mx-auto animate__animated animate__fadeInUp animate__delay-1s">
              <a href="/profile" class="block rounded-3xl p-4 sm:p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.01] transition-all duration-500">
                  <h3 class="text-xl sm:text-2xl font-display font-bold text-[#ffc300] mb-3">
                      ${getTranslation('home', 'yourProfileTitle')}
                  </h3>
                  <p class="text-sm sm:text-base text-gray-300">
                      ${getTranslation('home', 'yourProfileSubtitle')}
                  </p>
              </a>
              <a href="/ranking" class="block rounded-3xl p-4 sm:p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.01] transition-all duration-500">
                  <h3 class="text-xl sm:text-2xl font-display font-bold text-[#ffc300] mb-3">
                      ${getTranslation('home', 'globalRankingTitle')}
                  </h3>
                  <p class="text-sm sm:text-base text-gray-300">
                      ${getTranslation('home', 'globalRankingSubtitle')}
                  </p>
              </a>
          </section>
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

            .animate__animated.animate__fadeInUp {
                animation-duration: 0.8s;
            }

            .animate__animated.animate__delay-1s {
                animation-delay: 0.5s; /* Adjusted delay for better flow */
            }

            /* Custom Shadow for Hover Effect (deeper glow) */
            .hover\\:shadow-custom-deep:hover {
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3); /* Deeper, yellowish glow */
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
                navigateTo('/play'); // Asumiendo que Ver Torneos también navega a la página de juego
            });
        }

        // Listeners para las tarjetas de "Tu Perfil" y "Ranking Global"
        const profileCardLink = document.querySelector('section a[href="/profile"]');
        if (profileCardLink) {
            profileCardLink.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/profile');
            });
        }

        const rankingsCardLink = document.querySelector('section a[href="/ranking"]');
        if (rankingsCardLink) {
            rankingsCardLink.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/ranking');
            });
        }

        // Event delegation para los enlaces de partidos en vivo
        document.querySelectorAll('#live-matches-box a').forEach(link => {
            link.addEventListener('click', (event) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/match/')) {
                    event.preventDefault();
                    console.log(`Navegando a partida: ${href}`);
                    // En lugar de navegar, solo mostramos información del match
                    alert(`Esta es una funcionalidad de demostración. Partida: ${href}`);
                }
            });
        renderLiveMatches();
        });

    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de inicio.');
    }
}

function renderLiveMatches(): void {
    const liveMatchesBox = document.getElementById('live-matches-box');
    if (!liveMatchesBox) return;

    // Limpiar contenido anterior si existe
    liveMatchesBox.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'flex-grow space-y-4 overflow-y-auto max-h-96 pr-2 custom-scrollbar';

    fetch('/api/auth/games/live')
        .then((res) => res.json())
        .then((games) => {
            if (!games.length) {
                container.innerHTML = `
                    <p class="text-gray-400 text-center">
                        ${getTranslation('home', 'noLiveMatches')}
                    </p>
                `;
            } else {
                for (const game of games) {
                    const html = `
                        <a href="/match/${game.id}" class="block p-4 rounded-xl bg-[#001d3d] bg-opacity-50 text-gray-100 hover:bg-opacity-70 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer group border border-[#003566]">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold text-base sm:text-lg">
                                    ${game.player1.username} <span class="text-[#ffc300]">${getTranslation('home', 'vs')}</span> ${game.player2.username}
                                </span>
                                <span class="text-xl sm:text-2xl font-bold text-[#ffd60a]">${game.score1} - ${game.score2}</span>
                            </div>
                            <p class="text-sm text-gray-400 mt-1">
                                ${getTranslation('home', 'inProgressRound')} ${game.round}
                            </p>
                        </a>
                    `;
                    container.innerHTML += html;
                }
            }
            liveMatchesBox.appendChild(container);
        })
        .catch((err) => {
            console.error('Error al obtener partidas en vivo:', err);
            container.innerHTML = `<p class="text-red-400 text-center">${getTranslation('home', 'errorLoadingMatches')}</p>`;
            liveMatchesBox.appendChild(container);
        });
}