// src/router.ts

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

// New unified game pages (páginas que usamos)
import { renderUnifiedGameLocal } from './pages/unifiedGameLocal';
import { renderUnifiedGameAI } from './pages/unifiedGameAI';
import { renderUnifiedGameOnline } from './pages/unifiedGameOnline';
import { renderGameLobby } from './pages/gameLobby';

// Spectator page
import { renderGameSpectator, startSpectatorAutoRefresh, stopSpectatorAutoRefresh, cleanupSpectator } from './pages/gameSpectator';

//tournaments page under construction
import { renderTournamentsPage } from './pages/tournaments';
// Define las rutas que realmente usamos
const routes: { [key: string]: () => void } = {
  '/home': renderHomePage,
  '/': () => {
    // Redirigir al login si no está autenticado, al home si lo está
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
  
  // Rutas de juego unificadas (las que usamos)
  '/unified-game-local': renderUnifiedGameLocal,
  '/unified-game-ai': renderUnifiedGameAI,
  '/unified-game-online': renderUnifiedGameOnline,
  '/game-lobby': renderGameLobby,

  // Tournaments route
  '/tournaments': renderTournamentsPage,

  // Spectator route
  '/spectator': () => {
    cleanupCurrentPage();
    renderGameSpectator();
    startSpectatorAutoRefresh();
  }
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
    console.log('✅ setupMainAppLayout: Layout creado');
  } else {
    console.log('🔁 setupMainAppLayout: Layout ya existe');
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
  const wasAuthPage =
    currentPagePath === '/login' ||
    currentPagePath === '/register' ||
    currentPagePath === '/';
  
  // Verifica si el usuario está autenticado
  const userIsAuthenticated = isAuthenticated();

  // Protección de rutas
  if (isAuthPage && userIsAuthenticated) {
    // Si el usuario está autenticado y trata de acceder a login/register, redirigir a home
    console.log('Usuario autenticado intentando acceder a página de auth, redirigiendo a home');
    navigateTo('/home');
    return;
  }

  if (!isAuthPage && !userIsAuthenticated) {
    // Si el usuario no está autenticado y trata de acceder a páginas protegidas, redirigir a login
    console.log('Usuario no autenticado intentando acceder a página protegida, redirigiendo a login');
    navigateTo('/login');
    return;
  }

  if (isAuthPage) {
    // Si vamos a una página de autenticación, limpiamos todo el appRoot
    // y dejamos que renderLoginPage/renderRegister sobrescriba appRoot.innerHTML
    if (!wasAuthPage) { // Solo si venimos de una página que no era de autenticación
        appRoot.innerHTML = ''; // Limpia la estructura principal (navbar + main)
    }
    const renderFunction = routes[routePath];
    if (renderFunction) {
      renderFunction(); // Llama a la función de renderizado de login/register
    } else {
        console.warn(`Ruta no encontrada para página de autenticación: ${routePath}`);
    }
  } else {
    // Si vamos a una página de la aplicación principal, nos aseguramos de que la estructura exista
    if (wasAuthPage) { // Si venimos de una página de autenticación
        setupMainAppLayout(); // Reestablece la estructura principal (navbar + main)
    } else if (!document.getElementById('navbar-container') || !document.getElementById('page-content')) {
        // Si no es una página de autenticación, pero la estructura no está (ej. primera carga de /home)
        setupMainAppLayout();
    }

    const pageContentContainer = document.getElementById('page-content');
    if (!pageContentContainer) {
      console.error('Contenedor de contenido de página (#page-content) no encontrado después de configurar el layout.');
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

    // Siempre vuelve a renderizar el navbar para actualizar el enlace activo en las páginas de la aplicación
    renderNavbar(routePath);
  }

  // Actualiza el historial del navegador (a menos que sea la carga inicial y la ruta sea la misma)
  if (window.location.pathname !== fullPath) {
    window.history.pushState({}, fullPath, fullPath);
  }
}

function cleanupCurrentPage(): void {
  // Stop spectator auto-refresh if leaving spectator page
  stopSpectatorAutoRefresh();
  cleanupSpectator();
}

// Event listeners for cleanup
window.addEventListener('beforeunload', cleanupCurrentPage);
window.addEventListener('popstate', (event) => {
  cleanupCurrentPage();
  navigateTo(window.location.pathname + window.location.search);
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  navigateTo(window.location.pathname + window.location.search);
});