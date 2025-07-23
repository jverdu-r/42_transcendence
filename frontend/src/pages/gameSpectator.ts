/**
 * Simple Game Spectator Page
 */
import { navigateTo } from '../router';

export function renderGameSpectator(): void {
    const pageContent = document.getElementById('page-content');
    
    if (!pageContent) {
        console.error('No se encontró el contenedor de contenido.');
        return;
    }

    pageContent.innerHTML = `
        <div class="w-full max-w-6xl mx-auto">
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-white mb-4">👁️ Modo Espectador</h1>
                <p class="text-lg text-gray-300">Próximamente - Observa partidas en tiempo real</p>
            </div>

            <div class="bg-gray-800 rounded-lg p-8 text-center">
                <div class="text-6xl mb-4">🚧</div>
                <h2 class="text-2xl font-bold text-yellow-400 mb-4">En Desarrollo</h2>
                <p class="text-gray-300 mb-6">
                    El modo espectador está siendo implementado.
                    Pronto podrás observar partidas en vivo de otros jugadores.
                </p>
                <div class="space-y-4">
                    <div class="text-left max-w-md mx-auto">
                        <h3 class="text-lg font-semibold text-white mb-2">Características planificadas:</h3>
                        <ul class="text-gray-300 space-y-1">
                            <li>• Ver partidas en tiempo real</li>
                            <li>• Lista de juegos disponibles</li>
                            <li>• Estadísticas en vivo</li>
                            <li>• Múltiples espectadores por partida</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="mt-8 text-center">
                <button id="back-to-menu" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                    ⬅️ Volver al Menú Principal
                </button>
            </div>
        </div>
    `;

    document.getElementById('back-to-menu')?.addEventListener('click', () => {
        navigateTo('/play');
    });
}

// Export stub functions for compatibility
export function startSpectatorAutoRefresh(): void {
    console.log('Spectator auto-refresh not implemented yet');
}

export function stopSpectatorAutoRefresh(): void {
    console.log('Spectator auto-refresh not implemented yet');
}

export function cleanupSpectator(): void {
    console.log('Spectator cleanup not implemented yet');
}
