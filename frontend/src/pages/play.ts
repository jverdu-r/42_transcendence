import { navigateTo } from '../router';

export function renderPlay(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar la página de juego.');
    return;
  }

  content.innerHTML = `
    <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
      <div class="max-w-4xl w-full">
        <h1 class="text-4xl sm:text-5xl font-display font-extrabold text-[#ffc300] drop-shadow-md text-center mb-8">
          Elige tu Modo de Juego
        </h1>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <!-- Juego Local -->
          <div class="rounded-3xl p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.01] transition-all duration-500">
            <div class="text-center mb-4">
              <div class="text-4xl mb-4">🎮</div>
              <h3 class="text-xl font-display font-bold text-[#ffc300] mb-3">Juego Local</h3>
              <p class="text-sm text-gray-300 mb-4">Juega contra un amigo en la misma computadora</p>
              <ul class="text-xs text-gray-400 mb-4 space-y-1">
                <li>• Jugador 1: W/S</li>
                <li>• Jugador 2: ↑/↓</li>
                <li>• Partida instantánea</li>
              </ul>
            </div>
            <button id="local-game" class="w-full bg-gradient-to-r from-[#28a745] to-[#20c997] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#20c997] hover:to-[#28a745] transition-all duration-300 shadow-lg transform hover:scale-105">
              Jugar Local
            </button>
          </div>
          
          <!-- Juego Online -->
          <div class="rounded-3xl p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.01] transition-all duration-500">
            <div class="text-center mb-4">
              <div class="text-4xl mb-4">🌐</div>
              <h3 class="text-xl font-display font-bold text-[#ffc300] mb-3">Juego Online</h3>
              <p class="text-sm text-gray-300 mb-4">Juega contra jugadores en línea o contra la IA</p>
              <ul class="text-xs text-gray-400 mb-4 space-y-1">
                <li>• Multijugador en tiempo real</li>
                <li>• Partidas contra IA</li>
                <li>• Ranking global</li>
              </ul>
            </div>
            <button id="online-game" class="w-full bg-gradient-to-r from-[#007bff] to-[#0056b3] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#0056b3] hover:to-[#007bff] transition-all duration-300 shadow-lg transform hover:scale-105">
              Jugar Online
            </button>
          </div>
          
          <!-- Observar Partidas -->
          <div class="rounded-3xl p-6 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl hover:shadow-custom-deep hover:scale-[1.01] transition-all duration-500">
            <div class="text-center mb-4">
              <div class="text-4xl mb-4">👁️</div>
              <h3 class="text-xl font-display font-bold text-[#ffc300] mb-3">Observar</h3>
              <p class="text-sm text-gray-300 mb-4">Ve partidas en vivo de otros jugadores</p>
              <ul class="text-xs text-gray-400 mb-4 space-y-1">
                <li>• Partidas en tiempo real</li>
                <li>• Estadísticas en vivo</li>
                <li>• Aprender jugando</li>
              </ul>
            </div>
            <button id="observer-game" class="w-full bg-gradient-to-r from-[#6c757d] to-[#495057] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#495057] hover:to-[#6c757d] transition-all duration-300 shadow-lg transform hover:scale-105">
              Observar
            </button>
          </div>
        </div>
        
        <div class="text-center">
          <button id="back-to-home" class="text-gray-400 hover:text-[#ffc300] transition-all duration-300 font-medium">
            ← Volver al Inicio
          </button>
        </div>
      </div>
    </main>
    
    <style>
      .hover\\:shadow-custom-deep:hover {
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3);
      }
      
      .animate__animated.animate__fadeIn {
        animation-duration: 0.5s;
      }
    </style>
  `;

  document.getElementById('local-game')?.addEventListener('click', () => navigateTo('/game-local'));
  document.getElementById('online-game')?.addEventListener('click', () => navigateTo('/game-online'));
  document.getElementById('observer-game')?.addEventListener('click', () => navigateTo('/game-observer'));
  document.getElementById('back-to-home')?.addEventListener('click', () => navigateTo('/home'));
}
