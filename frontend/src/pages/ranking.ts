// src/pages/ranking.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

export function renderRankingPage(): void {
    const rankingData = [
        { rank: 1, username: "PongMaster", wins: 156, losses: 23, points: 2847 },
        { rank: 2, username: "SpeedBall", wins: 134, losses: 31, points: 2653 },
        { rank: 3, username: "ArcadeKing", wins: 128, losses: 36, points: 2489 },
        { rank: 4, username: "PixelPaddle", wins: 119, losses: 42, points: 2341 },
        { rank: 5, username: "RetroGamer", wins: 107, losses: 48, points: 2198 },
        { rank: 6, username: "GameMaster", wins: 98, losses: 52, points: 2076 },
        { rank: 7, username: "ClassicPlayer", wins: 89, losses: 58, points: 1954 },
        { rank: 8, username: "testuser", wins: 89, losses: 38, points: 1847 }, // Usuario actual
        { rank: 9, username: "NeonBounce", wins: 84, losses: 63, points: 1723 },
        { rank: 10, username: "DigitalPong", wins: 78, losses: 67, points: 1612 }
    ];

    const rankingHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-4xl w-full">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                        ${getTranslation('ranking', 'globalRankingTitle')}
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                        Los mejores jugadores de Transcendence
                    </p>
                </div>

                <!-- User's Position Highlight -->
                <div class="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-3xl p-1 mb-8">
                    <div class="bg-[#000814] rounded-3xl p-6">
                        <h2 class="text-xl font-bold text-[#ffc300] mb-4 text-center">
                            ${getTranslation('ranking', 'yourCurrentPosition')}
                        </h2>
                        <div class="flex items-center justify-between bg-[#001d3d] rounded-xl p-4 border border-[#003566]">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-full flex items-center justify-center text-[#000814] font-bold text-lg">
                                    #8
                                </div>
                                <div>
                                    <div class="font-bold text-lg">testuser</div>
                                    <div class="text-sm text-gray-300">${getTranslation('ranking', 'wins')} 89 | ${getTranslation('ranking', 'losses')} 38</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold text-[#ffc300]">1,847</div>
                                <div class="text-sm text-gray-300">${getTranslation('ranking', 'pointsAbbreviation')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Global Ranking Table -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                    <div class="space-y-3">
                        ${rankingData.map(player => {
                            const isCurrentUser = player.username === 'testuser';
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
                        }).join('')}
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

    function getRankBadgeColor(rank: number): string {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
            case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
            case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600';
            default: return 'bg-[#003566]';
        }
    }

    function getRankIcon(rank: number): string {
        switch (rank) {
            case 1: return '👑';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    }

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = rankingHtml;
    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de ranking.');
    }
}
