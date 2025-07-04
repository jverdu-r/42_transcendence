// src/pages/settings.ts

import { navigateTo } from '../router';
import { renderNavbar } from '../components/navbar'; // Importa el componente del navbar
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n'; // Importa las funciones de i18n

/**
 * Applies current translations to elements with data-i18n attributes within the settings page.
 */
function applyTranslations(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const [component, textKey] = key.split('.');
      if (component && textKey) {
        const translatedText = getTranslation(component, textKey);
        if (element.tagName === 'INPUT' && (element as HTMLInputElement).placeholder !== undefined) {
          (element as HTMLInputElement).placeholder = translatedText;
        } else {
          element.textContent = translatedText;
        }
      }
    }
  });
}

export function renderSettingsPage(): void {
  // Renderiza el navbar con 'settings' como el enlace activo
  renderNavbar('/settings');

  const settingsHtml = `
    <main class="flex-grow w-full p-4 sm:p-8 mt-24 sm:mt-32 flex flex-col items-center gap-8 text-gray-100 animate__animated animate__fadeIn">
      <div class="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl w-full max-w-3xl transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:shadow-custom-deep">
        <h2 class="text-3xl sm:text-4xl font-display font-extrabold text-[#ffc300] mb-6 sm:mb-8 text-center drop-shadow-md leading-tight"
            data-i18n="settings.title">${getTranslation('settings', 'title')}</h2>

        <div class="space-y-6 sm:space-y-8">
          <div>
            <h3 class="text-xl sm:text-2xl font-bold text-[#ffc300] mb-3 sm:mb-4 border-b pb-2 border-[#003566]"
                data-i18n="settings.userAccountSectionTitle">${getTranslation('settings', 'userAccountSectionTitle')}</h3>
            <div class="space-y-4">
              <div>
                <label for="username" class="block text-base sm:text-lg font-semibold mb-2 text-gray-200"
                       data-i18n="settings.usernameLabel">${getTranslation('settings', 'usernameLabel')}</label>
                <input type="text" id="username" value="NombreDeUsuario"
                       class="w-full p-3 rounded-lg border border-[#003566] focus:ring-4 focus:ring-[#ffc300] focus:border-[#ffd60a] text-gray-100 bg-[#001d3d] placeholder-gray-400 transition-all duration-200 text-lg shadow-inner" />
              </div>
              <div>
                <label for="email" class="block text-base sm:text-lg font-semibold mb-2 text-gray-200"
                       data-i18n="settings.emailLabel">${getTranslation('settings', 'emailLabel')}</label>
                <input type="email" id="email" value="usuario@example.com"
                       class="w-full p-3 rounded-lg border border-[#003566] focus:ring-4 focus:ring-[#ffc300] focus:border-[#ffd60a] text-gray-100 bg-[#001d3d] placeholder-gray-400 transition-all duration-200 text-lg shadow-inner" />
              </div>
              <div>
                <label for="current-password" class="block text-base sm:text-lg font-semibold mb-2 text-gray-200"
                       data-i18n="settings.currentPasswordLabel">${getTranslation('settings', 'currentPasswordLabel')}</label>
                <input type="password" id="current-password"
                       placeholder="${getTranslation('settings', 'currentPasswordPlaceholder')}"
                       data-i18n="settings.currentPasswordPlaceholder"
                       class="w-full p-3 rounded-lg border border-[#003566] focus:ring-4 focus:ring-[#ffc300] focus:border-[#ffd60a] text-gray-100 bg-[#001d3d] placeholder-gray-400 transition-all duration-200 text-lg shadow-inner" />
              </div>
              <div>
                <label for="new-password" class="block text-base sm:text-lg font-semibold mb-2 text-gray-200"
                       data-i18n="settings.newPasswordLabel">${getTranslation('settings', 'newPasswordLabel')}</label>
                <input type="password" id="new-password"
                       placeholder="${getTranslation('settings', 'newPasswordPlaceholder')}"
                       data-i18n="settings.newPasswordPlaceholder"
                       class="w-full p-3 rounded-lg border border-[#003566] focus:ring-4 focus:ring-[#ffc300] focus:border-[#ffd60a] text-gray-100 bg-[#001d3d] placeholder-gray-400 transition-all duration-200 text-lg shadow-inner" />
              </div>
              <div>
                <label for="confirm-new-password" class="block text-base sm:text-lg font-semibold mb-2 text-gray-200"
                       data-i18n="settings.confirmNewPasswordLabel">${getTranslation('settings', 'confirmNewPasswordLabel')}</label>
                <input type="password" id="confirm-new-password"
                       placeholder="${getTranslation('settings', 'confirmNewPasswordPlaceholder')}"
                       data-i18n="settings.confirmNewPasswordPlaceholder"
                       class="w-full p-3 rounded-lg border border-[#003566] focus:ring-4 focus:ring-[#ffc300] focus:border-[#ffd60a] text-gray-100 bg-[#001d3d] placeholder-gray-400 transition-all duration-200 text-lg shadow-inner" />
              </div>
            </div>
          </div>


          <div class="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8">
            <button
              id="accept-changes-button"
              class="bg-gradient-to-r from-[#003566] to-[#001d3d] text-white py-3 sm:py-4 px-6 sm:px-10 rounded-xl font-bold text-base sm:text-lg hover:from-[#001d3d] hover:to-[#003566] transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
              data-i18n="settings.acceptChangesButton"
            >
              ${getTranslation('settings', 'acceptChangesButton')}
            </button>
            <button
              id="delete-account-button"
              class="bg-red-700 text-white py-3 sm:py-4 px-6 sm:px-10 rounded-xl font-bold text-base sm:text-lg hover:bg-red-800 transition-colors duration-300 shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
              data-i18n="settings.deleteAccountButton"
            >
              ${getTranslation('settings', 'deleteAccountButton')}
            </button>
          </div>
        </div>
      </div>
    </main>
    <style>
        .animate__animated.animate__fadeIn {
            animation-duration: 0.5s;
        }

        /* Custom Shadow for Hover Effect (deeper glow) */
        .hover\\:shadow-custom-deep:hover {
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 195, 0, 0.3); /* Deeper, yellowish glow */
        }
    </style>
  `;
  const appRoot = document.getElementById('app-root') as HTMLElement;
  if (appRoot) {
    // Busca el elemento <main> existente para actualizar solo el contenido principal
    let mainContent = appRoot.querySelector('main');
    if (mainContent) {
        // Si ya existe un elemento <main>, reemplaza su contenido
        mainContent.outerHTML = settingsHtml;
    } else {
        // Si no existe, añade el HTML de configuración al final del appRoot
        appRoot.insertAdjacentHTML('beforeend', settingsHtml);
    }

    // Aplica las traducciones después de que el HTML se haya insertado en el DOM
    applyTranslations();

    // Event listener para el cambio de idioma
    window.removeEventListener('languageChange', applyTranslations); // Evita duplicados
    window.addEventListener('languageChange', applyTranslations);

    // Event listener for "Aceptar Cambios" button
    const acceptChangesButton = document.getElementById('accept-changes-button');
    if (acceptChangesButton) {
      acceptChangesButton.addEventListener('click', () => {
        // Logic to save profile changes
        console.log('Cambios aceptados');
        // navigateTo('/profile'); // Or redirect to the profile page
      });
    }

    // Event listener for "Eliminar Cuenta" button
    const deleteAccountButton = document.getElementById('delete-account-button');
    if (deleteAccountButton) {
      deleteAccountButton.addEventListener('click', () => {
        // Logic to delete the account (possibly with a confirmation)
        console.log('Eliminar cuenta');
      });
    }
  } else {
    console.error('Element with id "app-root" not found for rendering the settings page.');
  }
}