// src/router.ts

import { getTranslation } from './i18n';
import { renderHomePage } from './pages/home';
import { renderPlay } from './pages/play';
import { renderProfilePage } from './pages/profile';
import { renderRankingPage } from './pages/ranking';
import { renderFriendsPage } from './pages/friends';
import { renderChatPage } from './pages/chat';
import { renderSettingsPage } from './pages/settings';
import { renderLoginPage } from './pages/login';
import { renderRegister } from './pages/register';
import { renderNavbar } from './components/navbar';
import { isAuthenticated } from './auth';

// New unified game pages (pages we use)
import { renderUnifiedGameLocal } from './pages/unifiedGameLocal';
import { renderUnifiedGameAI } from './pages/unifiedGameAI';
import { renderUnifiedGameOnline } from './pages/unifiedGameOnline';
import { renderGameLobby } from './pages/gameLobby';

// Game results page
import { renderGameResults, setResultsData } from './pages/gameResults';

//tournaments
import { renderTournamentsPage } from './pages/tournaments';
import { renderTournamentsFinishedPage } from './pages/tournamentsFinished';
import { renderTournamentsOngoingPage } from './pages/tournamentsOngoing';

// Global variable to store game results for routing
let pendingGameResults: any = null;

export function setGameResults(results: any): void {
  pendingGameResults = results;
  setResultsData(results);
}

function renderGameResultsWithData(): void {
  if (!pendingGameResults) {
    console.error('No game results data available');
    navigateTo('/home');
    return;
  }
  
  cleanupCurrentPage();
  if (!isAuthenticated()) {
    navigateTo('/login');
    return;
  }
  
  setupMainAppLayout();
  renderNavbar('/results');
  
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    renderGameResults();
  }
  
  // Clear the pending results after use
  pendingGameResults = null;
}

// Define the routes we actually use
const routes: { [key: string]: () => void } = {
  '/home': renderHomePage,
  '/': () => {
    // Redirect to login if not authenticated, to home if authenticated
    if (isAuthenticated()) {
      navigateTo('/home');
    } else {
      navigateTo('/login');
    }
  },
  '/profile': renderProfilePage,
  '/play': renderPlay,
  '/ranking': renderRankingPage,
  '/friends': renderFriendsPage,
  '/chat': renderChatPage,
  '/settings': renderSettingsPage,
  '/login': renderLoginPage,
  '/register': renderRegister,
  
  // Unified game routes (the ones we use)
  '/unified-game-local': renderUnifiedGameLocal,
  '/unified-game-ai': renderUnifiedGameAI,
  '/unified-game-online': renderUnifiedGameOnline,
  '/game-lobby': renderGameLobby,
  
  // Game results page
  '/results': renderGameResultsWithData,

  // Tournaments routes
  '/tournaments': renderTournamentsPage,
  '/tournamentsFinished': renderTournamentsFinishedPage,
  '/tournamentsOngoing': renderTournamentsOngoingPage
};

/**
 * Función auxiliar para establecer la estructura principal de la aplicación (navbar + contenido de página).
 * Solo la recrea si no existe.
 */
function setupMainAppLayout(): void {
  const appRoot = document.getElementById('app-root');
  if (!appRoot) {
    console.error('Elemento con id "app-root" no encontrado para configurar el layout principal.');
    return;
  }

  // Si no existen los contenedores principales (navbar-container o page-content), los crea
  if (!document.getElementById('navbar-container') || !document.getElementById('page-content')) {
    appRoot.innerHTML = `
      <div id="navbar-container"></div>
      <main id="page-content" class="flex-grow flex flex-col justify-center items-center p-4 sm:p-8 mt-24 sm:mt-32 w-full text-gray-100"></main>
    `;
  }
}

/**
 * Navega a una nueva ruta, renderiza la página correspondiente y actualiza el historial del navegador.
 * También asegura que el navbar se vuelva a renderizar para reflejar el enlace activo, si aplica.
 * @param path La ruta a la que navegar.
 */
export async function navigateTo(path: string): Promise<void> {
  const appRoot = document.getElementById('app-root') as HTMLElement;
  if (!appRoot) {
    console.error('Elemento con id "app-root" no encontrado. No se puede navegar.');
    return;
  }
  
  // Cleanup previous page
  cleanupCurrentPage();
  
  // Separar la ruta de los parámetros de consulta
  const [routePath, queryString] = path.split('?');
  const fullPath = path; // Mantener el path completo para el historial
  
  const isAuthPage = routePath === '/login' || routePath === '/register';
  const currentPagePath = window.location.pathname;
  const wasAuthPage = currentPagePath === '/login' || currentPagePath === '/register';
  
  // Verifica si el usuario está autenticado
  const userIsAuthenticated = isAuthenticated();

  // 🛡️ PROTECCIÓN DE RUTAS MEJORADA
  // Lista de páginas públicas (solo login y register)
  const publicPages = ['/login', '/register'];
  const isPublicPage = publicPages.includes(routePath);

  // Si NO es una página pública y NO está autenticado -> redirigir a login
  if (!isPublicPage && !userIsAuthenticated) {
    console.warn('⚠️ Acceso denegado: Usuario no autenticado. Redirigiendo a login...');
    if (routePath !== '/login') { // Evitar bucle infinito
      navigateTo('/login');
    }
    return;
  }

  // Si es una página pública (login/register) y SÍ está autenticado -> redirigir a home
  if (isPublicPage && userIsAuthenticated) {
    console.log('✅ Usuario ya autenticado. Redirigiendo a home...');
    if (routePath !== '/home') { // Evitar bucle infinito
      navigateTo('/home');
    }
    return;
  }

  if (isAuthPage) {
    // Si vamos a una página de autenticación, elimina explícitamente la navbar si existe
    const navbar = document.getElementById('navbar-container');
    if (navbar && navbar.parentElement) {
      navbar.parentElement.removeChild(navbar);
    }
    appRoot.innerHTML = '';
    const renderFunction = routes[routePath];
    if (renderFunction) {
      renderFunction(); // Llama a la función de renderizado de login/register
    } else {
      console.warn(`Ruta no encontrada para página de autenticación: ${routePath}`);
    }
    return;
  }
  // Si vamos a una página de la aplicación principal, nos aseguramos de que la estructura exista
  if (wasAuthPage) { // Si venimos de una página de autenticación
    setupMainAppLayout(); // Reestablece la estructura principal (navbar + main)
  } else if (!document.getElementById('navbar-container') || !document.getElementById('page-content')) {
    // Si no es una página de autenticación, pero la estructura no está (ej. primera carga de /home)
    setupMainAppLayout();
  }

  const pageContentContainer = document.getElementById('page-content');
  if (!pageContentContainer) {
    console.error(getTranslation('router', 'pageContentNotFound'));
    return;
  }

  // Limpia solo el contenido de la página para las rutas no de autenticación
  pageContentContainer.innerHTML = '';

  const renderFunction = routes[routePath]; // Usar routePath sin parámetros
  if (renderFunction) {
    renderFunction(); // Renderiza el contenido de la página dentro de #page-content
  } else {
    // Manejar 404 o redirigir a una página predeterminada
    pageContentContainer.innerHTML = '<h1>404 - Página No Encontrada</h1><p>Lo sentimos, la página que buscas no existe.</p>';
    console.warn(`Ruta no encontrada para la ruta: ${routePath}`);
  }

  // Solo renderizar el navbar en páginas de la app principal
  if (routePath !== '/login' && routePath !== '/register') {
    renderNavbar(routePath);
  }

  // Actualiza el historial del navegador (a menos que sea la carga inicial y la ruta sea la misma)
  if (window.location.pathname !== fullPath) {
    window.history.pushState({}, fullPath, fullPath);
  }
}

function cleanupCurrentPage(): void {
  // Cleanup function - no specific cleanup needed now
}

// 🛡️ Sistema de verificación continua de autenticación
// Verifica cada 100ms si el usuario está en una página no autorizada
let authCheckInterval: number | null = null;

function startAuthGuard(): void {
  // Si ya hay un intervalo corriendo, no crear otro
  if (authCheckInterval !== null) {
    return;
  }
  
  authCheckInterval = window.setInterval(() => {
    const currentPath = window.location.pathname;
    const publicPages = ['/login', '/register'];
    const isPublicPage = publicPages.includes(currentPath);
    const userIsAuthenticated = isAuthenticated();
    
    // Si no está autenticado y no está en una página pública
    if (!userIsAuthenticated && !isPublicPage) {
      console.warn('🚨 GUARD: Usuario no autenticado detectado en página protegida. Redirigiendo...');
      
      // Detener el intervalo temporalmente para evitar múltiples redirecciones
      if (authCheckInterval !== null) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
      }
      
      // Limpiar la página inmediatamente
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.innerHTML = '<div class="flex items-center justify-center h-screen bg-gray-900"><div class="text-center"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div><p class="text-white text-xl">Acceso denegado. Redirigiendo...</p></div></div>';
      }
      
      // Reemplazar la URL y navegar a login
      window.history.replaceState(null, '', '/login');
      setTimeout(() => {
        navigateTo('/login');
        // Reiniciar el guard después de navegar
        startAuthGuard();
      }, 100);
    }
    
    // Si está autenticado e intenta acceder a login/register
    if (userIsAuthenticated && isPublicPage) {
      console.log('🔄 GUARD: Usuario autenticado en página pública. Redirigiendo a home...');
      
      if (authCheckInterval !== null) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
      }
      
      window.history.replaceState(null, '', '/home');
      setTimeout(() => {
        navigateTo('/home');
        startAuthGuard();
      }, 100);
    }
  }, 100); // Verificar cada 100ms
}

// Iniciar el guard cuando se carga el script
startAuthGuard();

// 🛡️ Guard para navegación con botones del navegador (atrás/adelante)
// Esto intercepta cuando el usuario usa los botones de navegación del navegador
let popstateHandlerAttached = false;

if (!popstateHandlerAttached) {
  window.addEventListener('popstate', (event) => {
    console.log('🔙 Navegación del navegador detectada');
    
    const targetPath = window.location.pathname + window.location.search;
    const publicPages = ['/login', '/register'];
    const isPublicPage = publicPages.includes(window.location.pathname);
    const userIsAuthenticated = isAuthenticated();
    
    console.log(`Destino: ${targetPath}, Autenticado: ${userIsAuthenticated}, Pública: ${isPublicPage}`);
    
    // El guard continuo se encargará de redirigir si es necesario
    // Aquí solo hacemos limpieza y navegación normal
    cleanupCurrentPage();
    
    // Si pasa las verificaciones básicas, navegar
    // El intervalo se encargará de bloquear si es necesario
    navigateTo(targetPath);
  });
  
  popstateHandlerAttached = true;
}

// Cleanup al cerrar la pestaña/ventana
window.addEventListener('beforeunload', cleanupCurrentPage);