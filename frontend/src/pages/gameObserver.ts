import { navigateTo } from '../router';

export function renderGameObserver(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el observador de juego.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold text-center mb-8">Observar Partidas</h1>
      
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-bold mb-4">Partidas Disponibles</h2>
        <div id="games-list" class="space-y-2">
          <!-- Lista de partidas se cargará aquí -->
        </div>
      </div>
      
      <div id="game-viewer" class="bg-black border-2 border-gray-400 rounded-lg p-4 mb-6 hidden">
        <canvas id="observerCanvas" width="600" height="400" class="w-full h-auto bg-black"></canvas>
        <div class="text-center mt-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-left">
              <p class="text-lg font-bold">Jugador 1: <span id="obs-score1">0</span></p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold">Jugador 2: <span id="obs-score2">0</span></p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center">
        <button id="refresh-games" class="bg-green-500 text-white font-semibold py-2 px-4 rounded mr-4">
          Actualizar Lista
        </button>
        <button id="back-to-play" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded">
          Volver a Selección
        </button>
      </div>
    </div>
  `;

  // Inicializar observador
  initGameObserver();

  document.getElementById('back-to-play')?.addEventListener('click', () => navigateTo('/play'));
}

function initGameObserver(): void {
  let socket: WebSocket | null = null;
  let currentGameId: string | null = null;
  
  const canvas = document.getElementById('observerCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('No se pudo obtener el contexto del canvas.');
    return;
  }

  async function loadGames(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8002/api/games');
      const data = await response.json();
      
      const gamesList = document.getElementById('games-list');
      if (!gamesList) return;
      
      gamesList.innerHTML = '';
      
      if (data.games && data.games.length > 0) {
        data.games.forEach((game: any) => {
          const gameElement = document.createElement('div');
          gameElement.className = 'bg-gray-700 p-4 rounded cursor-pointer hover:bg-gray-600';
          gameElement.innerHTML = `
            <h3 class="font-bold">${game.nombre}</h3>
            <p class="text-sm text-gray-300">Jugadores: ${game.jugadoresConectados}/${game.capacidadMaxima}</p>
            <p class="text-sm text-gray-300">Estado: ${game.enJuego ? 'En juego' : 'Esperando'}</p>
            <p class="text-sm text-gray-300">Modo: ${game.gameMode}</p>
            <p class="text-sm text-gray-300">Puntuación: ${game.puntuacion.jugador1} - ${game.puntuacion.jugador2}</p>
          `;
          
          gameElement.addEventListener('click', () => observeGame(game.id));
          gamesList.appendChild(gameElement);
        });
      } else {
        gamesList.innerHTML = '<p class="text-gray-400">No hay partidas disponibles</p>';
      }
    } catch (error) {
      console.error('Error al cargar partidas:', error);
    }
  }

  function observeGame(gameId: string): void {
    if (socket) {
      socket.close();
    }

    currentGameId = gameId;
    
    // Mostrar el canvas del observador
    const gameViewer = document.getElementById('game-viewer');
    if (gameViewer) {
      gameViewer.classList.remove('hidden');
    }

    // Conectar al WebSocket del observador
    socket = new WebSocket(`ws://localhost:8002/observar`);
    
    socket.onopen = () => {
      console.log('Conectado al WebSocket del observador');
      if (socket) {
        socket.send(JSON.stringify({
          tipo: 'seleccionar_partida',
          partidaId: gameId
        }));
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.tipo === 'estado_partida_observada') {
        drawGame(data.juego);
      } else if (data.tipo === 'error') {
        console.error('Error del observador:', data.mensaje);
      }
    };

    socket.onclose = () => {
      console.log('Desconectado del WebSocket del observador');
    };

    socket.onerror = (error) => {
      console.error('Error en WebSocket del observador:', error);
    };
  }

  function drawGame(gameState: any): void {
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
    
    // Dibujar palas
    ctx.fillStyle = 'white';
    ctx.fillRect(gameState.palas.jugador1.x, gameState.palas.jugador1.y, gameState.palaAncho, gameState.palaAlto);
    ctx.fillRect(gameState.palas.jugador2.x, gameState.palas.jugador2.y, gameState.palaAncho, gameState.palaAlto);
    
    // Dibujar pelota
    ctx.beginPath();
    ctx.arc(gameState.pelota.x, gameState.pelota.y, gameState.pelota.radio, 0, Math.PI * 2);
    ctx.fill();
    
    // Actualizar puntuación
    const score1 = document.getElementById('obs-score1');
    const score2 = document.getElementById('obs-score2');
    if (score1) score1.textContent = gameState.puntuacion.jugador1.toString();
    if (score2) score2.textContent = gameState.puntuacion.jugador2.toString();
  }

  // Event listeners
  document.getElementById('refresh-games')?.addEventListener('click', loadGames);

  // Cargar partidas inicialmente
  loadGames();
}
