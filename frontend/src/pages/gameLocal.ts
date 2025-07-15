import { navigateTo } from '../router';
import { getCurrentUser } from '../auth';
import { saveGameStats, createGameStats } from '../utils/gameStats';

export function renderGameLocal(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el juego local.');
    return;
  }

  // Obtener usuario actual
  const currentUser = getCurrentUser();
  const player1Name = currentUser?.username || 'Jugador 1';
  const player2Name = 'Oponente'; // En juego local, el segundo jugador será siempre "Jugador 2"

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold text-center mb-8">Juego Local - Pong</h1>
      
      <div class="bg-black border-2 border-gray-400 rounded-lg p-4 mb-6">
        <canvas id="pongCanvas" width="600" height="400" class="w-full h-auto bg-black"></canvas>
      </div>
      
      <div class="text-center mb-4">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-left">
            <h3 class="text-xl font-bold" id="player1-name">${player1Name}</h3>
            <p class="text-gray-400">Teclas: W (arriba), S (abajo)</p>
            <p class="text-2xl font-bold text-blue-500" id="score1">0</p>
          </div>
          <div class="text-right">
            <h3 class="text-xl font-bold" id="player2-name">${player2Name}</h3>
            <p class="text-gray-400">Teclas: ↑ (arriba), ↓ (abajo)</p>
            <p class="text-2xl font-bold text-red-500" id="score2">0</p>
          </div>
        </div>
        
        <div class="space-x-4">
          <button id="start-game" class="bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600">Iniciar Juego</button>
          <button id="pause-game" class="bg-yellow-500 text-white font-semibold py-2 px-4 rounded hover:bg-yellow-600">Pausar</button>
          <button id="reset-game" class="bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-600">Reiniciar</button>
        </div>
      </div>
      
      <div class="text-center">
        <button id="back-to-play" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600">Volver a Selección</button>
      </div>
      
      <!-- Modal para mostrar el resultado del juego -->
      <div id="game-result-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 max-w-lg w-full mx-4 text-center shadow-2xl border-2 border-blue-200">
          <div id="game-result-content" class="mb-6"></div>
          <div class="space-x-4">
            <button id="play-again" class="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg">
              🎮 Jugar de Nuevo
            </button>
            <button id="close-modal" class="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg">
              ❌ Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inicializar el juego local
  initLocalGame(player1Name, player2Name);

  document.getElementById('back-to-play')?.addEventListener('click', () => navigateTo('/play'));
}

function initLocalGame(player1Name: string, player2Name: string): void {
  const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('No se pudo obtener el contexto del canvas.');
    return;
  }

  // Estado del juego
  let gameRunning = false;
  let gameStartTime: Date | null = null;
  let animationId: number;
  const maxScore = 5; // Puntuación máxima para ganar
  
  const gameState = {
    ball: { x: 300, y: 200, vx: 5, vy: 3, radius: 10 },
    paddles: {
      left: { x: 20, y: 160, width: 15, height: 80 },
      right: { x: 565, y: 160, width: 15, height: 80 }
    },
    score: { left: 0, right: 0 },
    keys: {
      w: false, s: false,
      ArrowUp: false, ArrowDown: false
    }
  };

  // Eventos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key in gameState.keys) {
      gameState.keys[e.key as keyof typeof gameState.keys] = true;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key in gameState.keys) {
      gameState.keys[e.key as keyof typeof gameState.keys] = false;
    }
  });

  // Funciones del juego
  function updatePaddles(): void {
    const speed = 5;
    
    // Jugador 1 (izquierda)
    if (gameState.keys.w && gameState.paddles.left.y > 0) {
      gameState.paddles.left.y -= speed;
    }
    if (gameState.keys.s && gameState.paddles.left.y < canvas.height - gameState.paddles.left.height) {
      gameState.paddles.left.y += speed;
    }
    
    // Jugador 2 (derecha)
    if (gameState.keys.ArrowUp && gameState.paddles.right.y > 0) {
      gameState.paddles.right.y -= speed;
    }
    if (gameState.keys.ArrowDown && gameState.paddles.right.y < canvas.height - gameState.paddles.right.height) {
      gameState.paddles.right.y += speed;
    }
  }

  function updateBall(): void {
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;
    
    // Rebote en paredes superior e inferior
    if (gameState.ball.y <= gameState.ball.radius || gameState.ball.y >= canvas.height - gameState.ball.radius) {
      gameState.ball.vy *= -1;
    }
    
    // Colisión con palas
    const leftPaddle = gameState.paddles.left;
    const rightPaddle = gameState.paddles.right;
    
    if (gameState.ball.x <= leftPaddle.x + leftPaddle.width &&
        gameState.ball.y >= leftPaddle.y &&
        gameState.ball.y <= leftPaddle.y + leftPaddle.height &&
        gameState.ball.vx < 0) {
      gameState.ball.vx *= -1;
    }
    
    if (gameState.ball.x >= rightPaddle.x &&
        gameState.ball.y >= rightPaddle.y &&
        gameState.ball.y <= rightPaddle.y + rightPaddle.height &&
        gameState.ball.vx > 0) {
      gameState.ball.vx *= -1;
    }
    
    // Puntuación
    if (gameState.ball.x < 0) {
      gameState.score.right++;
      resetBall();
      updateScore();
      checkGameEnd();
    } else if (gameState.ball.x > canvas.width) {
      gameState.score.left++;
      resetBall();
      updateScore();
      checkGameEnd();
    }
  }

  function checkGameEnd(): void {
    if (gameState.score.left >= maxScore || gameState.score.right >= maxScore) {
      gameRunning = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      showGameResult();
    }
  }

  function resetBall(): void {
    gameState.ball.x = canvas.width / 2;
    gameState.ball.y = canvas.height / 2;
    gameState.ball.vx = Math.random() > 0.5 ? 5 : -5;
    gameState.ball.vy = (Math.random() - 0.5) * 6;
  }

  function updateScore(): void {
    const score1 = document.getElementById('score1');
    const score2 = document.getElementById('score2');
    if (score1) score1.textContent = gameState.score.left.toString();
    if (score2) score2.textContent = gameState.score.right.toString();
  }

  function draw(): void {
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
    ctx.fillRect(gameState.paddles.left.x, gameState.paddles.left.y, gameState.paddles.left.width, gameState.paddles.left.height);
    ctx.fillRect(gameState.paddles.right.x, gameState.paddles.right.y, gameState.paddles.right.width, gameState.paddles.right.height);
    
    // Dibujar pelota
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function gameLoop(): void {
    if (!gameRunning) return;
    
    updatePaddles();
    updateBall();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
  }

  function startGame(): void {
    if (!gameStartTime) {
      gameStartTime = new Date();
    }
    gameRunning = true;
    gameLoop();
  }

  function pauseGame(): void {
    gameRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  }

  function resetGame(): void {
    pauseGame();
    gameState.score.left = 0;
    gameState.score.right = 0;
    gameStartTime = null;
    resetBall();
    updateScore();
    draw();
  }

  async function showGameResult(): Promise<void> {
    const gameEndTime = new Date();
    const winner = gameState.score.left > gameState.score.right ? player1Name : player2Name;
    const loser = gameState.score.left > gameState.score.right ? player2Name : player1Name;
    const winnerScore = Math.max(gameState.score.left, gameState.score.right);
    const loserScore = Math.min(gameState.score.left, gameState.score.right);
    const isPlayer1Winner = gameState.score.left > gameState.score.right;

    // Crear mensaje de resultado mejorado con colores vibrantes
    const resultMessage = `
      <div class="text-center">
        <div class="text-5xl font-bold text-yellow-600 mb-4">🏆</div>
        <div class="text-3xl font-bold ${isPlayer1Winner ? 'text-blue-700' : 'text-red-700'} mb-4">
          ${winner} Gana!
        </div>
        <div class="text-xl font-semibold text-gray-800 mb-6">Resultado Final</div>
        <div class="bg-white rounded-lg p-6 mb-6 shadow-lg border-2 border-gray-200">
          <div class="flex justify-between items-center text-xl mb-4">
            <span class="font-bold ${isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${player1Name}</span>
            <span class="font-bold text-3xl ${isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${gameState.score.left}</span>
          </div>
          <div class="border-t-2 border-gray-300 my-4"></div>
          <div class="flex justify-between items-center text-xl">
            <span class="font-bold ${!isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${player2Name}</span>
            <span class="font-bold text-3xl ${!isPlayer1Winner ? 'text-green-600' : 'text-gray-600'}">${gameState.score.right}</span>
          </div>
        </div>
        <div class="text-lg font-semibold text-gray-700 bg-yellow-100 p-3 rounded-lg">
          🎉 ${winner} venció a ${loser} por ${winnerScore} - ${loserScore}
        </div>
      </div>
    `;

    // Mostrar modal con resultado
    const modal = document.getElementById('game-result-modal');
    const content = document.getElementById('game-result-content');
    if (modal && content) {
      content.innerHTML = resultMessage;
      modal.classList.remove('hidden');
    }

    // Guardar estadísticas en la base de datos
    if (gameStartTime) {
      const stats = createGameStats(
        player1Name,
        player2Name,
        gameState.score.left,
        gameState.score.right,
        'local',
        gameStartTime,
        gameEndTime
      );
      
      const saved = await saveGameStats(stats);
      if (saved) {
        console.log('Estadísticas guardadas exitosamente');
      } else {
        console.warn('No se pudieron guardar las estadísticas del juego');
      }
    }
  }

  // Event listeners para botones
  document.getElementById('start-game')?.addEventListener('click', startGame);
  document.getElementById('pause-game')?.addEventListener('click', pauseGame);
  document.getElementById('reset-game')?.addEventListener('click', resetGame);

  // Event listeners para modal
  document.getElementById('play-again')?.addEventListener('click', () => {
    const modal = document.getElementById('game-result-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    resetGame();
  });

  document.getElementById('close-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('game-result-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  // Dibujar estado inicial
  draw();
}
