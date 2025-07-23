import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';
import { PlayerDisplay, PlayerInfo } from '../components/playerDisplay';

export function renderUnifiedGameOnline(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el juego online.');
    return;
  }

  // Verificar si hay un gameId pendiente en sessionStorage
  const gameId = sessionStorage.getItem('pendingGameId');
  sessionStorage.removeItem('pendingGameId'); // Limpiar después de usar
  
  if (gameId && gameId.trim() !== '') {
    // Si hay gameId, ir directamente a la vista del juego
    console.log(`🎮 Conectando directamente al juego: ${gameId}`);
    showGameView(gameId);
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8 text-center">
      <h1 class="text-4xl font-bold mb-8">Juego Online - Pong</h1>
      <p class="mb-6">Conéctate y juega contra otros jugadores en línea o enfréntate a la IA.</p>
      <div class="space-y-4">
          <button id="create-ai-game" class="w-full bg-green-500 text-white py-2 px-4 rounded-xl hover:bg-green-700 transition">
            Jugar contra la IA
          </button>
          <button id="join-online-game" class="w-full bg-yellow-500 text-white py-2 px-4 rounded-xl hover:bg-yellow-700 transition">
            Jugar Online
          </button>
      </div>
      <button id="back-to-play" class="mt-6 bg-gray-500 text-white font-semibold py-2 px-4 rounded">
        Volver a Selección
      </button>
    </div>
  `;

  document.getElementById('create-ai-game')?.addEventListener('click', () => navigateTo('/game-ai'));
  document.getElementById('join-online-game')?.addEventListener('click', () => navigateTo('/game-select'));
  document.getElementById('back-to-play')?.addEventListener('click', () => navigateTo('/play'));
}

function showGameView(gameId: string): void {
  const content = document.getElementById('page-content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold text-center mb-6">🎮 Partida Online</h1>
      
      <!-- Player Info Section -->
      <div id="player-info" class="bg-gray-800 rounded-lg p-4 mb-6">
        <div id="player-cards" class="mb-4">
          <!-- Las tarjetas se generarán dinámicamente -->
        </div>
        <div id="player-role" class="text-center text-yellow-400 font-bold">
          🔄 Conectando y asignando rol...
        </div>
      </div>
      
      <div class="bg-black border-2 border-gray-400 rounded-lg p-4 mb-6">
        <canvas id="gameCanvas" width="600" height="400" class="w-full h-auto bg-black"></canvas>
      </div>
      
      <div class="text-center mb-4">
        <div id="score-container" class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-left">
            <h3 class="text-xl font-bold text-yellow-400" id="score1-title">🟡 Conectando...</h3>
            <p class="text-2xl font-bold" id="score1">0</p>
          </div>
          <div class="text-right">
            <h3 class="text-xl font-bold text-blue-400" id="score2-title">🔵 Conectando...</h3>
            <p class="text-2xl font-bold" id="score2">0</p>
          </div>
        </div>
        
        <div id="game-status" class="mb-4">
          <p class="text-yellow-500">🔄 Conectando...</p>
        </div>
        
        <div class="space-x-4">
          <button id="leave-game" class="bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-600">Salir del Juego</button>
        </div>
      </div>
      
      <div class="text-center">
        <button id="back-to-play" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600">Volver a Selección</button>
      </div>
    </div>
  `;
  
  document.getElementById('leave-game')?.addEventListener('click', () => {
    navigateTo('/game-select');
  });
  
  document.getElementById('back-to-play')?.addEventListener('click', () => {
    navigateTo('/play');
  });
  
  connectToGame(gameId);
}

function connectToGame(gameId: string): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');
  const statusElement = document.getElementById('game-status');
  
  if (!canvas || !ctx) {
    console.error('Canvas no encontrado');
    return;
  }
  
  if (statusElement) {
    statusElement.innerHTML = '<p class="text-blue-500">🔗 Conectando al WebSocket...</p>';
  }
  
  // Construir URL WebSocket correcta
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const currentUser = getCurrentUser();
  const currentUserName = currentUser?.username || "Usuario";
  const username = encodeURIComponent(currentUserName);
  const wsUrl = `${protocol}//${window.location.host}/pong/${gameId}?username=${username}`;
  
  console.log('🔗 Conectando al WebSocket:', wsUrl);
  const socket = new WebSocket(wsUrl);
  let playerNumber: number | null = null;
  let gameMode: string = 'pvp';
  let player1Info: PlayerInfo | null = null;
  let player2Info: PlayerInfo | null = null;

  socket.onopen = () => {
    console.log(`✅ Conectado a la partida ${gameId}`);
    if (statusElement) {
      statusElement.innerHTML = '<p class="text-green-500">✅ Conectado! Esperando asignación...</p>';
    }
  };

  function updatePlayersInfo(jugadoresInfo: any[]) {
    console.log('📋 Actualizando información de jugadores:', jugadoresInfo);
    
    // Detectar el modo de juego
    const currentUrl = window.location.pathname;
    if (currentUrl.includes('game-ai') || sessionStorage.getItem('gameType') === 'ai') {
      gameMode = 'pve';
    }
    
    // Crear información de jugadores con datos reales
    player1Info = {
      numero: 1,
      username: 'Esperando...',
      displayName: 'Esperando...',
      esIA: false,
      isCurrentUser: playerNumber === 1
    };
    
    player2Info = {
      numero: 2,
      username: gameMode === 'pve' ? 'IA' : 'Esperando...',
      displayName: gameMode === 'pve' ? 'IA' : 'Esperando...',
      esIA: gameMode === 'pve',
      isCurrentUser: playerNumber === 2
    };
    
    // Actualizar con información real de los jugadores
    jugadoresInfo.forEach((jugador: any) => {
      if (jugador.numero === 1) {
        player1Info = {
          numero: 1,
          username: jugador.username || jugador.displayName || 'Jugador 1',
          displayName: jugador.displayName || jugador.username || 'Jugador 1',
          esIA: jugador.esIA || false,
          isCurrentUser: playerNumber === 1
        };
      } else if (jugador.numero === 2) {
        player2Info = {
          numero: 2,
          username: jugador.username || jugador.displayName || (gameMode === 'pve' ? 'IA' : 'Jugador 2'),
          displayName: jugador.displayName || jugador.username || (gameMode === 'pve' ? 'IA' : 'Jugador 2'),
          esIA: jugador.esIA || (gameMode === 'pve'),
          isCurrentUser: playerNumber === 2
        };
      }
    });
    
    // Actualizar la visualización
    if (playerNumber !== null && player1Info && player2Info) {
      updatePlayerDisplay(player1Info, player2Info, playerNumber, gameMode);
    }
    
    // Actualizar el estado según la cantidad de jugadores
    if (statusElement) {
      const currentPlayerName = playerNumber === 1 ? player1Info?.displayName : player2Info?.displayName;
      const opponentName = playerNumber === 1 ? player2Info?.displayName : player1Info?.displayName;
      const side = playerNumber === 1 ? 'izquierda' : 'derecha';
      const sideColor = playerNumber === 1 ? 'amarilla' : 'azul';
      
      if (jugadoresInfo.length === 2) {
        statusElement.innerHTML = `
          <p class="text-green-500 text-lg font-bold">🎮 Eres <span class="text-yellow-300">${currentPlayerName}</span> vs <span class="text-blue-300">${opponentName}</span></p>
          <p class="text-blue-400">📍 Juegas en el lado <strong>${side}</strong> con la pala <strong>${sideColor}</strong></p>
          <p class="text-gray-300">🎯 Controles: <strong>W</strong> (arriba) y <strong>S</strong> (abajo)</p>
        `;
      } else {
        statusElement.innerHTML = `
          <p class="text-yellow-500">⏳ Esperando otro jugador...</p>
          <p class="text-blue-400">📍 Serás el jugador del lado <strong>${side}</strong> con la pala <strong>${sideColor}</strong></p>
        `;
      }
    }
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📡 Mensaje recibido:', data);
      
      if (data.tipo === 'bienvenida') {
        playerNumber = data.numero;
        console.log(`🎮 Soy el jugador ${playerNumber}`);
        
        // Actualizar información de jugadores
        const jugadoresInfo = data.jugadores || [];
        updatePlayersInfo(jugadoresInfo);
      }
      
      if (data.tipo === 'jugadores_actualizados') {
        console.log('🔄 Recibida actualización de jugadores');
        updatePlayersInfo(data.jugadores || []);
      }
      
      if (data.tipo === 'estado' && data.juego && ctx) {
        drawGame(ctx, data.juego);
        updateScore(data.juego);
      }
      
      if (data.tipo === 'estado_general') {
        if (statusElement) {
          if (gameMode === 'pve' && data.estado && data.estado.includes('esperando_jugador')) {
            statusElement.innerHTML = '<p class="text-green-500">🎮 ¡Listo para jugar contra la IA!</p>';
          } else if (data.estado && data.estado.includes('esperando_jugador')) {
            const side = playerNumber === 1 ? 'izquierda' : 'derecha';
            const sideColor = playerNumber === 1 ? 'amarilla' : 'azul';
            statusElement.innerHTML = `
              <p class="text-yellow-500">⏳ Esperando otro jugador...</p>
              <p class="text-blue-400">📍 Serás el jugador del lado <strong>${side}</strong> con la pala <strong>${sideColor}</strong></p>
            `;
          } else {
            statusElement.innerHTML = `<p class="text-yellow-500">⏳ ${data.estado}</p>`;
          }
        }
      }
      
      if (data.tipo === 'cuenta_atras') {
        if (statusElement) {
          const currentPlayerName = playerNumber === 1 ? player1Info?.displayName : player2Info?.displayName;
          const opponentName = playerNumber === 1 ? player2Info?.displayName : player1Info?.displayName;
          const side = playerNumber === 1 ? 'izquierda' : 'derecha';
          const sideColor = playerNumber === 1 ? 'amarilla' : 'azul';
          
          statusElement.innerHTML = `
            <p class="text-orange-500 text-xl font-bold">🔢 Iniciando en ${data.valor}...</p>
            <p class="text-green-500">🎮 <span class="text-yellow-300">${currentPlayerName}</span> vs <span class="text-blue-300">${opponentName}</span></p>
            <p class="text-blue-400">📍 Lado <strong>${side}</strong> - Pala <strong>${sideColor}</strong> - Controles: <strong>W/S</strong></p>
          `;
        }
      }
      
      if (data.tipo === 'juego_iniciado') {
        if (statusElement) {
          const currentPlayerName = playerNumber === 1 ? player1Info?.displayName : player2Info?.displayName;
          const opponentName = playerNumber === 1 ? player2Info?.displayName : player1Info?.displayName;
          const side = playerNumber === 1 ? 'izquierda' : 'derecha';
          const sideColor = playerNumber === 1 ? 'amarilla' : 'azul';
          
          statusElement.innerHTML = `
            <p class="text-green-500 text-lg font-bold">🎮 ¡Juego iniciado!</p>
            <p class="text-green-400"><span class="text-yellow-300">${currentPlayerName}</span> vs <span class="text-blue-300">${opponentName}</span></p>
            <p class="text-blue-400">📍 Lado <strong>${side}</strong> - Pala <strong>${sideColor}</strong> - Usa <strong>W/S</strong> para mover</p>
          `;
        }
      }
      
      if (data.tipo === 'juego_finalizado') {
        console.log('🏆 Juego finalizado recibido:', data);
        showWinnerModal(data.mensaje, data.juego, player1Info, player2Info);
        if (statusElement) {
          statusElement.innerHTML = `<p class="text-blue-500">🏆 ${data.mensaje}</p>`;
        }
      }
      
      if (data.tipo === 'jugador_desconectado') {
        console.log('❌ Jugador desconectado recibido:', data);
        showWinnerModal('¡Has ganado! Tu oponente se desconectó.', data.juego, player1Info, player2Info);
        if (statusElement) {
          statusElement.innerHTML = '<p class="text-red-500">❌ Oponente desconectado</p>';
        }
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  };

  socket.onclose = () => {
    console.log('🔌 Desconectado del WebSocket');
    if (statusElement) {
      statusElement.innerHTML = '<p class="text-red-500">❌ Desconectado</p>';
    }
  };

  socket.onerror = (error) => {
    console.error('❌ Error en WebSocket:', error);
    if (statusElement) {
      statusElement.innerHTML = '<p class="text-red-500">❌ Error de conexión</p>';
    }
  };

  // Configurar controles del teclado
  document.addEventListener('keydown', (e) => {
    if (socket.readyState === WebSocket.OPEN) {
      if (e.key === 'w' || e.key === 'W') {
        socket.send(JSON.stringify({ tipo: 'mover', y: -5 }));
      } else if (e.key === 's' || e.key === 'S') {
        socket.send(JSON.stringify({ tipo: 'mover', y: 5 }));
      }
    }
  });

  // Dibujar canvas inicial
  drawInitialCanvas(ctx);
}

function updatePlayerDisplay(player1: PlayerInfo, player2: PlayerInfo, playerNumber: number, gameMode: string): void {
  const playerCardsContainer = document.getElementById('player-cards');
  const playerRoleElement = document.getElementById('player-role');
  const score1TitleElement = document.getElementById('score1-title');
  const score2TitleElement = document.getElementById('score2-title');
  
  if (playerCardsContainer) {
    const playerCardsHtml = PlayerDisplay.generatePlayerCards(player1, player2, 'online');
    playerCardsContainer.innerHTML = playerCardsHtml;
  }
  
  if (playerRoleElement) {
    const currentPlayer = playerNumber === 1 ? player1 : player2;
    const opponent = playerNumber === 1 ? player2 : player1;
    const playerRoleHtml = PlayerDisplay.generatePlayerRoleInfo(currentPlayer, opponent, 'online');
    playerRoleElement.innerHTML = playerRoleHtml;
  }
  
  if (score1TitleElement && score2TitleElement) {
    const scoreTitles = PlayerDisplay.generateScoreTitles(player1, player2, playerNumber);
    score1TitleElement.innerHTML = scoreTitles.player1Title;
    score2TitleElement.innerHTML = scoreTitles.player2Title;
  }
}

function drawInitialCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
  
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Esperando jugadores...', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function drawGame(ctx: CanvasRenderingContext2D, gameData: any): void {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.strokeStyle = 'white';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
  
  ctx.fillStyle = 'white';
  ctx.setLineDash([]);
  
  ctx.fillRect(
    gameData.palas.jugador1.x,
    gameData.palas.jugador1.y,
    gameData.palaAncho,
    gameData.palaAlto
  );
  
  ctx.fillRect(
    gameData.palas.jugador2.x,
    gameData.palas.jugador2.y,
    gameData.palaAncho,
    gameData.palaAlto
  );
  
  ctx.beginPath();
  ctx.arc(gameData.pelota.x, gameData.pelota.y, gameData.pelota.radio, 0, 2 * Math.PI);
  ctx.fill();
}

function updateScore(gameData: any): void {
  const score1Element = document.getElementById('score1');
  const score2Element = document.getElementById('score2');
  
  if (score1Element) {
    score1Element.textContent = gameData.puntuacion.jugador1.toString();
  }
  if (score2Element) {
    score2Element.textContent = gameData.puntuacion.jugador2.toString();
  }
}

function showWinnerModal(message: string, gameData: any, player1Info: PlayerInfo | null, player2Info: PlayerInfo | null): void {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const player1Name = player1Info?.displayName || 'Jugador 1';
  const player2Name = player2Info?.displayName || 'Jugador 2';
  
  // Asegurar que gameData tenga puntuaciones válidas
  const puntuacion1 = gameData?.puntuacion?.jugador1 || 0;
  const puntuacion2 = gameData?.puntuacion?.jugador2 || 0;
  
  console.log('📊 Datos del juego final:', gameData);
  console.log('🏆 Puntuaciones:', { jugador1: puntuacion1, jugador2: puntuacion2 });
  
  modal.innerHTML = `
    u003cdiv class="bg-white rounded-lg p-8 max-w-md w-full mx-4"u003e
      u003ch2 class="text-2xl font-bold mb-4 text-center text-gray-800"u003e🏆 Juego Terminadou003c/h2u003e
      u003cp class="text-center mb-6 text-gray-600"u003e${message}u003c/pu003e
      u003cdiv class="text-center mb-6"u003e
        u003cp class="text-lg font-semibold mb-2 text-gray-800"u003ePuntuación Final:u003c/pu003e
        u003cdiv class="bg-gray-100 rounded-lg p-4"u003e
          u003cp class="text-xl font-bold text-yellow-600 mb-2"u003e
            🟡 ${player1Name}: ${puntuacion1}
          u003c/pu003e
          u003cp class="text-xl font-bold text-blue-600"u003e
            🔵 ${player2Name}: ${puntuacion2}
          u003c/pu003e
        u003c/divu003e
      u003c/divu003e
      u003cdiv class="flex justify-center space-x-4"u003e
        u003cbutton id="play-again" class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"u003e
          Jugar de Nuevo
        u003c/buttonu003e
        u003cbutton id="back-to-lobby" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"u003e
          Volver al Lobby
        u003c/buttonu003e
      u003c/divu003e
    u003c/divu003e
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('play-again')?.addEventListener('click', () => {
    document.body.removeChild(modal);
    navigateTo('/game-online');
  });
  
  document.getElementById('back-to-lobby')?.addEventListener('click', () => {
    document.body.removeChild(modal);
    navigateTo('/play');
  });
}
