// src/main.ts

// Importar estilos de Tailwind CSS
import './input.css';

import { navigateTo } from './router';
import { renderNavbar } from './components/navbar';
import { getCurrentLanguage, setLanguage } from './i18n';
import { showNotification, checkRankingChange } from './utils/utils';
import { initGlobalNotifications, requestNotificationPermission, disconnectGlobalNotifications } from './globalNotifications';
import { getCurrentUser } from './auth';

window.showNotification = showNotification;
window.checkRankingChange = checkRankingChange;

// Función para inicializar la aplicación
function initializeApp(): void {
    console.log('🚀 Inicializando Transcendence...');

    const savedLang = localStorage.getItem('lang') || 'es';
    setLanguage(savedLang);
    
    // Initialize global notifications if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser) {
        console.log('👤 Usuario conectado, iniciando notificaciones globales...');
        initGlobalNotifications();
        requestNotificationPermission();
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    disconnectGlobalNotifications();
});

// Re-initialize notifications when user logs in
window.addEventListener('userLoggedIn', () => {
    console.log('👤 Usuario inició sesión, iniciando notificaciones globales...');
    initGlobalNotifications();
    requestNotificationPermission();
});

// Disconnect notifications when user logs out
window.addEventListener('userLoggedOut', () => {
    console.log('👤 Usuario cerró sesión, desconectando notificaciones globales...');
    disconnectGlobalNotifications();
});

