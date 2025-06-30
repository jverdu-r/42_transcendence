// src/pages/profile.ts

import { navigateTo } from '../router';
// Importa las funciones de internacionalización
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n';

// Interface for user profile data
interface UserProfile {
  id: number;
  username: string;
  email: string;
  created_at: string;
  stats: {
    matches_played: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_score: number;
    global_ranking: number;
  };
}

// Interface for game history
interface GameHistory {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_username: string;
  player2_username: string;
  player1_score: number;
  player2_score: number;
  winner_id: number;
  played_at: string;
  points_change: number;
}

export async function renderProfilePage(): Promise<void> {
  // Quita el listener de languageChange antes de añadir uno nuevo para evitar duplicados
  window.removeEventListener('languageChange', renderProfilePage);

  const lang = getCurrentLanguage(); // Obtiene el idioma actual para la bandera inicial
  
  // Show loading state first
  showLoadingState();
  
  try {
    // Fetch user profile data and game history in parallel
    const [userProfile, gameHistory] = await Promise.all([
      fetchUserProfile(),
      fetchGameHistory()
    ]);
    
    if (userProfile) {
      renderProfileWithData(userProfile, gameHistory);
    } else {
      renderProfileError();
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    renderProfileError();
  }
}

async function fetchUserProfile(): Promise<UserProfile | null> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    navigateTo('/login');
    return null;
  }

  try {
    const response = await fetch('/api/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } as HeadersInit
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      navigateTo('/login');
      return null;
    } else {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

async function fetchGameHistory(): Promise<GameHistory[]> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return [];
  }

  try {
    const response = await fetch('/api/game-history', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } as HeadersInit
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error(`Failed to fetch game history: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('Error fetching game history:', error);
    return [];
  }
}

function showLoadingState(): void {
  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (pageContent) {
    pageContent.innerHTML = `
      <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
        <div class="w-full max-w-2xl rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex flex-col items-center text-center">
          <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ffc300] mb-4"></div>
          <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-4">${getTranslation('profile', 'loading') || 'Loading profile...'}</h2>
        </div>
      </main>
    `;
  }
}

function renderProfileError(): void {
  const pageContent = document.getElementById('page-content') as HTMLElement;
  if (pageContent) {
    pageContent.innerHTML = `
      <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
        <div class="w-full max-w-2xl rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex flex-col items-center text-center">
          <div class="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 class="text-2xl font-display font-bold text-red-400 mb-4">${getTranslation('profile', 'error') || 'Error loading profile'}</h2>
          <p class="text-gray-300 mb-4">${getTranslation('profile', 'errorMessage') || 'Unable to load your profile data. Please try again.'}</p>
          <button onclick="location.reload()" class="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] py-2 px-4 rounded-xl font-bold hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300">
            ${getTranslation('profile', 'retry') || 'Retry'}
          </button>
        </div>
      </main>
    `;
  }
}

function renderProfileWithData(userProfile: UserProfile, gameHistory: GameHistory[]): void {
  const lang = getCurrentLanguage();
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return getTranslation('profile', '1dayAgo') || '1 day ago';
    if (diffDays <= 7) return `${diffDays} ${getTranslation('profile', 'daysAgo') || 'days ago'}`;
    if (diffDays <= 14) return getTranslation('profile', '1weekAgo') || '1 week ago';
    if (diffDays <= 21) return `${Math.ceil(diffDays / 7)} ${getTranslation('profile', 'weeksAgo') || 'weeks ago'}`;
    return date.toLocaleDateString();
  };
  
  // Generate game history HTML
  const generateGameHistoryHTML = (games: GameHistory[]): string => {
    if (games.length === 0) {
      return `
        <div class="text-center py-8 text-gray-400">
          <p class="text-xl mb-2">🎮</p>
          <p>${getTranslation('profile', 'noGamesPlayed') || 'No games played yet'}</p>
          <p class="text-sm mt-2">${getTranslation('profile', 'startPlaying') || 'Start playing to see your match history!'}</p>
        </div>
      `;
    }
    
    return games.map(game => {
      const currentUserId = userProfile.id;
      const isWinner = game.winner_id === currentUserId;
      const opponentName = game.player1_id === currentUserId ? game.player2_username : game.player1_username;
      const playerScore = game.player1_id === currentUserId ? game.player1_score : game.player2_score;
      const opponentScore = game.player1_id === currentUserId ? game.player2_score : game.player1_score;
      const resultText = isWinner ? 
        (getTranslation('profile', 'victory') || 'Victory') : 
        (getTranslation('profile', 'defeat') || 'Defeat');
      const pointsChange = game.points_change;
      const pointsDisplay = pointsChange > 0 ? `+${pointsChange}` : `${pointsChange}`;
      const pointsColor = pointsChange > 0 ? 'text-[#ffd60a]' : 'text-gray-400';
      
      return `
        <div class="flex justify-between items-center bg-[#001d3d] p-3 sm:p-4 rounded-xl shadow-md border border-[#003566]">
          <div>
            <p class="font-semibold text-gray-100 text-base sm:text-lg">${opponentName}</p>
            <p class="text-sm sm:text-base text-gray-400">${resultText} - ${playerScore}/${opponentScore} - ${formatDate(game.played_at)}</p>
          </div>
          <span class="text-lg sm:text-xl font-bold ${pointsColor}">${pointsDisplay} pts</span>
        </div>
      `;
    }).join('');
  };

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
        <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-4 sm:mb-6 drop-shadow-md leading-tight">${userProfile.username}</h2>
        <p class="text-gray-300 mb-2">${userProfile.email}</p>
        <p class="text-gray-400 text-sm mb-4">${getTranslation('profile', 'memberSince') || 'Member since'} ${formatDate(userProfile.created_at)}</p>
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
            <p class="text-2xl sm:text-3xl font-bold text-[#ffc300]">${userProfile.stats.matches_played}</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.wins">${getTranslation('profile', 'wins')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffd60a]">${userProfile.stats.wins}</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.losses">${getTranslation('profile', 'losses')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-300">${userProfile.stats.losses}</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.winRate">${getTranslation('profile', 'winRate')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffc300]">${userProfile.stats.win_rate.toFixed(1)}%</p>
          </div>
          <div class="bg-[#001d3d] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#003566]">
            <p class="text-sm sm:text-base text-gray-400 mb-1" data-i18n="profile.totalPoints">${getTranslation('profile', 'totalPoints')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-[#ffd60a]">${userProfile.stats.total_score.toLocaleString()}</p>
          </div>
          <div class="bg-[#003566] p-4 sm:p-5 rounded-xl text-center shadow-lg border border-[#ffc300]">
            <p class="text-sm sm:text-base text-gray-200 mb-1" data-i18n="profile.globalRanking">${getTranslation('profile', 'globalRanking')}</p>
            <p class="text-2xl sm:text-3xl font-bold text-white">#${userProfile.stats.global_ranking}</p>
          </div>
        </div>
      </div>

      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-2xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h3 class="text-2xl sm:text-3xl font-display font-extrabold text-[#ffc300] mb-4 sm:mb-6 text-center drop-shadow-md leading-tight" data-i18n="profile.matchHistoryTitle">${getTranslation('profile', 'matchHistoryTitle')}</h3>
        <div class="space-y-4 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
          ${generateGameHistoryHTML(gameHistory)}
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