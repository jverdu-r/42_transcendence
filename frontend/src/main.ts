// src/main.ts

// Importar estilos de Tailwind CSS
import './input.css';

import { navigateTo } from './router';
import { renderNavbar } from './components/navbar';
import { getCurrentLanguage, setLanguage } from './i18n';
import { showNotification, checkRankingChange } from './utils/utils';
import { isAuthenticated } from './auth';

window.showNotification = showNotification;
window.checkRankingChange = checkRankingChange;

// Función para inicializar la aplicación
function initializeApp(): void {
    console.log('🚀 Inicializando Transcendence...');

    const savedLang = localStorage.getItem('lang') || 'es';
    setLanguage(savedLang);
    
    const currentPath = window.location.pathname;
    
    // 🛡️ Guard de autenticación global
    // Lista de páginas públicas
    const publicPages = ['/login', '/register'];
    const isPublicPage = publicPages.includes(currentPath);
    const userIsAuthenticated = isAuthenticated();

    // Si no está autenticado y no es una página pública -> forzar login
    if (!userIsAuthenticated && !isPublicPage) {
        console.warn('⚠️ Usuario no autenticado detectado. Redirigiendo a login...');
        navigateTo('/login');
        return;
    }

    // Si está autenticado y está en página pública -> ir a home
    if (userIsAuthenticated && isPublicPage) {
        console.log('✅ Usuario autenticado en página pública. Redirigiendo a home...');
        navigateTo('/home');
        return;
    }

    // Navegar a la ruta actual (con verificación incluida en navigateTo)
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
