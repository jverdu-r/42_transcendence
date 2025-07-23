import { navigateTo } from '../router';

let spectatorSocket: WebSocket | null = null;
let currentGameId: string | null = null;
let refreshInterval: number | null = null;

export function renderGameSpectator(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el observador de juego.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-6xl mx-auto p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 to-purple-600 bg-clip-text text-transparent">
          👁️ Modo Espectador
        </h1>
        <p class="text-lg text-gray-300">Observa partidas en vivo y aprende de otros jugadores</p>
      </div>
      
      <!-- Sección Partidas en Vivo -->
      <div class="bg-gradient-to-r from-red-800 to-red-900 rounded-lg p-6 mb-8 border-2 border-red-600">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-red-300">🔴 Partidas en Vivo</h2>
          <div class="flex gap-3">
            <button id="refresh-live-games" class="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105">
              🔄 Actualizar
            </button>
            <div class="flex items-center">
              <input type="checkbox" id="auto-refresh-spectator" class="mr-2" checked>
              <label for="auto-refresh-spectator" class="text-red-200 text-sm">Auto-actualizar</label>
            </div>
          </div>
        </div>
        
        <div id="live-games-container" class="space-y-4">
          <div class="text-center py-8">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mb-4"></div>
            <p class="text-red-300">🔄 Buscando partidas en vivo...</p>
          </div>
        </div>
      </div>

      <!-- Visor de Partida -->
      <div id="game-viewer" class="bg-gradient-to-r from-purple-800 to-purple-900 rounded-lg p-6 mb-8 border-2 border-purple-600 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-purple-300">🎮 Observando Partida</h2>
          <button id="stop-watching" class="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition">
            ⏹️ Dejar de Observar
          </button>
        </div>
        
        <div class="bg-black border-2 border-purple-400 rounded-lg p-4 mb-4">
          <canvas id="observerCanvas" width="600" height="400" class="w-full h-auto bg-black rounded"></canvas>
        </div>
        
        <div class="text-center">
          <div id="spectator-score" class="grid grid-cols-2 gap-4 text-lg font-bold mb-4">
            <div class="text-left bg-yellow-600/20 rounded-lg p-3 border border-yellow-400">
              <span class="text-yellow-400" id="spectator-player1">Jugador 1</span>: 
              <span class="text-2xl" id="spectator-score1">0</span>
            </div>
            <div class="text-right bg-blue-600/20 rounded-lg p-3 border border-blue-400">
              <span class="text-blue-400" id="spectator-player2">Jugador 2</span>: 
              <span class="text-2xl" id="spectator-score2">0</span>
            </div>
          </div>
          <div id="spectator-status" class="mt-4 text-purple-300 bg-purple-800/50 rounded-lg p-3">
            <p>🔴 Observando partida en vivo</p>
          </div>
        </div>
      </div>

      <!-- Estadísticas de Espectador -->
      <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-8 border-2 border-gray-600">
        <h3 class="text-xl font-bold mb-4 text-center text-gray-300">📊 Estado del Servidor</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-green-400" id="total-live-games">-</div>
            <div class="text-xs text-gray-400">Partidas en Vivo</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-400" id="total-players">-</div>
            <div class="text-xs text-gray-400">Jugadores Activos</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-400" id="total-spectators">-</div>
            <div class="text-xs text-gray-400">Espectadores Totales</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-yellow-400" id="connection-status">🔄</div>
            <div class="text-xs text-gray-400">Estado Conexión</div>
          </div>
        </div>
      </div>
      
      <!-- Botón Volver -->
      <div class="text-center">
        <button id="back-to-play" class="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105">
          ← Volver al Menú Principal
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('refresh-live-games')?.addEventListener('click', loadLiveGames);
  document.getElementById('stop-watching')?.addEventListener('click', stopWatching);
  document.getElementById('back-to-play')?.addEventListener('click', () => {
    cleanupSpectator();
    navigateTo('/play');
  });

  // Auto-refresh toggle
  const autoRefreshCheckbox = document.getElementById('auto-refresh-spectator') as HTMLInputElement;
  autoRefreshCheckbox?.addEventListener('change', toggleAutoRefresh);

  // Cargar partidas inicialmente
  loadLiveGames();
  startAutoRefresh();
}

function startAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = window.setInterval(() => {
    const autoRefreshCheckbox = document.getElementById('auto-refresh-spectator') as HTMLInputElement;
    if (autoRefreshCheckbox?.checked && !spectatorSocket) {
      loadLiveGames();
    }
  }, 3000); // Actualizar cada 3 segundos
}

function toggleAutoRefresh(): void {
  const autoRefreshCheckbox = document.getElementById('auto-refresh-spectator') as HTMLInputElement;
  if (autoRefreshCheckbox?.checked) {
    startAutoRefresh();
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
}

async function loadLiveGames(): Promise<void> {
  const liveGamesContainer = document.getElementById('live-games-container');
  if (!liveGamesContainer) return;

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
    console.log('📋 Partidas recibidas para espectador:', data);
    
    // Actualizar estadísticas del servidor
    updateSpectatorStats(data.games || []);
    
    // Filtrar solo partidas en juego
    const liveGames = (data.games || []).filter((game: any) => 
      game.enJuego && game.jugadoresConectados >= 2
    );

    if (liveGames.length === 0) {
      liveGamesContainer.innerHTML = `
        <div class="bg-gray-700 rounded-lg p-8 text-center border-2 border-gray-600">
          <div class="text-6xl mb-4">📺</div>
          <h3 class="text-xl font-bold text-gray-300 mb-2">No hay partidas en vivo</h3>
          <p class="text-gray-400 mb-4">No se encontraron partidas en curso en este momento.</p>
          <p class="text-sm text-gray-500">💡 ¡Vuelve más tarde o crea tu propia partida!</p>
        </div>
      `;
      return;
    }

    // Renderizar partidas en vivo
    liveGamesContainer.innerHTML = liveGames.map((game: any) => `
      <div class="bg-gray-700 rounded-lg p-6 border-2 border-red-600 hover:border-red-400 transition-all duration-200 hover:shadow-lg">
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <div class="flex items-center mb-3">
              <div class="text-2xl mr-3">🔴</div>
              <div>
                <h3 class="text-lg font-bold text-white flex items-center">
                  ${game.nombre || `Partida ${game.id.substring(0, 8)}`}
                  <span class="ml-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    EN VIVO
                  </span>
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
                <span class="text-gray-400 mr-2">⚡</span>
                <span class="text-green-400 font-semibold">🎮 Jugando</span>
              </div>
              <div class="flex items-center">
                <span class="text-gray-400 mr-2">🏆</span>
                <span class="text-white font-semibold">${game.puntuacion?.jugador1 || 0} - ${game.puntuacion?.jugador2 || 0}</span>
              </div>
            </div>

            ${game.jugadores && game.jugadores.length > 0 ? `
              <div class="mt-3 pt-3 border-t border-red-600">
                <div class="text-xs text-red-300 mb-1">Jugadores en partida:</div>
                <div class="flex flex-wrap gap-2">
                  ${game.jugadores.map((jugador: any, index: number) => `
                    <span class="bg-${index === 0 ? 'yellow' : 'blue'}-600 text-white px-2 py-1 rounded text-xs">
                      ${jugador.nombre} (#${jugador.numero})
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="mt-3 pt-3 border-t border-gray-600">
              <div class="flex items-center text-xs text-gray-400">
                <span class="mr-2">👁️</span>
                <span>${game.espectadores || 0} espectadores observando</span>
              </div>
            </div>
          </div>
          
          <div class="ml-6">
            <button 
              class="watch-game-btn bg-red-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
              data-game-id="${game.id}"
            >
              👁️ Observar
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Agregar event listeners a los botones de observar
    document.querySelectorAll('.watch-game-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const gameId = (e.target as HTMLElement).getAttribute('data-game-id');
        if (gameId) {
          watchGame(gameId);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error cargando partidas en vivo:', error);
    liveGamesContainer.innerHTML = `
      <div class="bg-red-800 rounded-lg p-6 text-center border-2 border-red-600">
        <div class="text-4xl mb-4">❌</div>
        <h3 class="text-xl font-bold text-red-200 mb-2">Error al cargar partidas</h3>
        <p class="text-red-300 mb-4">${error instanceof Error ? error.message : 'Error desconocido'}</p>
        <button id="retry-load-live" class="bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-700 transition">
          🔄 Reintentar
        </button>
      </div>
    `;
    
    document.getElementById('retry-load-live')?.addEventListener('click', loadLiveGames);
  }
}

function updateSpectatorStats(games: any[]): void {
  const liveGames = games.filter(g => g.enJuego).length;
  const totalPlayers = games.reduce((sum, g) => sum + (g.jugadoresConectados || 0), 0);
  const totalSpectators = games.reduce((sum, g) => sum + (g.espectadores || 0), 0);

  const liveGamesEl = document.getElementById('total-live-games');
  const playersEl = document.getElementById('total-players');
  const spectatorsEl = document.getElementById('total-spectators');
  const statusEl = document.getElementById('connection-status');

  if (liveGamesEl) liveGamesEl.textContent = liveGames.toString();
  if (playersEl) playersEl.textContent = totalPlayers.toString();
  if (spectatorsEl) spectatorsEl.textContent = totalSpectators.toString();
  if (statusEl) statusEl.textContent = spectatorSocket ? '🟢' : '🔄';
}

function watchGame(gameId: string): void {
  if (spectatorSocket) {
    spectatorSocket.close();
  }

  currentGameId = gameId;
  
  // Mostrar el visor de juego
  const gameViewer = document.getElementById('game-viewer');
  if (gameViewer) {
    gameViewer.classList.remove('hidden');
  }

  // Limpiar canvas inicial
  drawInitialCanvas();

  // Detener auto-refresh mientras observamos
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  // Conectar al WebSocket del observador
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/spectate/${gameId}`;
  
  console.log('🔗 Conectando al WebSocket del espectador:', wsUrl);
  spectatorSocket = new WebSocket(wsUrl);
  
  spectatorSocket.onopen = () => {
    console.log('✅ Conectado al WebSocket del observador');
    updateSpectatorStatus('🔗 Conectado, cargando partida...');
    updateConnectionStatus('🟢');
  };

  spectatorSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📡 Mensaje del espectador recibido:', data);
      
      if (data.type === 'spectator_connected') {
        updateSpectatorStatus('✅ Conectado como espectador');
      } else if (data.type === 'game_state' && data.data) {
        // Manejar estado del juego para espectadores
        if (data.data.gameState) {
          drawGame(data.data.gameState);
          updateSpectatorScore(data.data.gameState);
          updateSpectatorStatus('🔴 Observando partida en vivo');
        }
      } else if (data.type === 'gameUpdate' && data.data) {
        // Actualización en tiempo real del juego
        if (data.data.gameState) {
          drawGame(data.data.gameState);
          updateSpectatorScore(data.data.gameState);
        }
      } else if (data.type === 'gameFinished' || data.tipo === 'partida_finalizada') {
        updateSpectatorStatus('🏆 Partida finalizada');
        setTimeout(() => {
          stopWatching();
        }, 3000);
      } else if (data.type === 'error') {
        console.error('❌ Error del observador:', data.data?.message || data.mensaje);
        updateSpectatorStatus(`❌ Error: ${data.data?.message || data.mensaje || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje del espectador:', error);
    }
  };

  spectatorSocket.onclose = () => {
    console.log('🔌 Desconectado del WebSocket del observador');
    updateSpectatorStatus('🔌 Desconectado');
    updateConnectionStatus('🔴');
    spectatorSocket = null;
  };

  spectatorSocket.onerror = (error) => {
    console.error('❌ Error en WebSocket del observador:', error);
    updateSpectatorStatus('❌ Error de conexión');
    updateConnectionStatus('❌');
  };
}

function stopWatching(): void {
  if (spectatorSocket) {
    spectatorSocket.close();
    spectatorSocket = null;
  }
  
  currentGameId = null;
  
  const gameViewer = document.getElementById('game-viewer');
  if (gameViewer) {
    gameViewer.classList.add('hidden');
  }
  
  // Reanudar auto-refresh
  const autoRefreshCheckbox = document.getElementById('auto-refresh-spectator') as HTMLInputElement;
  if (autoRefreshCheckbox?.checked) {
    startAutoRefresh();
  }
  
  // Recargar la lista de partidas
  loadLiveGames();
}

function drawInitialCanvas(): void {
  const canvas = document.getElementById('observerCanvas') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  // Limpiar canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar línea central
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  
  // Mensaje inicial
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Conectando al espectador...', canvas.width / 2, canvas.height / 2);
}

function drawGame(gameState: any): void {
  const canvas = document.getElementById('observerCanvas') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  // Limpiar canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar línea central
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Dibujar palas
  if (gameState.palas) {
    ctx.fillStyle = 'yellow'; // Pala jugador 1
    ctx.fillRect(
      gameState.palas.jugador1.x, 
      gameState.palas.jugador1.y, 
      gameState.palaAncho || 10, 
      gameState.palaAlto || 60
    );
    
    ctx.fillStyle = 'blue'; // Pala jugador 2
    ctx.fillRect(
      gameState.palas.jugador2.x, 
      gameState.palas.jugador2.y, 
      gameState.palaAncho || 10, 
      gameState.palaAlto || 60
    );
  }
  
  // Dibujar pelota
  if (gameState.pelota) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
      gameState.pelota.x, 
      gameState.pelota.y, 
      gameState.pelota.radio || 8, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
  }
}

function updateSpectatorScore(gameState: any): void {
  const score1Element = document.getElementById('spectator-score1');
  const score2Element = document.getElementById('spectator-score2');
  
  if (score1Element && gameState.puntuacion) {
    score1Element.textContent = gameState.puntuacion.jugador1?.toString() || '0';
  }
  if (score2Element && gameState.puntuacion) {
    score2Element.textContent = gameState.puntuacion.jugador2?.toString() || '0';
  }
}

function updateSpectatorStatus(message: string): void {
  const statusElement = document.getElementById('spectator-status');
  if (statusElement) {
    statusElement.innerHTML = `<p>${message}</p>`;
  }
}

function updateConnectionStatus(status: string): void {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.textContent = status;
  }
}

// Funciones requeridas por el router
export function startSpectatorAutoRefresh(): void {
  console.log('👁️ Auto-refresh del espectador iniciado');
  startAutoRefresh();
}

export function stopSpectatorAutoRefresh(): void {
  console.log('👁️ Auto-refresh del espectador detenido');
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

export function cleanupSpectator(): void {
  console.log('👁️ Limpieza del espectador realizada');
  if (spectatorSocket) {
    spectatorSocket.close();
    spectatorSocket = null;
  }
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  currentGameId = null;
}

// Limpiar al salir de la página
window.addEventListener('beforeunload', cleanupSpectator);
