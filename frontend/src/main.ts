// src/main.ts

import { navigateTo } from './router';
import { renderNavbar } from './components/navbar';
import { getCurrentLanguage, setLanguage } from './i18n';

// Función para inicializar la aplicación
function initializeApp(): void {
    console.log('🚀 Inicializando Transcendence...');

    const savedLang = localStorage.getItem('lang') || 'es';
    setLanguage(savedLang)
    
    const currentPath = window.location.pathname;

    renderNavbar(currentPath); // 👈 esto es lo que faltaba
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
 