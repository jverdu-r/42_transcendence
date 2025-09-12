import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';
import { getTranslation } from '../i18n';

let refreshInterval: number | null = null;

export function renderUnifiedGameOnline(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-6xl mx-auto p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🌐 ${getTranslation('game_online', 'title')}
        </h1>
        <p class="text-lg text-gray-300">${getTranslation('game_online', 'subtitle')}</p>
      </div>
      
      <!-- Sección Crear Partida -->
      <div class="bg-gradient-to-r from-green-800 to-green-900 rounded-lg p-6 mb-8 border-2 border-green-600">
        <h2 class="text-2xl font-bold mb-4 text-center text-green-300">
          ➕ ${getTranslation('game_online', 'create_game')}
        </h2>
        <div class="text-center">
          <button id="create-game" class="bg-green-500 text-white py-3 px-8 rounded-xl hover:bg-green-600 transition-all duration-200 text-lg font-semibold transform hover:scale-105 shadow-lg">
            🎮 ${getTranslation('game_online', 'create_button')}
          </button>
          <p class="text-sm text-green-200 mt-3">
            ${getTranslation('game_online', 'create_description')}
          </p>
        </div>
      </div>

      <!-- Sección Unirse a Partida -->
      <div class="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg p-6 mb-8 border-2 border-blue-600">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-blue-300">🔍 ${getTranslation('game_online', 'available_games')}</h2>
          <div class="flex gap-3">
            <button id="refresh-games" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105">
              🔄 ${getTranslation('game_online', 'refresh')}
            </button>
            <div id="auto-refresh-toggle" class="flex items-center">
              <input type="checkbox" id="auto-refresh" class="mr-2" checked>
              <label for="auto-refresh" class="text-blue-200 text-sm">${getTranslation('game_online', 'auto_refresh')}</label>
            </div>
          </div>
        </div>
        
        <div id="games-container" class="space-y-4">
          <div class="text-center py-8">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p class="text-blue-300">🔄 ${getTranslation('game_online', 'loading_games')}</p>
          </div>
        </div>
      </div>

      <!-- Estadísticas Online -->
      <div class="bg-gradient-to-r from-purple-800 to-purple-900 rounded-lg p-6 mb-8 border-2 border-purple-600">
        <h3 class="text-xl font-bold mb-4 text-center text-purple-300">📊 ${getTranslation('game_online', 'server_status')}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-green-400" id="total-online-games">-</div>
            <div class="text-xs text-purple-200">${getTranslation('game_online', 'total_games')}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-yellow-400" id="waiting-games">-</div>
            <div class="text-xs text-purple-200">${getTranslation('game_online', 'waiting_players')}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-400" id="active-games">-</div>
            <div class="text-xs text-purple-200">${getTranslation('game_online', 'in_game')}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-400" id="spectators-count">-</div>
            <div class="text-xs text-purple-200">${getTranslation('game_online', 'spectators')}</div>
          </div>
        </div>
      </div>

      <!-- Botón Volver -->
      <div class="text-center">
        <button id="back-to-play" class="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105">
          ← ${getTranslation('game_online', 'back_to_menu')}
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('create-game')?.addEventListener('click', createNewGame);
  document.getElementById('refresh-games')?.addEventListener('click', loadAvailableGames);
  document.getElementById('back-to-play')?.addEventListener('click', () => {
    cleanupOnlineMode();
    navigateTo('/play');
  });

  // Auto-refresh toggle
  const autoRefreshCheckbox = document.getElementById('auto-refresh') as HTMLInputElement;
  autoRefreshCheckbox?.addEventListener('change', toggleAutoRefresh);

  // Cargar partidas al inicializar
  loadAvailableGames();
  startAutoRefresh();
}

function startAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = window.setInterval(() => {
    const autoRefreshCheckbox = document.getElementById('auto-refresh') as HTMLInputElement;
    if (autoRefreshCheckbox?.checked) {
      loadAvailableGames();
    }
  }, 5000); // Actualizar cada 5 segundos
}

function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function toggleAutoRefresh(): void {
  const autoRefreshCheckbox = document.getElementById('auto-refresh') as HTMLInputElement;
  if (autoRefreshCheckbox?.checked) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function cleanupOnlineMode(): void {
  stopAutoRefresh();
}

async function createNewGame(): Promise<void> {
  const createButton = document.getElementById('create-game') as HTMLButtonElement;
  if (!createButton) return;

  // Use current hostname automatically
  const serverHost = window.location.hostname;

  // Deshabilitar botón mientras se crea la partida
  createButton.disabled = true;
  createButton.innerHTML = '⏳ Creando partida...';

  try {
    const currentUser = getCurrentUser();
    const gameName = `Partida de ${currentUser?.username || getTranslation('notifications', 'username_default')} - ${new Date().toLocaleTimeString()}`;
    
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        nombre: gameName, 
        gameMode: 'pvp', 
        maxPlayers: 2,
        playerName: currentUser?.username || getTranslation('notifications', 'username_default')
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    console.log('✅ Partida creada:', game);
    
    // Mostrar mensaje de éxito
    showNotification('✅ ' + getTranslation('notifications', 'game_created'), 'success');
    
    // Guardar información de la partida
    sessionStorage.setItem('currentGameId', game.id);
    sessionStorage.setItem('currentGameMode', 'pvp');
    sessionStorage.setItem('isGameCreator', 'true');
    
    // Actualizar lista inmediatamente
    setTimeout(() => {
      loadAvailableGames();
    }, 1000);
    
    // Redirigir al lobby después de un breve delay
    setTimeout(() => {
      navigateTo('/game-lobby');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error creando partida:', error);
    showNotification('❌ ' + getTranslation('notifications', 'game_create_error'), 'error');
    
    // Restaurar botón
    createButton.disabled = false;
    createButton.innerHTML = '🎮 Crear Partida Online';
  }
}

async function loadAvailableGames(): Promise<void> {
  const gamesContainer = document.getElementById('games-container');
  if (!gamesContainer) return;

  try {
    const response = await fetch('/api/games', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📋 Partidas recibidas:', data);
    
    // Actualizar estadísticas del servidor
    updateServerStats(data.games || []);
    
    // Filtrar solo partidas disponibles (no llenas y no en juego)
    const availableGames = (data.games || []).filter((game: any) => 
      game.jugadoresConectados < game.capacidadMaxima && !game.enJuego
    );

    if (availableGames.length === 0) {
      gamesContainer.innerHTML = `
        <div class="bg-gray-700 rounded-lg p-8 text-center border-2 border-gray-600">
          <div class="text-6xl mb-4">😴</div>
          <h3 class="text-xl font-bold text-gray-300 mb-2">No hay partidas disponibles</h3>
          <p class="text-gray-400 mb-4">No se encontraron partidas disponibles para unirse en este momento.</p>
          <p class="text-sm text-gray-500">💡 ¡Crea tu propia partida para empezar a jugar!</p>
        </div>
      `;
      return;
    }

    // Renderizar partidas disponibles
    gamesContainer.innerHTML = availableGames.map((game: any) => {
      const isCreatedByMe = sessionStorage.getItem('currentGameId') === game.id;
      return `
        <div class="bg-gray-700 rounded-lg p-6 border-2 ${isCreatedByMe ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-blue-500'} transition-all duration-200 hover:shadow-lg">
          <div class="flex justify-between items-center">
            <div class="flex-1">
              <div class="flex items-center mb-3">
                <div class="text-2xl mr-3">🎮</div>
                <div>
                  <h3 class="text-lg font-bold text-white flex items-center">
                    ${game.nombre || `Partida ${game.id.substring(0, 8)}`}
                    ${isCreatedByMe ? '<span class="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">TU PARTIDA</span>' : ''}
                  </h3>
                  <p class="text-sm text-gray-400">ID: ${game.id.substring(0, 12)}...</p>
                </div>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="flex items-center">
                  <span class="text-gray-400 mr-2">👥</span>
                  <span class="text-white font-semibold">${game.jugadoresConectados}/${game.capacidadMaxima}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-gray-400 mr-2">🎯</span>
                  <span class="text-white font-semibold">${game.gameMode === 'pvp' ? 'PvP' : 'PvE'}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-gray-400 mr-2">⏱️</span>
                  <span class="text-yellow-400 font-semibold">
                    ${game.enJuego ? '🎮 En Juego' : '⏳ Esperando'}
                  </span>
                </div>
                <div class="flex items-center">
                  <span class="text-gray-400 mr-2">🕐</span>
                  <span class="text-white font-semibold text-xs">${new Date(game.createdAt || Date.now()).toLocaleTimeString()}</span>
          joinGame(gameId);
              </div>
              
              ${game.jugadores && game.jugadores.length > 0 ? `
                <div class="mt-3 pt-3 border-t border-gray-600">
                  <div class="text-xs text-gray-400 mb-1">Jugadores:</div>
                  <div class="flex flex-wrap gap-2">
                    ${game.jugadores.map((jugador: any) => `
                      <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                        ${jugador.nombre} (#${jugador.numero})
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="ml-6">
              <button 
                class="join-game-btn ${isCreatedByMe ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                data-game-id="${game.id}"
                ${game.jugadoresConectados >= game.capacidadMaxima ? 'disabled' : ''}
              >
                ${game.jugadoresConectados >= game.capacidadMaxima ? '🚫 Llena' : 
                  isCreatedByMe ? '🎮 Entrar' : '➡️ Unirse'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar event listeners a los botones de unirse
    document.querySelectorAll('.join-game-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const gameId = (e.target as HTMLElement).getAttribute('data-game-id');
        if (gameId) {
joinGame(gameId);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error cargando partidas:', error);
    gamesContainer.innerHTML = `
      <div class="bg-red-800 rounded-lg p-6 text-center border-2 border-red-600">
        <div class="text-4xl mb-4">❌</div>
        <h3 class="text-xl font-bold text-red-200 mb-2">Error al cargar partidas</h3>
        <p class="text-red-300 mb-4">${error instanceof Error ? error.message : 'Error desconocido'}</p>
        <button id="retry-load" class="bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-700 transition">
          🔄 Reintentar
        </button>
      </div>
    `;
    
    document.getElementById('retry-load')?.addEventListener('click', loadAvailableGames);
  }
}

function updateServerStats(games: any[]): void {
  const totalGames = games.length;
  const waitingGames = games.filter(g => !g.enJuego && g.jugadoresConectados < g.capacidadMaxima).length;
  const activeGames = games.filter(g => g.enJuego).length;
  const totalSpectators = games.reduce((sum, g) => sum + (g.espectadores || 0), 0);

  const totalEl = document.getElementById('total-online-games');
  const waitingEl = document.getElementById('waiting-games');
  const activeEl = document.getElementById('active-games');
  const spectatorsEl = document.getElementById('spectators-count');

  if (totalEl) totalEl.textContent = totalGames.toString();
  if (waitingEl) waitingEl.textContent = waitingGames.toString();
  if (activeEl) activeEl.textContent = activeGames.toString();
  if (spectatorsEl) spectatorsEl.textContent = totalSpectators.toString();
}

async function joinGame(gameId: string): Promise<void> {
  const joinButton = document.querySelector(`[data-game-id="${gameId}"]`) as HTMLButtonElement;
  if (!joinButton) return;

  // Use current hostname automatically
  const serverHost = window.location.hostname;

  // Deshabilitar botón mientras se une a la partida
  const originalText = joinButton.innerHTML;
  joinButton.disabled = true;
  joinButton.innerHTML = '⏳ Uniéndose...';

  try {
    console.log(`🔗 Intentando unirse a la partida ${gameId}...`);
    
    // Verificar que la partida aún esté disponible
    const response = await fetch(`/api/games/${gameId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    console.log('📋 Información de la partida:', game);
    
    // Validar disponibilidad
    if (game.jugadoresConectados >= game.capacidadMaxima) {
      showNotification('❌ La partida está llena. Intenta con otra partida.', 'error');
      loadAvailableGames(); // Recargar la lista
      return;
    }
    
    if (game.enJuego) {
      showNotification('❌ La partida ya está en progreso. Intenta con otra partida.', 'error');
      loadAvailableGames(); // Recargar la lista
      return;
    }
    
    console.log('✅ Uniéndose a la partida:', game);
    
    // Mostrar mensaje de éxito
    showNotification('✅ Te has unido a la partida! Dirigiéndote al juego...', 'success');
    
    // Guardar información de la partida
    sessionStorage.setItem('currentGameId', gameId);
    sessionStorage.setItem('currentGameMode', 'pvp');
    sessionStorage.removeItem('isGameCreator'); // No somos el creador
    
    // Redirigir al lobby después de un breve delay
    setTimeout(() => {
      navigateTo('/game-lobby');
    }, 1500);
    
  } catch (error) {
    console.error('❌ Error uniéndose a la partida:', error);
    showNotification('❌ Error al unirse a la partida. Inténtalo de nuevo.', 'error');
    
    // Restaurar botón
    joinButton.disabled = false;
    joinButton.innerHTML = originalText;
  }
}

function showNotification(message: string, type: 'success' | 'error'): void {
  // Remover notificaciones existentes
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full max-w-md`;
  
  if (type === 'success') {
    notification.className += ' bg-green-500 text-white border-2 border-green-400';
  } else {
    notification.className += ' bg-red-500 text-white border-2 border-red-400';
  }
  
  notification.innerHTML = `
    <div class="flex items-center">
      <span class="mr-2 text-xl">${type === 'success' ? '✅' : '❌'}</span>
      <span class="font-medium">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Remover después de 4 segundos
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Limpiar al salir de la página
window.addEventListener('beforeunload', cleanupOnlineMode);
