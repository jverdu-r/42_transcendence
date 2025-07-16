import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';

export function renderGameLobby(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el lobby de juego.');
    return;
  }

  // Obtener gameId del sessionStorage
  const gameId = sessionStorage.getItem('currentGameId');
  const gameMode = sessionStorage.getItem('currentGameMode') || 'pvp';
  
  if (!gameId) {
    console.error('No se encontró gameId en sessionStorage');
    navigateTo('/game-online');
    return;
  }

  const currentUser = getCurrentUser();
  const currentUserName = currentUser?.username || 'Usuario';

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold text-center mb-4">🎮 Buscando Oponente</h1>
      <p class="text-center mb-6 text-gray-300">ID de Partida: ${gameId}</p>
      
      <!-- Status de conexión -->
      <div id="connection-status" class="bg-gray-800 rounded-lg p-6 mb-6 text-center">
        <div class="text-yellow-400 font-bold text-xl mb-4">
          🔄 Conectando al servidor...
        </div>
        <div class="text-gray-400">
          Por favor espera mientras te conectamos al juego
        </div>
      </div>

      <!-- Información de jugadores -->
      <div id="players-info" class="bg-gray-800 rounded-lg p-6 mb-6 hidden">
        <h2 class="text-xl font-bold mb-4 text-center">👥 Jugadores en la Partida</h2>
        <div id="players-list" class="grid grid-cols-2 gap-4">
          <!-- Se llenará dinámicamente -->
        </div>
      </div>

      <!-- Tablero de juego (oculto inicialmente) -->
      <div id="game-board" class="hidden">
        <div class="bg-black border-2 border-gray-400 rounded-lg p-4 mb-6">
          <canvas id="gameCanvas" width="600" height="400" class="w-full h-auto bg-black"></canvas>
        </div>
        
        <div class="text-center mb-4">
          <div id="score-container" class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-left">
              <h3 class="text-xl font-bold text-yellow-400" id="score1-title">🟡 Jugador 1</h3>
              <p class="text-2xl font-bold" id="score1">0</p>
            </div>
            <div class="text-right">
              <h3 class="text-xl font-bold text-blue-400" id="score2-title">🔵 Jugador 2</h3>
              <p class="text-2xl font-bold" id="score2">0</p>
            </div>
          </div>
          
          <div id="game-status" class="mb-4">
            <p class="text-green-500">🎮 ¡Juego iniciado! Usa W/S para mover</p>
          </div>
        </div>
      </div>

      <!-- Botones -->
      <div class="text-center">
        <button id="leave-game" class="bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition">
          Salir del Juego
        </button>
      </div>
    </div>
    
    <!-- Winner Modal -->
    <div id="winner-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div id="winner-content" class="mb-6">
          <h2 class="text-3xl font-bold text-blue-600 mb-4">🏆 Juego Terminado</h2>
          <p id="winner-message" class="text-xl mb-4">Mensaje del ganador</p>
          <div id="final-score" class="text-lg text-gray-600 mb-4">Puntuación final</div>
        </div>
        <button id="return-to-lobby" class="bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition">
          Volver al Lobby
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('leave-game')?.addEventListener('click', () => {
    sessionStorage.removeItem('currentGameId');
    sessionStorage.removeItem('currentGameMode');
    navigateTo('/game-online');
  });

  document.getElementById('return-to-lobby')?.addEventListener('click', () => {
    hideWinnerModal();
    sessionStorage.removeItem('currentGameId');
    sessionStorage.removeItem('currentGameMode');
    navigateTo('/game-online');
  });

  // Iniciar conexión al juego
  connectToGameLobby(gameId, gameMode);
}

function connectToGameLobby(gameId: string, gameMode: string): void {
  const statusElement = document.getElementById('connection-status');
  const playersInfo = document.getElementById('players-info');
  const gameBoard = document.getElementById('game-board');
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) {
    console.error('Canvas no encontrado');
    return;
  }

  // Construir URL WebSocket con username
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const currentUser = getCurrentUser();
  const username = encodeURIComponent(currentUser?.username || 'Usuario');
  const wsUrl = `${protocol}//${window.location.host}/pong/${gameId}?username=${username}`;

  console.log('🔗 Conectando al WebSocket:', wsUrl);
  const socket = new WebSocket(wsUrl);
  let playerNumber: number | null = null;
  let jugadoresInfo: any[] = [];

  // Función para actualizar la interfaz con información de jugadores
  function updatePlayersDisplay(): void {
    const playersList = document.getElementById('players-list');
    if (!playersList || jugadoresInfo.length === 0) return;

    const jugador1 = jugadoresInfo.find(j => j.numero === 1);
    const jugador2 = jugadoresInfo.find(j => j.numero === 2);

    let html = '';
    
    if (jugador1) {
      const isCurrentUser = jugador1.username === currentUser?.username;
      html += `
        <div class="bg-yellow-600 rounded-lg p-4 ${isCurrentUser ? 'border-2 border-white' : ''}">
          <h3 class="text-lg font-bold text-white">
            ${isCurrentUser ? '📱 Tú' : '👤 Oponente'}
          </h3>
          <p class="text-yellow-200">${jugador1.username}</p>
          <p class="text-xs text-yellow-200">Jugador 1 - Pala Amarilla</p>
        </div>
      `;
    } else {
      html += `
        <div class="bg-gray-600 rounded-lg p-4">
          <h3 class="text-lg font-bold text-white">🔍 Buscando...</h3>
          <p class="text-gray-300">Esperando jugador</p>
        </div>
      `;
    }

    if (jugador2) {
      const isCurrentUser = jugador2.username === currentUser?.username;
      html += `
        <div class="bg-blue-600 rounded-lg p-4 ${isCurrentUser ? 'border-2 border-white' : ''}">
          <h3 class="text-lg font-bold text-white">
            ${isCurrentUser ? '📱 Tú' : '👤 Oponente'}
          </h3>
          <p class="text-blue-200">${jugador2.username}</p>
          <p class="text-xs text-blue-200">Jugador 2 - Pala Azul</p>
        </div>
      `;
    } else {
      html += `
        <div class="bg-gray-600 rounded-lg p-4">
          <h3 class="text-lg font-bold text-white">🔍 Buscando...</h3>
          <p class="text-gray-300">Esperando jugador</p>
        </div>
      `;
    }

    playersList.innerHTML = html;
  }

  // Función para actualizar nombres en el marcador
  function updateScoreNames(): void {
    const score1Title = document.getElementById('score1-title');
    const score2Title = document.getElementById('score2-title');
    
    if (score1Title && score2Title && jugadoresInfo.length > 0) {
      const jugador1 = jugadoresInfo.find(j => j.numero === 1);
      const jugador2 = jugadoresInfo.find(j => j.numero === 2);
      
      if (jugador1) {
        const isCurrentUser = jugador1.username === currentUser?.username;
        score1Title.innerHTML = `🟡 ${jugador1.username}${isCurrentUser ? ' (Tú)' : ' (Oponente)'}`;
      }
      
      if (jugador2) {
        const isCurrentUser = jugador2.username === currentUser?.username;
        score2Title.innerHTML = `🔵 ${jugador2.username}${isCurrentUser ? ' (Tú)' : ' (Oponente)'}`;
      }
    }
  }

  socket.onopen = () => {
    console.log(`✅ Conectado a la partida ${gameId}`);
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="text-green-400 font-bold text-xl mb-4">
          ✅ Conectado al servidor
        </div>
        <div class="text-gray-400">
          Esperando asignación de jugador...
        </div>
      `;
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📡 Mensaje recibido:', data);
      
      if (data.tipo === 'bienvenida') {
        playerNumber = data.numero;
        jugadoresInfo = data.jugadores || [];
        console.log(`🎮 Soy el jugador ${playerNumber}`, jugadoresInfo);
        
        if (statusElement) {
          statusElement.innerHTML = `
            <div class="text-green-400 font-bold text-xl mb-4">
              ✅ Conectado como Jugador ${playerNumber}
            </div>
            <div class="text-gray-400">
              Esperando más jugadores...
            </div>
          `;
        }
        
        if (playersInfo) {
          playersInfo.classList.remove('hidden');
          updatePlayersDisplay();
        }
      }
      
      if (data.tipo === 'jugadores_actualizados') {
        jugadoresInfo = data.jugadores || [];
        console.log('👥 Jugadores actualizados:', jugadoresInfo);
        updatePlayersDisplay();
      }
      
      if (data.tipo === 'cuenta_atras') {
        if (statusElement) {
          statusElement.innerHTML = `
            <div class="text-orange-400 font-bold text-xl mb-4">
              🔢 Iniciando en ${data.valor}...
            </div>
            <div class="text-gray-400">
              ¡Prepárate para jugar!
            </div>
          `;
        }
      }
      
      if (data.tipo === 'juego_iniciado') {
        console.log('🎮 Juego iniciado!');
        
        // Mostrar tablero y ocultar status
        if (statusElement) statusElement.classList.add('hidden');
        if (gameBoard) gameBoard.classList.remove('hidden');
        
        // Actualizar nombres en el marcador
        updateScoreNames();
        
        // Dibujar canvas inicial
        drawInitialCanvas(ctx);
      }
      
      if (data.tipo === 'estado' && data.juego && ctx) {
        drawGame(ctx, data.juego);
        updateScore(data.juego);
      }
      
      if (data.tipo === 'juego_finalizado') {
        showWinnerModal(data.mensaje, data.juego);
      }
      
      if (data.tipo === 'jugador_desconectado') {
        showWinnerModal('¡Has ganado! Tu oponente se desconectó.', data.juego);
      }
      
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  };

  socket.onclose = () => {
    console.log('❌ Desconectado del juego');
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="text-red-400 font-bold text-xl mb-4">
          ❌ Desconectado del servidor
        </div>
        <div class="text-gray-400">
          Conexión perdida. Intenta reconectar.
        </div>
      `;
    }
  };

  socket.onerror = (error) => {
    console.error('❌ Error en WebSocket:', error);
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="text-red-400 font-bold text-xl mb-4">
          ❌ Error de conexión
        </div>
        <div class="text-gray-400">
          No se pudo conectar al servidor.
        </div>
      `;
    }
  };

  // Controles de teclado
  const keys = { w: false, s: false };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'w' && !keys.w) {
      keys.w = true;
      e.preventDefault();
    }
    if (e.key.toLowerCase() === 's' && !keys.s) {
      keys.s = true;
      e.preventDefault();
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'w') {
      keys.w = false;
      e.preventDefault();
    }
    if (e.key.toLowerCase() === 's') {
      keys.s = false;
      e.preventDefault();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Enviar movimientos
  const moveInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN && playerNumber) {
      if (keys.w) {
        socket.send(JSON.stringify({ tipo: 'mover', y: -8 }));
      }
      if (keys.s) {
        socket.send(JSON.stringify({ tipo: 'mover', y: 8 }));
      }
    }
  }, 16);
  
  // Limpiar eventos al cerrar
  socket.addEventListener('close', () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    clearInterval(moveInterval);
  });
}

function drawInitialCanvas(ctx: CanvasRenderingContext2D): void {
  // Limpiar canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Línea central
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
  
  // Mensaje inicial
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('¡Juego iniciado!', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function drawGame(ctx: CanvasRenderingContext2D, gameState: any): void {
  // Limpiar canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Línea central
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
  
  // Palas
  ctx.fillStyle = 'yellow'; // Pala jugador 1
  ctx.fillRect(gameState.palas.jugador1.x, gameState.palas.jugador1.y, gameState.palaAncho, gameState.palaAlto);
  ctx.fillStyle = 'blue'; // Pala jugador 2
  ctx.fillRect(gameState.palas.jugador2.x, gameState.palas.jugador2.y, gameState.palaAncho, gameState.palaAlto);
  
  // Pelota
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(gameState.pelota.x, gameState.pelota.y, gameState.pelota.radio, 0, Math.PI * 2);
  ctx.fill();
}

function updateScore(gameState: any): void {
  const score1 = document.getElementById('score1');
  const score2 = document.getElementById('score2');
  if (score1) score1.textContent = gameState.puntuacion.jugador1.toString();
  if (score2) score2.textContent = gameState.puntuacion.jugador2.toString();
}

function showWinnerModal(message: string, gameState: any): void {
  const modal = document.getElementById('winner-modal');
  const winnerMessage = document.getElementById('winner-message');
  const finalScore = document.getElementById('final-score');
  
  if (modal && winnerMessage && finalScore) {
    // Extraer información del ganador del mensaje
    const isGameFinished = message.includes('¡Fin de la partida');
    const player1Score = gameState?.puntuacion?.jugador1 || 0;
    const player2Score = gameState?.puntuacion?.jugador2 || 0;
    
    let winner = '';
    let isPlayer1Winner = false;
    
    if (isGameFinished) {
      // Determinar el ganador basado en la puntuación
      isPlayer1Winner = player1Score > player2Score;
      winner = isPlayer1Winner ? 'Jugador 1' : 'Jugador 2';
    } else {
      // Para otros mensajes (como desconexión)
      winner = 'Tú';
      isPlayer1Winner = true;
    }
    
    // Crear mensaje de resultado mejorado con el mismo estilo que el modo local
    const resultMessage = `
      <div class="text-center">
        <div class="text-5xl font-bold text-yellow-600 mb-4">🏆</div>
        <div class="text-3xl font-bold ${isPlayer1Winner ? 'text-blue-700' : 'text-red-700'} mb-4">
          ${winner} Gana!
        </div>
        <div class="text-xl font-semibold text-gray-800 mb-6">Resultado Final</div>
        <div class="bg-white rounded-lg p-6 mb-6 shadow-lg border-2 border-gray-200">
          <div class="flex justify-between items-center text-xl mb-4">
            <span class="font-bold ${isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">Jugador 1</span>
            <span class="font-bold text-3xl ${isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${player1Score}</span>
          </div>
          <div class="border-t-2 border-gray-300 my-4"></div>
          <div class="flex justify-between items-center text-xl">
            <span class="font-bold ${!isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">Jugador 2</span>
            <span class="font-bold text-3xl ${!isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${player2Score}</span>
          </div>
        </div>
        <div class="text-lg font-semibold text-gray-700 bg-yellow-100 p-3 rounded-lg">
          🎉 ${winner} venció por ${Math.max(player1Score, player2Score)} - ${Math.min(player1Score, player2Score)}
        </div>
      </div>
    `;
    
    winnerMessage.innerHTML = resultMessage;
    finalScore.textContent = '';
    modal.classList.remove('hidden');
  }
}

function hideWinnerModal(): void {
  const modal = document.getElementById('winner-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
