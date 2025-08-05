// src/pages/chat.ts
import { getTranslation } from '../i18n';

export function renderChatPage(): void {
    const chatHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center justify-center gap-8 text-gray-100 animate__animated animate__fadeIn">
            <div class="rounded-3xl p-8 sm:p-10 lg:p-12 max-w-3xl w-full bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl text-center transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
                <div class="flex flex-col items-center space-y-6">
                    <!-- Icono de construcción -->
                    <div class="text-6xl sm:text-7xl lg:text-8xl">
                        🚧
                    </div>
                    <h2 class="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#ffc300] drop-shadow-md">
                        ${getTranslation('chat', 'underConstruction')}
                    </h2>
                    <p class="text-base sm:text-lg text-gray-300 leading-relaxed max-w-lg">
                        ${getTranslation('chat', 'comingSoon')}
                    </p>
                    <!-- Efecto de puntos animados -->
                    <div class="flex space-x-2 text-[#ffd60a] text-xl">
                        <span class="animate-pulse">•</span>
                        <span class="animate-pulse delay-100">•</span>
                        <span class="animate-pulse delay-200">•</span>
                    </div>
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 1.5s infinite;
                }
                .delay-100 {
                    animation-delay: 0.3s;
                }
                .delay-200 {
                    animation-delay: 0.6s;
                }
                .animate__animated.animate__fadeIn {
                    animation-duration: 0.6s;
                }
                .hover\\:shadow-custom-deep:hover {
                    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3);
                }
            </style>
        </main>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = chatHtml;
    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de chat.');
    }
}