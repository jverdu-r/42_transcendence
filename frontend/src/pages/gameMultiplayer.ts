import { navigateTo } from '../router';

export function renderGameMultiplayer(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el juego multijugador.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8 text-center">
      <h1 class="text-4xl font-bold mb-8">🌍 Juego Multijugador - Pong</h1>
      <p class="mb-6">Crea una partida multijugador y espera a que se una otro jugador.</p>
      
      <div class="space-y-4 mb-8">
        <div class="bg-gray-800 rounded-lg p-4">
          <h3 class="text-xl font-bold mb-2">Crear Partida Multijugador</h3>
          <p class="text-gray-400 mb-4">Se creará una partida y esperarás a que se una otro jugador.</p>
          <button id="create-multiplayer" class="bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition font-semibold">
            🎮 Crear Partida
          </button>
        </div>
      </div>
      
      <button id="back-to-online" class="mt-6 bg-gray-500 text-white font-semibold py-2 px-4 rounded">
        ← Volver a Juego Online
      </button>
    </div>
  `;

  document.getElementById('create-multiplayer')?.addEventListener('click', createMultiplayerGame);
  document.getElementById('back-to-online')?.addEventListener('click', () => navigateTo('/game-online'));
}

async function createMultiplayerGame(): Promise<void> {
  try {
    console.log('🌐 Creando partida multijugador...');
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Multijugador', gameMode: 'pvp', maxPlayers: 2 })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    console.log('✅ Partida multijugador creada:', game);
    
    alert(`✅ Partida multijugador creada!\nID: ${game.id}\nEsperando a que se una otro jugador...\n\nConectando al lobby...`);
    
    // Guardar gameId y tipo de juego para usar en gameOnline
    sessionStorage.setItem('pendingGameId', game.id);
    sessionStorage.setItem('gameType', 'multiplayer');
    navigateTo('/game-online');
  } catch (error) {
    console.error('❌ Error creando partida multijugador:', error);
    alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
