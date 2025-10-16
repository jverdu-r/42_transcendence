// src/main.ts

// Importar estilos de Tailwind CSS
import './input.css';

import { navigateTo } from './router';
import { renderNavbar } from './components/navbar';
import { getCurrentLanguage, setLanguage } from './i18n';
import { showNotification, checkRankingChange } from './utils/utils';
import { initGlobalChatConnection, isConnected } from './services/chatConnection';
import { getCurrentUser } from './auth';

window.showNotification = showNotification;
window.checkRankingChange = checkRankingChange;

// Función para inicializar la aplicación
function initializeApp(): void {
    console.log('🚀 Inicializando Transcendence...');

    const savedLang = localStorage.getItem('lang') || 'es';
    setLanguage(savedLang);
    
    // Inicializar conexión global del chat si hay usuario autenticado
    const currentUser = getCurrentUser();
    if (currentUser && !isConnected()) {
        console.log('🔌 Inicializando conexión global del chat...');
        initGlobalChatConnection(currentUser.id);
    }
    
    const currentPath = window.location.pathname;
    navigateTo(currentPath);
    
    console.log('✅ Transcendence inicializado correctamente');
}

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('languageChanged', () => {
  const currentPath = window.location.pathname;
  renderNavbar(currentPath);
  navigateTo(currentPath);
});
