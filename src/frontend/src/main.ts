// src/main.ts
import { navigateTo } from './router';
import { renderNavbar } from './components/navbar'; // Import the new navbar component
import { getTranslation } from './i18n'; // Only need getTranslation for basic layout for now
import { initSafariCompatibility, isSafari, isIOSSafari } from './utils/safariPolyfills';

// Define the root element where the application will be mounted
const appRoot = document.getElementById('app-root') as HTMLElement;

if (!appRoot) {
  console.error('Element with id "app-root" not found in index.html. Cannot initialize application.');
} else {
  // Set up the initial HTML structure: a container for the navbar and a container for page content
  appRoot.innerHTML = `
    <div id="navbar-container"></div>
    <main id="page-content" class="flex-grow flex flex-col justify-center items-center p-4 sm:p-8 mt-24 sm:mt-32 w-full text-gray-100"></main>
  `;

  const pageContentContainer = document.getElementById('page-content');

  if (!pageContentContainer) {
    console.error('Element with id "page-content" not found. Cannot render page content.');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Safari compatibility fixes first
    if (isSafari() || isIOSSafari()) {
      initSafariCompatibility();
      console.log('🍎 Safari detected, compatibility fixes applied');
    }
    
    // Initial render of the navbar and the current page
    renderNavbar(location.pathname);
    await navigateTo(location.pathname);

    // Escuchar clics en el cuerpo del documento para la navegación (delegación de eventos)
    document.body.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Busca el elemento 'a' más cercano si el click fue dentro de uno
      const anchor = target.closest('a');

      // Only handle internal links that start with '/'
      if (anchor && anchor.matches('a') && anchor.getAttribute('href')?.startsWith('/')) {
        e.preventDefault(); // Evita la recarga completa de la página
        const path = anchor.getAttribute('href')!;
        await navigateTo(path);
      }
    });

    // Escuchar eventos 'popstate' para la navegación hacia atrás/adelante del navegador
    window.addEventListener('popstate', async () => {
      renderNavbar(location.pathname); // Re-render navbar on popstate to update active link
      await navigateTo(location.pathname);
    });

    // Listen for custom languageChange event to re-render the whole UI
    window.addEventListener('languageChange', async () => {
      renderNavbar(location.pathname); // Re-render navbar
      await navigateTo(location.pathname); // Re-render current page
    });
  });
}