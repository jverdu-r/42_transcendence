// src/main.ts

import { navigateTo } from './router';
import { renderNavbar } from './components/navbar';
import { getCurrentLanguage, setLanguage } from './i18n';
import { showNotification, checkRankingChange } from './utils/utils';
import { setupMainAppLayout } from './router';

window.showNotification = showNotification;
window.checkRankingChange = checkRankingChange;

// Función para inicializar la aplicación
function initializeApp(): void {
    console.log('🚀 Inicializando Transcendence...');

    setupMainAppLayout();

    const savedLang = localStorage.getItem('lang') || 'es';
    setLanguage(savedLang)
    
    const currentPath = window.location.pathname;

    navigateTo(currentPath);
    
    console.log('✅ Transcendence inicializado correctamente');
}

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('languageChanged', () => {
  const currentPath = window.location.pathname;
  navigateTo(window.location.pathname);
});
