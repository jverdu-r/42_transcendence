// src/pages/settings.ts

import { navigateTo } from '../router';
import { getTranslation } from '../i18n';
import { getCurrentUser, getSetting, setSetting, applyUserSettings, fetchUserProfile } from '../auth';

interface UserSettings {
    language: string;
    notifications: string;
    sound_effects: string;
    game_difficulty: string;
}

document.addEventListener('DOMContentLoaded', async () => {
  await applyUserSettings();

  // Obtiene datos del usuario (username, email)
  const user = await fetchUserProfile();
  if (user) {
    const usernameInput = document.querySelector<HTMLInputElement>('#username');
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    if (usernameInput) usernameInput.value = user.username;
    if (emailInput) emailInput.value = user.email;
  }

  // Cargar configuración del juego desde localStorage
  const language = getSetting('language') || 'es';
  const notifications = getSetting('notifications') || 'true';
  const sound_effects = getSetting('sound_effects') || 'true';
  const game_difficulty = getSetting('game_difficulty') || 'normal';
});

// Función para obtener configuraciones del usuario
async function getUserSettings(): Promise<UserSettings | null> {
    const token = localStorage.getItem('jwt');
    if (!token) return null;

    try {
        const response = await fetch('/api/auth/settings/config', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Error al obtener configuraciones:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error en la petición de configuraciones:', error);
        return null;
    }
}

// Función para actualizar configuraciones del usuario
async function updateUserSettings(settings: UserSettings): Promise<boolean> {
    const token = localStorage.getItem('jwt');
    if (!token) return false;

    try {
        const response = await fetch('/api/auth/settings/config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            console.error('Error al actualizar configuraciones:', response.status);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error en la petición de actualización:', error);
        return false;
    }
}

// Función para actualizar perfil del usuario
async function updateUserProfile(profileData: any): Promise<{ success: boolean; message: string; user?: any }> {
    const token = localStorage.getItem('jwt');
    if (!token) return { success: false, message: 'No autenticado' };

    try {
        const response = await fetch('/api/auth/settings/user_data', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            return { success: false, message: result.message || 'Error al actualizar perfil' };
        }

        return { success: true, message: result.message, user: result.user };
    } catch (error) {
        console.error('Error en la petición de actualización de perfil:', error);
        return { success: false, message: 'Error de conexión' };
    }
}

export async function renderSettingsPage(): Promise<void> {
    const user = getCurrentUser();
    
    if (!user) {
        navigateTo('/login');
        return;
    }

    // Mostrar loading inicial
    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = `
            <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
                <div class="max-w-6xl w-full">
                    <div class="text-center mb-12">
                        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                            ⚙️ Configuración
                        </h1>
                        <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                            Cargando configuraciones...
                        </p>
                    </div>
                </div>
            </main>
        `;
    }

    // Obtener configuraciones del usuario
    const userSettings = await getUserSettings();
    const defaultSettings: UserSettings = {
        language: 'es',
        notifications: 'true',
        sound_effects: 'true',
        game_difficulty: 'normal'
    };

    const settings = userSettings || defaultSettings;
    
    const settingsHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center gap-8 text-gray-100">
            <div class="max-w-6xl w-full">
                <!-- Header -->
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 text-[#ffc300] drop-shadow-md leading-tight">
                        ⚙️ Configuración
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300 mb-8">
                        Personaliza tu experiencia de juego y gestiona tu cuenta
                    </p>
                </div>

                <!-- Settings Grid -->
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <!-- Account Settings -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-8 border border-[#003566] shadow-2xl">
                        <div class="flex items-center gap-4 mb-8">
                            <div class="w-16 h-16 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-full flex items-center justify-center">
                                <span class="text-2xl">👤</span>
                            </div>
                            <div>
                                <h2 class="text-2xl font-display font-bold text-[#ffc300]">
                                    Cuenta de Usuario
                                </h2>
                                <p class="text-gray-300">Gestiona tu información personal</p>
                            </div>
                        </div>
                        
                        <form id="profile-form" class="space-y-6">
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">
                                    📝 Nombre de usuario
                                </label>
                                <input type="text" id="username" value="${user.username}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200 placeholder-gray-400"
                                       placeholder="Tu nombre de usuario">
                            </div>
                            
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">
                                    📧 Dirección de correo electrónico
                                </label>
                                <input type="email" id="email" value="${user.email}" 
                                       class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200 placeholder-gray-400"
                                       placeholder="tu@ejemplo.com">
                            </div>
                            
                            <div class="border-t border-[#003566] pt-6">
                                <h3 class="text-lg font-semibold text-[#ffc300] mb-4">🔒 Cambiar Contraseña</h3>
                                
                                <div class="space-y-4">
                                    <div class="space-y-2">
                                        <label class="block text-sm font-medium text-gray-300">
                                            Contraseña actual
                                        </label>
                                        <input type="password" id="current-password" 
                                               class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200 placeholder-gray-400"
                                               placeholder="Ingresa tu contraseña actual">
                                    </div>
                                    
                                    <div class="space-y-2">
                                        <label class="block text-sm font-medium text-gray-300">
                                            Nueva contraseña
                                        </label>
                                        <input type="password" id="new-password" 
                                               class="w-full px-4 py-3 bg-[#001d3d] border border-[#003566] rounded-xl text-gray-100 focus:outline-none focus:border-[#ffc300] focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200 placeholder-gray-400"
                                               placeholder="Ingresa tu nueva contraseña">
                                    </div>
                                </div>
                            </div>
                        </form>
                        
                        <div class="flex flex-col sm:flex-row gap-4 mt-8">
                            <button id="save-profile-btn" class="flex-1 py-3 px-6 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold rounded-xl hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg">
                                💾 Guardar Cambios
                            </button>
                        </div>
                    </div>

                    <!-- Game Settings -->
                    <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-8 border border-[#003566] shadow-2xl">
                        <div class="flex items-center gap-4 mb-8">
                            <div class="w-16 h-16 bg-gradient-to-r from-[#003566] to-[#001d3d] rounded-full flex items-center justify-center border-2 border-[#ffc300]">
                                <span class="text-2xl">🎮</span>
                            </div>
                            <div>
                                <h2 class="text-2xl font-display font-bold text-[#ffc300]">
                                    Configuración del Juego
                                </h2>
                                <p class="text-gray-300">Personaliza tu experiencia de juego</p>
                            </div>
                        </div>
                        
                        <form id="game-settings-form" class="space-y-6">
                            <!-- Language Setting -->
                            <div class="p-6 bg-[#001d3d] rounded-xl border border-[#003566] hover:border-[#ffc300] transition-all duration-300">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-lg flex items-center justify-center">
                                            <span class="text-lg">🌐</span>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-gray-100">Idioma de la Interfaz</div>
                                            <div class="text-sm text-gray-400">Selecciona tu idioma preferido</div>
                                        </div>
                                    </div>
                                    <select id="language" class="bg-[#003566] text-gray-100 px-4 py-2 rounded-lg border border-[#ffc300] focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200">
                                        <option value="es" ${settings.language === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
                                        <option value="en" ${settings.language === 'en' ? 'selected' : ''}>🇺🇸 English</option>
                                        <option value="gl" ${settings.language === 'gl' ? 'selected' : ''}>🏴󠁥󠁳󠁧󠁡󠁿 Galego</option>
                                        <option value="zh" ${settings.language === 'zh' ? 'selected' : ''}>🇨🇳 中文</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Notifications -->
                            <div class="p-6 bg-[#001d3d] rounded-xl border border-[#003566] hover:border-[#ffc300] transition-all duration-300">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-lg flex items-center justify-center">
                                            <span class="text-lg">🔔</span>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-gray-100">Notificaciones</div>
                                            <div class="text-sm text-gray-400">Recibir notificaciones de partidas</div>
                                        </div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="notifications" ${settings.notifications === 'true' ? 'checked' : ''} class="sr-only peer">
                                        <div class="w-14 h-8 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ffc300] peer-focus:ring-opacity-50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-[#ffc300] shadow-lg"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Sound Effects -->
                            <div class="p-6 bg-[#001d3d] rounded-xl border border-[#003566] hover:border-[#ffc300] transition-all duration-300">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-lg flex items-center justify-center">
                                            <span class="text-lg">🔊</span>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-gray-100">Efectos de Sonido</div>
                                            <div class="text-sm text-gray-400">Activar sonidos del juego</div>
                                        </div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="sound-effects" ${settings.sound_effects === 'true' ? 'checked' : ''} class="sr-only peer">
                                        <div class="w-14 h-8 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ffc300] peer-focus:ring-opacity-50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-[#ffc300] shadow-lg"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Game Difficulty -->
                            <div class="p-6 bg-[#001d3d] rounded-xl border border-[#003566] hover:border-[#ffc300] transition-all duration-300">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] rounded-lg flex items-center justify-center">
                                            <span class="text-lg">🎯</span>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-gray-100">Dificultad por Defecto</div>
                                            <div class="text-sm text-gray-400">Nivel predeterminado contra IA</div>
                                        </div>
                                    </div>
                                    <select id="game-difficulty" class="bg-[#003566] text-gray-100 px-4 py-2 rounded-lg border border-[#ffc300] focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-50 transition-all duration-200">
                                        <option value="easy" ${settings.game_difficulty === 'easy' ? 'selected' : ''}>🟢 Fácil</option>
                                        <option value="normal" ${settings.game_difficulty === 'normal' ? 'selected' : ''}>🟡 Normal</option>
                                        <option value="hard" ${settings.game_difficulty === 'hard' ? 'selected' : ''}>🔴 Difícil</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        
                        <button id="save-game-settings-btn" class="w-full mt-8 py-3 px-6 bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold rounded-xl border-2 border-[#ffc300] hover:bg-[#ffc300] hover:text-[#000814] transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg">
                            🎮 Guardar Configuración del Juego
                        </button>
                    </div>
                </div>

                <!-- Additional Info Section -->
                <div class="mt-12 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-8 border border-[#003566] shadow-2xl">
                    <div class="text-center">
                        <h3 class="text-2xl font-display font-bold text-[#ffc300] mb-4">
                            ℹ️ Información Adicional
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
                            <div class="p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl mb-2">🎲</div>
                                <div class="font-semibold">Partidas Jugadas</div>
                                <div class="text-sm text-gray-400">Visualiza tus estadísticas en tu perfil</div>
                            </div>
                            <div class="p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl mb-2">🏆</div>
                                <div class="font-semibold">Ranking Global</div>
                                <div class="text-sm text-gray-400">Compite por el primer lugar</div>
                            </div>
                            <div class="p-4 bg-[#001d3d] rounded-xl border border-[#003566]">
                                <div class="text-2xl mb-2">🔒</div>
                                <div class="font-semibold">Seguridad</div>
                                <div class="text-sm text-gray-400">Tus datos están protegidos</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;

    if (pageContent) {
        pageContent.innerHTML = settingsHtml;
        setupEventListeners();
    } else {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de configuración.');
    }
}

function setupEventListeners(): void {
    // Botón para guardar perfil
    const saveProfileBtn = document.getElementById('save-profile-btn') as HTMLButtonElement;
    saveProfileBtn?.addEventListener('click', async (event) => {
        event.preventDefault();
        
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;

        const profileData: any = { username, email };
        
        if (currentPassword || newPassword) {
        profileData.current_password = currentPassword;
        profileData.new_password = newPassword;
}

        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '⏳ Guardando...';

        const result = await updateUserProfile(profileData);
        
        if (result.success) {
            alert('✅ Perfil actualizado exitosamente');
            // Limpiar campos de contraseña
            (document.getElementById('current-password') as HTMLInputElement).value = '';
            (document.getElementById('new-password') as HTMLInputElement).value = '';
        } else {
            alert(`❌ Error: ${result.message}`);
        }

        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '💾 Guardar Cambios';
    });

    // Botón para guardar configuraciones del juego
    const saveGameSettingsBtn = document.getElementById('save-game-settings-btn') as HTMLButtonElement;
    saveGameSettingsBtn?.addEventListener('click', async (event) => {
        event.preventDefault();
        
        const language = (document.getElementById('language') as HTMLSelectElement).value;
        const notifications = (document.getElementById('notifications') as HTMLInputElement).checked ? 'true' : 'false';
        const soundEffects = (document.getElementById('sound-effects') as HTMLInputElement).checked ? 'true' : 'false';
        const gameDifficulty = (document.getElementById('game-difficulty') as HTMLSelectElement).value;

        const gameSettings: UserSettings = {
            language,
            notifications,
            sound_effects: soundEffects,
            game_difficulty: gameDifficulty
        };

        saveGameSettingsBtn.disabled = true;
        saveGameSettingsBtn.innerHTML = '⏳ Guardando...';

        const success = await updateUserSettings(gameSettings);
        
        if (success) {
            alert('✅ Configuraciones del juego guardadas exitosamente');
            
            // Aplicar configuraciones localmente
            setSetting('language', language);
            setSetting('notifications', notifications);
            setSetting('sound_effects', soundEffects);
            setSetting('game_difficulty', gameDifficulty);
            
            // Cambiar idioma si es necesario
            if (language) {
                localStorage.setItem('language', language);
                window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
            }
            
        } else {
            alert('❌ Error al guardar las configuraciones del juego');
        }

        saveGameSettingsBtn.disabled = false;
        saveGameSettingsBtn.innerHTML = '🎮 Guardar Configuración del Juego';
    });
}
