import { navigateTo } from '../router';

export function renderGameSelect(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar la selección de partidas.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-6xl mx-auto p-8">
      <h1 class="text-4xl font-bold text-center mb-8">🎮 Seleccionar Partida</h1>
      <p class="text-center mb-8 text-gray-300">Elige una partida disponible para unirte o crea una nueva</p>
      
      <div class="mb-8 flex justify-center space-x-4">
        <button id="refresh-games" class="bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-600 transition">
          🔄 Actualizar Lista
        </button>
        <button id="create-new-game" class="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition">
          ➕ Crear Nueva Partida
        </button>
      </div>

      <div id="games-container" class="space-y-4">
        <div class="text-center">
          <p class="text-gray-400">🔄 Cargando partidas disponibles...</p>
        </div>
      </div>

      <div class="text-center mt-8">
        <button id="back-to-online" class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600 transition">
          ← Volver al Menú Online
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('refresh-games')?.addEventListener('click', loadAvailableGames);
  document.getElementById('create-new-game')?.addEventListener('click', createNewGame);
  document.getElementById('back-to-online')?.addEventListener('click', () => navigateTo('/game-online'));

  // Cargar partidas al inicializar
  loadAvailableGames();
}

async function loadAvailableGames(): Promise<void> {
  const gamesContainer = document.getElementById('games-container');
  if (!gamesContainer) return;

  try {
    gamesContainer.innerHTML = `
      <div class="text-center">
        <p class="text-gray-400">🔄 Cargando partidas disponibles...</p>
      </div>
    `;

    const response = await fetch('/api/games');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const availableGames = data.games.filter((g: any) => 
      g.jugadoresConectados < g.capacidadMaxima && !g.enJuego
    );

    if (availableGames.length === 0) {
      gamesContainer.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-8 text-center">
          <h3 class="text-2xl font-bold text-gray-300 mb-4">😔 No hay partidas disponibles</h3>
          <p class="text-gray-400 mb-6">No se encontraron partidas disponibles para unirse.</p>
          <button id="create-first-game" class="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition">
            🎮 Crear Primera Partida
          </button>
        </div>
      `;
      
      document.getElementById('create-first-game')?.addEventListener('click', createNewGame);
      return;
    }

    // Renderizar partidas disponibles
    gamesContainer.innerHTML = availableGames.map((game: any) => `
      <div class="bg-gray-800 rounded-lg p-6 border-2 border-gray-600 hover:border-blue-500 transition">
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white mb-2">
              🎮 ${game.nombre || `Partida ${game.id.substring(0, 8)}`}
            </h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-400">👥 Jugadores:</span>
                <span class="text-white font-semibold">${game.jugadoresConectados}/${game.capacidadMaxima}</span>
              </div>
              <div>
                <span class="text-gray-400">🎯 Modo:</span>
                <span class="text-white font-semibold">${game.gameMode === 'pvp' ? 'PvP' : 'PvE'}</span>
              </div>
              <div>
                <span class="text-gray-400">⏱️ Estado:</span>
                <span class="text-yellow-400 font-semibold">
                  ${game.enJuego ? '🎮 En Juego' : '⏳ Esperando'}
                </span>
              </div>
              <div>
                <span class="text-gray-400">🆔 ID:</span>
                <span class="text-white font-mono text-xs">${game.id.substring(0, 8)}...</span>
              </div>
            </div>
          </div>
          <div class="ml-6">
            <button 
              class="join-game-btn bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-600 transition"
              data-game-id="${game.id}"
              ${game.jugadoresConectados >= game.capacidadMaxima ? 'disabled' : ''}
            >
              ${game.jugadoresConectados >= game.capacidadMaxima ? '🚫 Llena' : '➡️ Unirse'}
            </button>
          </div>
        </div>
      </div>
    `).join('');

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
      <div class="bg-red-800 rounded-lg p-6 text-center">
        <h3 class="text-xl font-bold text-red-200 mb-2">❌ Error al cargar partidas</h3>
        <p class="text-red-300 mb-4">${error instanceof Error ? error.message : 'Error desconocido'}</p>
        <button id="retry-load" class="bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-700 transition">
          🔄 Reintentar
        </button>
      </div>
    `;
    
    document.getElementById('retry-load')?.addEventListener('click', loadAvailableGames);
  }
}

async function createNewGame(): Promise<void> {
  try {
    console.log('🌐 Creando nueva partida multijugador...');
    
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nombre: `Partida ${new Date().toLocaleTimeString()}`, 
        gameMode: 'pvp', 
        maxPlayers: 2 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    console.log('✅ Partida creada:', game);
    
    alert(`✅ Partida creada exitosamente!
ID: ${game.id}
Nombre: ${game.nombre || 'Sin nombre'}

Conectando al juego...`);
    
    // Guardar gameId en sessionStorage y navegar
    sessionStorage.setItem('currentGameId', game.id);
    sessionStorage.setItem('currentGameMode', 'pvp');
    navigateTo('/game-lobby');
    
  } catch (error) {
    console.error('❌ Error creando partida:', error);
    alert(`❌ Error creando partida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

async function joinGame(gameId: string): Promise<void> {
  try {
    console.log(`🔗 Uniéndose a la partida ${gameId}...`);
    
    // Verificar que la partida aún esté disponible
    const response = await fetch(`/api/games/${gameId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    
    if (game.jugadoresConectados >= game.capacidadMaxima) {
      alert('❌ La partida está llena. Intenta con otra partida.');
      loadAvailableGames(); // Recargar la lista
      return;
    }
    
    if (game.enJuego) {
      alert('❌ La partida ya está en progreso. Intenta con otra partida.');
      loadAvailableGames(); // Recargar la lista
      return;
    }
    
    console.log('✅ Uniéndose a la partida:', game);
    
    alert(`✅ Uniéndose a la partida!
ID: ${game.id}
Jugadores: ${game.jugadoresConectados}/${game.capacidadMaxima}

Conectando al juego...`);
    
    // Guardar gameId en sessionStorage y navegar
    sessionStorage.setItem('currentGameId', gameId);
    sessionStorage.setItem('currentGameMode', 'pvp');
    navigateTo('/game-lobby');
    
  } catch (error) {
    console.error('❌ Error uniéndose a la partida:', error);
    alert(`❌ Error uniéndose a la partida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
