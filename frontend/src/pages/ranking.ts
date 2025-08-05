// src/pages/ranking.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

interface RankingPlayer {
    rank: number;
    id: number;
    username: string;
    wins: number;
    losses: number;
    totalGames: number;
    elo: number;
    winRate: number;
    points: number;
}

interface UserStats {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    elo: number;
    ranking: number;
}

// Función para obtener el ranking global
async function getRankingData(): Promise<RankingPlayer[]> {
    try {
        const response = await fetch('/api/auth/ranking', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Error al obtener ranking:', response.status);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Error en la petición del ranking:', error);
        return [];
    }
}

// Función para obtener estadísticas del usuario actual
async function getUserStats(): Promise<UserStats | null> {
    const token = localStorage.getItem('jwt');
    if (!token) return null;

    try {
        const response = await fetch('/api/auth/profile/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Error al obtener estadísticas del usuario:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error en la petición de estadísticas del usuario:', error);
        return null;
    }
}

export async function renderRankingPage(): Promise<void> {
    const currentUser = getCurrentUser();
    
    // Mostrar loading inicial
    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = `
            <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
                <div class="max-w-4xl w-full">
                    <div class="text-center mb-12">
                        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                            ${getTranslation('ranking', 'globalRankingTitle')}
                        </h1>
                        <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                            Cargando ranking...
                        </p>
                    </div>
                </div>
            </main>
        `;
    }

    // Obtener datos del ranking y estadísticas del usuario
    const [rankingData, userStats] = await Promise.all([
        getRankingData(),
        getUserStats()
    ]);

    // Función para obtener el color del badge según el ranking
    function getRankBadgeColor(rank: number): string {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
            case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
            case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600';
            default: return 'bg-[#003566]';
        }
    }

    // Función para obtener el icono según el ranking
    function getRankIcon(rank: number): string {
        switch (rank) {
            case 1: return '👑';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    }

    // Encontrar al usuario actual en el ranking
    const currentUserInRanking = rankingData.find(player => 
        currentUser && player.username === currentUser.username
    );

    const rankingHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-4xl w-full">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                        ${getTranslation('ranking', 'globalRankingTitle')}
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                        ${getTranslation('ranking', 'bestPlayers')}
                    </p>
                </div>

                ${currentUser && userStats ? `
                <!-- User's Position Highlight -->
                <div class="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-3xl p-1 mb-8">
                    <div class="bg-[#000814] rounded-3xl p-6">
                        <h2 class="text-xl font-bold text-[#ffc300] mb-4 text-center">
                            ${getTranslation('ranking', 'yourCurrentPosition')}
                        </h2>
                        <div class="flex items-center justify-between bg-[#001d3d] rounded-xl p-4 border border-[#003566]">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-full flex items-center justify-center text-[#000814] font-bold text-lg">
                                    #${userStats.ranking}
                                </div>
                                <div>
                                    <div class="font-bold text-lg">${currentUser.username}</div>
                                    <div class="text-sm text-gray-300">${getTranslation('ranking', 'wins')} ${userStats.wins} | ${getTranslation('ranking', 'losses')} ${userStats.losses}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold text-[#ffc300]">${userStats.elo.toLocaleString()}</div>
                                <div class="text-sm text-gray-300">${getTranslation('ranking', 'pointsAbbreviation')}</div>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Global Ranking Table -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                    <div class="space-y-3">
                        ${rankingData.length > 0 ? rankingData.map(player => {
                            const isCurrentUser = currentUser && player.username === currentUser.username;
                            const bgColor = isCurrentUser ? 'bg-gradient-to-r from-[#ffc300]/20 to-[#ffd60a]/20 border-[#ffc300]' : 'bg-[#001d3d] border-[#003566]';
                            const textColor = isCurrentUser ? 'text-[#ffc300]' : 'text-gray-100';
                            
                            return `
                                <div class="flex items-center justify-between p-4 ${bgColor} rounded-xl border hover:bg-opacity-70 transition-all duration-200">
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 ${player.rank <= 3 ? getRankBadgeColor(player.rank) : 'bg-[#003566]'} rounded-full flex items-center justify-center font-bold text-sm">
                                            ${player.rank <= 3 ? getRankIcon(player.rank) : `#${player.rank}`}
                                        </div>
                                        <div>
                                            <div class="font-bold ${textColor}">${player.username}</div>
                                            <div class="text-sm text-gray-300">${getTranslation('ranking', 'wins')} ${player.wins} | ${getTranslation('ranking', 'losses')} ${player.losses}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-xl font-bold ${isCurrentUser ? 'text-[#ffc300]' : 'text-[#ffd60a]'}">${player.points.toLocaleString()}</div>
                                        <div class="text-sm text-gray-300">${getTranslation('ranking', 'pointsAbbreviation')}</div>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div class="text-center p-8 text-gray-400">
                                <div class="text-xl mb-2">🏆</div>
                                <div class="text-lg">No hay datos de ranking disponibles</div>
                                <div class="text-sm mt-2">¡Todavía nadie ha jugado partidas, anímate y se el primero!</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </main>
        <style>
            .hover\\:bg-opacity-70:hover {
                background-opacity: 0.7;
            }
        </style>
    `;

    if (pageContent) {
        pageContent.innerHTML = rankingHtml;
    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de ranking.');
    }
}
