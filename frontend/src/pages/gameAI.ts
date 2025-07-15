import { navigateTo } from '../router';

export function renderGameAI(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el juego contra IA.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8 text-center">
      <h1 class="text-4xl font-bold mb-8">🤖 Juego vs IA - Pong</h1>
      <p class="mb-6">Enfréntate a la inteligencia artificial en una partida de Pong.</p>
      
      <div class="space-y-4 mb-8">
        <div class="bg-gray-800 rounded-lg p-4">
          <h3 class="text-xl font-bold mb-2">Selecciona la dificultad:</h3>
          <div class="space-x-4">
            <button id="easy-ai" class="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition">
              Fácil
            </button>
            <button id="medium-ai" class="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition">
              Medio
            </button>
            <button id="hard-ai" class="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition">
              Difícil
            </button>
          </div>
        </div>
      </div>
      
      <button id="back-to-online" class="mt-6 bg-gray-500 text-white font-semibold py-2 px-4 rounded">
        ← Volver a Juego Online
      </button>
    </div>
  `;

  document.getElementById('easy-ai')?.addEventListener('click', () => createAIGame('easy'));
  document.getElementById('medium-ai')?.addEventListener('click', () => createAIGame('medium'));
  document.getElementById('hard-ai')?.addEventListener('click', () => createAIGame('hard'));
  document.getElementById('back-to-online')?.addEventListener('click', () => navigateTo('/game-online'));
}

async function createAIGame(difficulty: string): Promise<void> {
  try {
    console.log(`🎮 Creando partida vs IA (${difficulty})...`);
    
    // Primero crear la partida
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: `Online vs IA (${difficulty})`, gameMode: 'pve', maxPlayers: 2 })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const game = await response.json();
    console.log('✅ Partida creada:', game);
    
    // El backend ya agrega automáticamente la IA para partidas PvE
    // Pero vamos a asegurar que la IA esté configurada con la dificultad correcta
    await fetch(`/api/games/${game.id}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: 2, difficulty: difficulty })
    });
    
    // Dar un pequeño delay para que la IA se configure
    setTimeout(async () => {
      // Iniciar la partida
      const startResponse = await fetch(`/api/games/${game.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (startResponse.ok) {
        console.log('🎮 Partida iniciada con IA');
        
        // Guardar gameId y tipo de juego para usar en gameOnline
        sessionStorage.setItem('pendingGameId', game.id);
        sessionStorage.setItem('gameType', 'ai');
        navigateTo('/game-online');
      } else {
        console.error('Error iniciando partida:', await startResponse.text());
        alert('Error iniciando la partida. Intenta nuevamente.');
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Error creando la partida:', error);
    alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
