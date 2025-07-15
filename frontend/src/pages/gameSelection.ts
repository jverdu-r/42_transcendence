import { navigateTo } from '../router';

export function renderGameSelection(): void {
  const content = document.getElementById('page-content');

  if (!content) {
    console.error('No se encontró el contenedor principal para renderizar el modo de selección de juego.');
    return;
  }

  content.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold underline">Selecciona un Modo de Juego</h1>
      <ul>
        <li><button id="local-game" class="mt-4 bg-green-500 text-white font-semibold py-2 px-4 rounded">Juego Local</button></li>
        <li><button id="online-game" class="mt-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded">Juego Online</button></li>
        <li><button id="observer-game" class="mt-4 bg-gray-500 text-white font-semibold py-2 px-4 rounded">Observar Partida</button></li>
      </ul>
    </div>
  `;

  document.getElementById('local-game')?.addEventListener('click', () => navigateTo('/game-local'));
  document.getElementById('online-game')?.addEventListener('click', () => navigateTo('/game-online'));
  document.getElementById('observer-game')?.addEventListener('click', () => navigateTo('/game-observer'));
}
