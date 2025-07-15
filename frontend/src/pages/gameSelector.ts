import { navigateTo } from '../router';

export function renderGameSelector(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el selector de partidas.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-4xl font-bold mb-8 text-center">🎮 Seleccionar Partida</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Lista de partidas disponibles -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-2xl font-bold mb-4 text-center">Partidas Disponibles</h2>
          <div id="games-list" class="space-y-2 mb-4">
            <p class="text-center text-gray-400">🔄 Cargando partidas...</p>
          </div>
          <button id="refresh-games" class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition">
            🔄 Actualizar Lista
          </button>
        </div>
        
        <!-- Unirse por ID -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-2xl font-bold mb-4 text-center">Unirse por ID</h2>
          <div class="space-y-4">
            <div>
              <label for="game-id-input" class="block text-sm font-medium mb-2">ID de la Partida:</label>
              <input 
                id="game-id-input" 
                type="text" 
                placeholder="Ingresa el ID de la partida"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
            </div>
            <button id="join-by-id" class="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition">
              🔗 Unirse a la Partida
            </button>
          </div>
        </div>
      </div>
      
      <div class="text-center mt-8">
        <button id="back-to-online" class="bg-gray-500 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600 transition">
          ← Volver al Menú Online
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('refresh-games')?.addEventListener('click', loadAvailableGames);
  document.getElementById('join-by-id')?.addEventListener('click', joinGameById);
  document.getElementById('back-to-online')?.addEventListener('click', () => navigateTo('/game-online'));
  
  // Enter key en el input para unirse
  document.getElementById('game-id-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinGameById();
    }
  });

  // Cargar partidas al renderizar
  loadAvailableGames();
  
  // Auto-actualizar cada 5 segundos
  const autoRefresh = setInterval(loadAvailableGames, 5000);
  
  // Limpiar intervalo cuando se cambie de página
  window.addEventListener('beforeunload', () => clearInterval(autoRefresh));
}

async function loadAvailableGames(): Promise<void> {
  const gamesList = document.getElementById('games-list');
  if (!gamesList) return;

  try {
    gamesList.innerHTML = '<p class="text-center text-gray-400">🔄 Cargando partidas...</p>';
    
    const response = await fetch('/api/games');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const availableGames = data.games.filter((g: any) => g.jugadoresConectados < g.capacidadMaxima);
    
    if (availableGames.length === 0) {
      gamesList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-400 mb-2">😔 No hay partidas disponibles</p>
          <p class="text-sm text-gray-500">Crea una nueva partida para comenzar</p>
        </div>
      `;
      return;
    }
    
    gamesList.innerHTML = availableGames.map((game: any) => `
      <div class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-lg">${game.nombre}</h3>
            <p class="text-sm text-gray-300">ID: ${game.id}</p>
            <p class="text-sm text-gray-300">
              Jugadores: ${game.jugadoresConectados}/${game.capacidadMaxima}
            </p>
            <p class="text-sm text-gray-300">
              Modo: ${game.gameMode === 'pve' ? '🤖 vs IA' : '👥 Multijugador'}
            </p>
            <p class="text-sm text-gray-300">
              Estado: ${game.enJuego ? '🎮 En Juego' : '⏳ Esperando'}
            </p>
          </div>
          <button 
            onclick="joinGame('${game.id}')" 
            class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
          >
            🔗 Unirse
          </button>
        </div>
      </div>
    `).join('');
    
    // Agregar función global para unirse
    (window as any).joinGame = (gameId: string) => {
      console.log('🔗 Uniéndose a partida:', gameId);
      navigateTo(`/game-online?gameId=${gameId}`);
    };
    
  } catch (error) {
    console.error('❌ Error cargando partidas:', error);
    gamesList.innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-400 mb-2">❌ Error cargando partidas</p>
        <p class="text-sm text-gray-500">${error instanceof Error ? error.message : 'Error desconocido'}</p>
      </div>
    `;
  }
}

async function joinGameById(): Promise<void> {
  const input = document.getElementById('game-id-input') as HTMLInputElement;
  const gameId = input?.value.trim();
  
  if (!gameId) {
    alert('❌ Por favor ingresa un ID de partida válido');
    return;
  }
  
  try {
    // Verificar que la partida existe
    const response = await fetch(`/api/games/${gameId}`);
    if (!response.ok) {
      if (response.status === 404) {
        alert('❌ No se encontró una partida con ese ID');
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    
    if (game.jugadoresConectados >= game.capacidadMaxima) {
      alert('❌ La partida está llena');
      return;
    }
    
    console.log('🔗 Uniéndose a partida por ID:', gameId);
    navigateTo(`/game-online?gameId=${gameId}`);
    
  } catch (error) {
    console.error('❌ Error verificando partida:', error);
    alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
