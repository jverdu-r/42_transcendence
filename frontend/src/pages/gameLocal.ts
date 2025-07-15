import { navigateTo } from '../router';

export function renderGameLocal(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el juego local.');
    return;
  }

  content.innerHTML = `
    <div class="w-full max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold text-center mb-8">Juego Local - Pong</h1>
      
      <div class="bg-black border-2 border-gray-400 rounded-lg p-4 mb-6">
        <canvas id="pongCanvas" width="600" height="400" class="w-full h-auto bg-black"></canvas>
      </div>
      
      <div class="text-center mb-4">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-left">
            <h3 class="text-xl font-bold">Jugador 1</h3>
            <p class="text-gray-400">Teclas: W (arriba), S (abajo)</p>
            <p class="text-2xl font-bold" id="score1">0</p>
          </div>
          <div class="text-right">
            <h3 class="text-xl font-bold">Jugador 2</h3>
            <p class="text-gray-400">Teclas: ↑ (arriba), ↓ (abajo)</p>
            <p class="text-2xl font-bold" id="score2">0</p>
          </div>
        </div>
        
        <div class="space-x-4">
          <button id="start-game" class="bg-green-500 text-white font-semibold py-2 px-4 rounded">Iniciar Juego</button>
          <button id="pause-game" class="bg-yellow-500 text-white font-semibold py-2 px-4 rounded">Pausar</button>
          <button id="reset-game" class="bg-red-500 text-white font-semibold py-2 px-4 rounded">Reiniciar</button>
        </div>
      </div>
      
      <div class="text-center">
        <button id="back-to-play" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded">Volver a Selección</button>
      </div>
    </div>
  `;

  // Inicializar el juego local
  initLocalGame();

  document.getElementById('back-to-play')?.addEventListener('click', () => navigateTo('/play'));
}

function initLocalGame(): void {
  const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('No se pudo obtener el contexto del canvas.');
    return;
  }

  // Estado del juego
  let gameRunning = false;
  let animationId: number;
  
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
    } else if (gameState.ball.x > canvas.width) {
      gameState.score.left++;
      resetBall();
      updateScore();
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
    resetBall();
    updateScore();
    draw();
  }

  // Event listeners para botones
  document.getElementById('start-game')?.addEventListener('click', startGame);
  document.getElementById('pause-game')?.addEventListener('click', pauseGame);
  document.getElementById('reset-game')?.addEventListener('click', resetGame);

  // Dibujar estado inicial
  draw();
}
