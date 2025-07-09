// src/pages/profile.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

export function renderProfilePage(): void {
    const user = getCurrentUser();
    
    if (!user) {
        // Si no hay usuario autenticado, redirigir al login
        navigateTo('/login');
        return;
    }
    
    const profileHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-6xl w-full">
                <!-- Profile Header -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#003566] shadow-2xl mb-8">
                    <div class="flex flex-col lg:flex-row items-center gap-8">
                        <div class="w-32 h-32 rounded-full bg-gradient-to-r from-[#ffc300] to-[#ffd60a] flex items-center justify-center text-[#000814] text-4xl font-bold">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="text-center lg:text-left flex-grow">
                            <h1 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-2">
                                ${user.username}
                            </h1>
                            <p class="text-gray-300 mb-4">${user.email}</p>
                            <div class="flex flex-wrap gap-4 justify-center lg:justify-start">
                                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">
                                    Ranking: #42
                                </span>
                                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">
                                    ELO: 1,847
                                </span>
                                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">
                                    Partidas: 127
                                </span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3">
                            <button class="px-6 py-3 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold rounded-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300">
                                ${getTranslation('profile', 'editProfileButton')}
                            </button>
                            <button class="px-6 py-3 border-2 border-[#003566] text-[#ffc300] font-semibold rounded-xl hover:bg-[#001d3d] hover:text-white transition-all duration-300">
                                ${getTranslation('profile', 'uploadAvatarButton')}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Statistics -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                        <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-6">
                            ${getTranslation('profile', 'statsTitle')}
                        </h2>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl font-bold text-[#ffc300]">89</div>
                                <div class="text-sm text-gray-300">${getTranslation('profile', 'totalWins')}</div>
                            </div>
                            <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl font-bold text-red-400">38</div>
                                <div class="text-sm text-gray-300">${getTranslation('profile', 'totalLosses')}</div>
                            </div>
                            <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl font-bold text-green-400">70%</div>
                                <div class="text-sm text-gray-300">${getTranslation('profile', 'winRate')}</div>
                            </div>
                            <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl font-bold text-[#ffd60a]">1,847</div>
                                <div class="text-sm text-gray-300">${getTranslation('profile', 'eloRating')}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Match History -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                        <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-6">
                            ${getTranslation('profile', 'matchHistoryTitle')}
                        </h2>
                        <div class="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                            <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="flex items-center gap-3">
                                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span class="text-green-400 font-semibold">${getTranslation('profile', 'matchWin')}</span>
                                    <span class="text-gray-300">vs JugadorX</span>
                                </div>
                                <span class="text-[#ffc300] font-bold">3-1</span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="flex items-center gap-3">
                                    <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                                    <span class="text-red-400 font-semibold">${getTranslation('profile', 'matchLoss')}</span>
                                    <span class="text-gray-300">vs ProGamer</span>
                                </div>
                                <span class="text-[#ffc300] font-bold">1-3</span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="flex items-center gap-3">
                                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span class="text-green-400 font-semibold">${getTranslation('profile', 'matchWin')}</span>
                                    <span class="text-gray-300">vs Novato22</span>
                                </div>
                                <span class="text-[#ffc300] font-bold">3-0</span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="flex items-center gap-3">
                                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span class="text-green-400 font-semibold">${getTranslation('profile', 'matchWin')}</span>
                                    <span class="text-gray-300">vs AIMaster</span>
                                </div>
                                <span class="text-[#ffc300] font-bold">3-2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <style>
            /* Custom Scrollbar */
            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #001d3d;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #003566;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #004b80;
            }
        </style>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = profileHtml;
    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de perfil.');
    }
}
