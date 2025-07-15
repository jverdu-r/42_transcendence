// src/pages/settings.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

export function renderSettingsPage(): void {
    const user = getCurrentUser();
    
    if (!user) {
        navigateTo('/login');
        return;
    }
    
    const settingsHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-4xl w-full">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                        ${getTranslation('settings', 'title')}
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                        Personaliza tu experiencia de juego
                    </p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Account Settings -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                        <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-6">
                            ${getTranslation('settings', 'userAccountSectionTitle')}
                        </h2>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    ${getTranslation('settings', 'usernameLabel')}
                                </label>
                                <input type="text" value="${user.username}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] transition-colors duration-200">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    ${getTranslation('settings', 'emailLabel')}
                                </label>
                                <input type="email" value="${user.email}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] transition-colors duration-200">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    ${getTranslation('settings', 'currentPasswordLabel')}
                                </label>
                                <input type="password" placeholder="${getTranslation('settings', 'currentPasswordPlaceholder')}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] transition-colors duration-200">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    ${getTranslation('settings', 'newPasswordLabel')}
                                </label>
                                <input type="password" placeholder="${getTranslation('settings', 'newPasswordPlaceholder')}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] transition-colors duration-200">
                            </div>
                        </div>
                        
                        <div class="flex gap-4 mt-8">
                            <button class="flex-1 py-3 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold rounded-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 transform hover:scale-105">
                                ${getTranslation('settings', 'acceptChangesButton')}
                            </button>
                            <button class="px-6 py-3 border-2 border-red-500 text-red-400 font-semibold rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300">
                                ${getTranslation('settings', 'deleteAccountButton')}
                            </button>
                        </div>
                    </div>

                    <!-- Game Settings -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl">
                        <h2 class="text-2xl font-display font-bold text-[#ffc300] mb-6">
                            Configuración del Juego
                        </h2>
                        
                        <div class="space-y-6">
                            <!-- Language Setting -->
                            <div class="flex items-center justify-between p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div>
                                    <div class="font-semibold text-gray-100">${getTranslation('profile', 'languageSetting')}</div>
                                    <div class="text-sm text-gray-400">Cambiar idioma de la interfaz</div>
                                </div>
                                <select class="bg-[#003566] text-gray-100 px-4 py-2 rounded-lg border border-[#ffc300] focus:outline-none">
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                    <option value="gl">Galego</option>
                                    <option value="zh">中文</option>
                                </select>
                            </div>
                            
                            <!-- Notifications -->
                            <div class="flex items-center justify-between p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div>
                                    <div class="font-semibold text-gray-100">${getTranslation('profile', 'notificationsSetting')}</div>
                                    <div class="text-sm text-gray-400">Recibir notificaciones de partidas</div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffc300]"></div>
                                </label>
                            </div>
                            
                            <!-- Sound Effects -->
                            <div class="flex items-center justify-between p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div>
                                    <div class="font-semibold text-gray-100">Efectos de Sonido</div>
                                    <div class="text-sm text-gray-400">Activar sonidos del juego</div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffc300]"></div>
                                </label>
                            </div>
                            
                            <!-- Theme -->
                            <div class="flex items-center justify-between p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div>
                                    <div class="font-semibold text-gray-100">Tema de Color</div>
                                    <div class="text-sm text-gray-400">Personalizar esquema de colores</div>
                                </div>
                                <select class="bg-[#003566] text-gray-100 px-4 py-2 rounded-lg border border-[#ffc300] focus:outline-none">
                                    <option value="default">Clásico</option>
                                    <option value="neon">Neón</option>
                                    <option value="retro">Retro</option>
                                    <option value="minimal">Minimalista</option>
                                </select>
                            </div>
                            
                            <!-- Game Difficulty -->
                            <div class="flex items-center justify-between p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div>
                                    <div class="font-semibold text-gray-100">Dificultad por Defecto</div>
                                    <div class="text-sm text-gray-400">Nivel predeterminado contra IA</div>
                                </div>
                                <select class="bg-[#003566] text-gray-100 px-4 py-2 rounded-lg border border-[#ffc300] focus:outline-none">
                                    <option value="easy">Fácil</option>
                                    <option value="normal" selected>Normal</option>
                                    <option value="hard">Difícil</option>
                                </select>
                            </div>
                        </div>
                        
                        <button class="w-full mt-8 py-3 bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold rounded-xl border border-[#ffc300] hover:bg-[#ffc300] hover:text-[#000814] transition-all duration-300 transform hover:scale-105">
                            Guardar Configuración del Juego
                        </button>
                    </div>
                </div>
            </div>
        </main>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = settingsHtml;

        // Add event listeners for form interactions
        const saveButtons = document.querySelectorAll('button');
        saveButtons.forEach(button => {
            if (button.textContent?.includes('Guardar') || button.textContent?.includes(getTranslation('settings', 'acceptChangesButton'))) {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    alert('Configuración guardada (funcionalidad de demostración)');
                });
            }
            
            if (button.textContent?.includes('Eliminar') || button.textContent?.includes(getTranslation('settings', 'deleteAccountButton'))) {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
                        alert('Cuenta eliminada (funcionalidad de demostración)');
                    }
                });
            }
        });

    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de configuración.');
    }
}
