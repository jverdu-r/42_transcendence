// src/pages/profile.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  elo: number;
  ranking: number;
  matchHistory: Array<{
    id: number;
    result: 'win' | 'loss';
    opponent: string;
    score: string;
    date: string;
  }>;
  avatar_url?: string; 
}

async function getUserStats(): Promise<UserStats | null> {
  const token = localStorage.getItem('jwt');
  if (!token) return null;

  try {
    const response = await fetch('http://localhost:9000/api/auth/profile/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function renderProfilePage(): Promise<void> {
  const maybeUser = getCurrentUser();
  if (!maybeUser) {
    navigateTo('/login');
    return;
  }
  const user: User = maybeUser;
  if (!user) {
    navigateTo('/login');
    return;
  }

  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (pageContent) {
    pageContent.innerHTML = `
      <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
        <div class="max-w-6xl w-full">
          <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#003566] shadow-2xl mb-8">
            <div class="flex items-center justify-center">
              <div class="text-[#ffc300] text-xl">Cargando estadísticas...</div>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  const stats = await getUserStats();

  if (stats && user) {
    user.avatar_url = stats.avatar_url;
    if (stats.avatar_url && !stats.avatar_url.startsWith('http')) {
      stats.avatar_url = `http://localhost:8001${stats.avatar_url}`;
    }
    user.avatar_url = stats.avatar_url;
    localStorage.setItem('user', JSON.stringify(user));
  }

  const defaultStats: UserStats = {
    totalGames: 0, wins: 0, losses: 0, winRate: 0, elo: 1000, ranking: 999, matchHistory: []
  };
  const userStats = stats || defaultStats;

  const profileHtml = `
    <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
      <div class="max-w-6xl w-full">
        <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#003566] shadow-2xl mb-8">
          <div class="flex flex-col lg:flex-row items-center gap-8">
            ${
              user.avatar_url
                ? `<img src="${user.avatar_url}" alt="Avatar" class="w-32 h-32 rounded-full object-cover border-2 border-[#ffc300]" />`
                : `<div class="w-32 h-32 rounded-full bg-gradient-to-r from-[#ffc300] to-[#ffd60a] flex items-center justify-center text-[#000814] text-4xl font-bold">
                    ${user.username.charAt(0).toUpperCase()}
                  </div>`
            }
            <div class="text-center lg:text-left flex-grow">
              <h1 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-2">
                ${user.username}
              </h1>
              <p class="text-gray-300 mb-4">${user.email}</p>
              <div class="flex flex-wrap gap-4 justify-center lg:justify-start">
                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">${getTranslation('profile', 'ranking')}: #${userStats.ranking}</span>
                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">${getTranslation('profile', 'ELO')}: ${userStats.elo}</span>
                <span class="px-4 py-2 bg-[#001d3d] rounded-full text-sm border border-[#003566]">${getTranslation('profile', 'games')}: ${userStats.totalGames}</span>
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <button id="edit-profile" class="px-6 py-3 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold rounded-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300">
                ${getTranslation('profile', 'editProfileButton')}
              </button>
              <button id="upload-avatar-btn" class="px-6 py-3 border-2 border-[#003566] text-[#ffc300] font-semibold rounded-xl hover:bg-[#001d3d] hover:text-white transition-all duration-300">
                ${getTranslation('profile', 'uploadAvatarButton')}
              </button>
              <input type="file" id="avatar-input" accept="image/*" style="display:none" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
            <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-6">
              ${getTranslation('profile', 'statsTitle')}
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                <div class="text-2xl font-bold text-[#ffc300]">${userStats.wins}</div>
                <div class="text-sm text-gray-300">${getTranslation('profile', 'totalWins')}</div>
              </div>
              <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                <div class="text-2xl font-bold text-red-400">${userStats.losses}</div>
                <div class="text-sm text-gray-300">${getTranslation('profile', 'totalLosses')}</div>
              </div>
              <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                <div class="text-2xl font-bold text-green-400">${userStats.winRate}%</div>
                <div class="text-sm text-gray-300">${getTranslation('profile', 'winRate')}</div>
              </div>
              <div class="text-center p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                <div class="text-2xl font-bold text-[#ffd60a]">${userStats.elo}</div>
                <div class="text-sm text-gray-300">${getTranslation('profile', 'eloRating')}</div>
              </div>
            </div>
          </div>

          <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-display font-bold text-[#ffc300]">
                ${getTranslation('profile', 'matchHistoryTitle')}
              </h2>
              <button id="download-history"
                class="text-sm text-blue-400 hover:underline">
                ${getTranslation('profile', 'download')}
              </button>
            </div>
            <div class="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              ${userStats.matchHistory.length > 0 ? userStats.matchHistory.map(match => `
                <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566]">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 ${match.result === 'win' ? 'bg-green-400' : 'bg-red-400'} rounded-full"></div>
                    <span class="${match.result === 'win' ? 'text-green-400' : 'text-red-400'} font-semibold">
                      ${match.result === 'win' ? getTranslation('profile', 'matchWin') : getTranslation('profile', 'matchLoss')}
                    </span>
                    <span class="text-gray-300">vs ${match.opponent}</span>
                  </div>
                  <span class="text-[#ffc300] font-bold">${match.score}</span>
                </div>
              `).join('') : `
                <div class="text-center p-4 text-gray-400">No hay partidas jugadas aún</div>
              `}
            </div>
          </div>
        </div>
      </div>
    </main>
    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 8px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #001d3d; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #003566; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #004b80; }
    </style>
  `;

  if (pageContent) {
    pageContent.innerHTML = profileHtml;

    // Avatar
    const avatarInput = document.getElementById('avatar-input') as HTMLInputElement;
    const uploadBtn = document.getElementById('upload-avatar-btn');
    if (uploadBtn && avatarInput) {
      uploadBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', async () => {
        const file = avatarInput.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('jwt');
        const res = await fetch('http://localhost:9000/api/auth/profile/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const user: User | null = getCurrentUser();
          const avatarPreview = document.getElementById('avatar-preview');
          if (user && user.avatar_url && avatarPreview) {
            avatarPreview.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width: 128px; height: 128px; border-radius: 50%; margin: auto; display: block;" />`;
          } else if (avatarPreview) {
            avatarPreview.innerHTML = '<p class="text-center">Avatar no disponible</p>';
          }
          if (user) {
            user.avatar_url = data.avatar_url;
            localStorage.setItem('user', JSON.stringify(user));
            renderProfilePage(); // Recarga perfil para que se vea
          }
          alert(getTranslation('alerts', 'avatarOk'));
        } else {
          alert(getTranslation('alerts', 'avatarFail'));
        }
      });
    }

    // Botón editar perfil
    const editProfile = document.getElementById('edit-profile');
    if (editProfile) {
      editProfile.addEventListener('click', () => navigateTo('/settings'));
    }
  
    // Descargar historial
    const downloadBtn = document.getElementById('download-history') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('jwt');
        if (!token) {
          alert(getTranslation('alerts', 'history'));
          return;
        }

        downloadBtn.textContent = 'Descargando...';
        downloadBtn.disabled = true;

        try {
          const response = await fetch('/api/auth/profile/download-historial', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
            throw new Error('No se pudo descargar el historial');
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.download = `historial_${user.id}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          downloadBtn.textContent = '✔ Descargado';
        } catch (err) {
          console.error(err);
          alert(getTranslation('alerts', 'historyError'));
          downloadBtn.textContent = 'Descargar historial';
        } finally {
          setTimeout(() => {
            downloadBtn.textContent = 'Descargar historial';
            downloadBtn.disabled = false;
          }, 2000);
        }
      });
    }
  }
}
