// src/components/navbar.ts

import { navigateTo } from '../router';
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n';
import { logout } from '../auth';

export function renderNavbar(currentPath: string): void {
    const navbarHtml = `
        <header class="w-full p-6 bg-[#000814] border-b border-[#003566] shadow-xl flex justify-between items-center fixed top-0 z-20 transition-all duration-300 ease-in-out">
            <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-[#ffc300] drop-shadow-md tracking-tight">PONG</h1>

            <nav class="hidden md:flex items-center space-x-8">
                <ul class="flex space-x-8">
                    <li>
                        <a class="${currentPath === '/home' || currentPath === '/' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}" href="/home">${getTranslation('navbar', 'home')}</a>
                    </li>
                    <li>
                        <a href="/profile" class="${currentPath === '/profile' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'profile')}</a>
                    </li>
                    <li>
                        <a href="/play" class="${currentPath === '/play' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'play')}</a>
                    </li>
                    <li>
                        <a href="/ranking" class="${currentPath === '/ranking' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'ranking')}</a>
                    </li>
                    <li>
                        <a href="/tournaments" class="${currentPath === '/tournaments' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'tournaments')}</a>
                    </li>
                    <li>
                        <a href="/chat" class="${currentPath === '/chat' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'chat')}</a>
                    </li>
                    <li>
                        <a href="/friends" class="${currentPath === '/friends' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'friends')}</a>
                    </li>
                    <li>
                        <a href="/settings" class="${currentPath === '/settings' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'settings')}</a>
                    </li>
                    <li>
                        <button id="logout-btn-desktop" class="text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200 bg-transparent border-none cursor-pointer">${getTranslation('navbar', 'logout')}</button>
                    </li>
                </ul>
                <div class="relative z-50">
                    <button
                        type="button"
                        id="language-dropdown-button-desktop"
                        class="inline-flex justify-center items-center gap-x-1.5 rounded-full bg-[#001d3d] px-4 py-2 text-sm font-semibold text-gray-100 shadow-sm ring-1 ring-inset ring-[#003566] hover:bg-[#003566] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ffc300]"
                        aria-expanded="false"
                        aria-haspopup="true"
                    >
                        <span id="current-language-name-desktop">${getTranslation('common', 'language')}</span>
                        <svg class="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <div
                        id="language-dropdown-menu-desktop"
                        class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[#001d3d] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="language-dropdown-button-desktop"
                        tabindex="-1"
                    >
                        <div class="py-1" role="none">
                            <a href="#" class="flex items-center gap-x-3 px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" role="menuitem" tabindex="-1" data-lang="es">
                                ${getTranslation('common', 'castellano')}
                            </a>
                            <a href="#" class="flex items-center gap-x-3 px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" role="menuitem" tabindex="-1" data-lang="en">
                                ${getTranslation('common', 'english')}
                            </a>
                            <a href="#" class="flex items-center gap-x-3 px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" role="menuitem" tabindex="-1" data-lang="gl">
                                ${getTranslation('common', 'galician')}
                            </a>
                            <a href="#" class="flex items-center gap-x-3 px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" role="menuitem" tabindex="-1" data-lang="zh">
                                ${getTranslation('common', 'chinese')}
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="md:hidden flex items-center">
                <input type="checkbox" id="menu-toggle" class="peer hidden" />
                <label for="menu-toggle" class="block cursor-pointer text-[#ffc300] hover:text-[#ffd60a] focus:outline-none">
                    <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                    </svg>
                </label>

                <div class="fixed top-[80px] left-0 w-full bg-[#000814] border-b border-[#003566] shadow-xl z-10
                            max-h-0 overflow-hidden transition-all duration-300 ease-in-out
                            peer-checked:max-h-screen">
                    <ul class="flex flex-col items-center py-4 space-y-4">
                        <li>
                            <a class="${currentPath === '/home' || currentPath === '/' ? 'block text-[#ffc300] font-bold text-xl transition-colors duration-200 border-b-2 border-[#ffc300] px-4 py-2 hover:text-[#ffd60a]' : 'block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2'}" href="/home">${getTranslation('navbar', 'home')}</a>
                        </li>
                        <li>
                            <a href="/profile" class="${currentPath === '/profile' ? 'block text-[#ffc300] font-bold text-xl transition-colors duration-200 border-b-2 border-[#ffc300] px-4 py-2 hover:text-[#ffd60a]' : 'block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2'}">${getTranslation('navbar', 'profile')}</a>
                        </li>
                        <li>
                            <a href="/play" class="${currentPath === '/play' ? 'block text-[#ffc300] font-bold text-xl transition-colors duration-200 border-b-2 border-[#ffc300] px-4 py-2 hover:text-[#ffd60a]' : 'block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2'}">${getTranslation('navbar', 'play')}</a>
                        </li>
                        <li>
                            <a href="/ranking" class="${currentPath === '/ranking' ? 'block text-[#ffc300] font-bold text-xl transition-colors duration-200 border-b-2 border-[#ffc300] px-4 py-2 hover:text-[#ffd60a]' : 'block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2'}">${getTranslation('navbar', 'ranking')}</a>
                            </li>
                        <li>
                            <a href="/tournaments" class="${currentPath === '/tournaments' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'tournaments')}</a>
                        </li>
                        <li>
                            <a href="/chat" class="${currentPath === '/chat' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'chat')}</a>
                        </li>
                        <li>
                            <a href="/friends" class="${currentPath === '/friends' ? 'text-[#ffc300] font-bold text-lg transition-colors duration-200 border-b-2 border-[#ffc300] pb-1 hover:text-[#ffd60a]' : 'text-gray-200 hover:text-[#ffc300] font-medium text-lg transition-colors duration-200'}">${getTranslation('navbar', 'friends')}</a>
                        </li>
                        <li>
                            <a href="/settings" class="${currentPath === '/settings' ? 'block text-[#ffc300] font-bold text-xl transition-colors duration-200 border-b-2 border-[#ffc300] px-4 py-2 hover:text-[#ffd60a]' : 'block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2'}">${getTranslation('navbar', 'settings')}</a>
                        </li>
                        <li>
                            <button id="logout-btn-mobile" class="block text-gray-200 hover:text-[#ffc300] font-medium text-xl transition-colors duration-200 px-4 py-2 bg-transparent border-none cursor-pointer w-full text-center">${getTranslation('navbar', 'logout')}</button>
                        </li>
                        <li class="mt-4 pt-4 border-t border-[#003566] w-full text-center">
                            <div class="inline-block">
                                <button
                                    type="button"
                                    id="language-accordion-button-mobile"
                                    class="inline-flex justify-center items-center gap-x-1.5 rounded-full bg-[#001d3d] px-4 py-2 text-sm font-semibold text-gray-100 shadow-sm ring-1 ring-inset ring-[#003566] hover:bg-[#003566] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ffc300]"
                                >
                                    <span id="current-language-name-mobile-inner">${getTranslation('common', 'language')}</span>
                                    <svg id="language-accordion-arrow-mobile" class="-mr-1 h-5 w-5 text-gray-400 transform transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div
                                id="language-accordion-content-mobile"
                                class="max-h-0 overflow-hidden transition-all duration-300 ease-in-out mt-2 w-full"
                            >
                                <ul class="py-1 text-center space-y-2">
                                    <li><a href="#" class="block px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" data-lang="es">${getTranslation('common', 'castellano')}</a></li>
                                    <li><a href="#" class="block px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" data-lang="en">${getTranslation('common', 'english')}</a></li>
                                    <li><a href="#" class="block px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" data-lang="gl">${getTranslation('common', 'galician')}</a></li>
                                    <li><a href="#" class="block px-4 py-2 text-sm text-gray-100 hover:bg-[#003566]" data-lang="zh">${getTranslation('common', 'chinese')}</a></li>
                                </ul>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    `;

    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHtml;

        // Function to update the language dropdown button's UI
        const updateLanguageButtonUI = (nameSpanId: string) => {
            const nameSpan = document.getElementById(nameSpanId);
            const currentLang = getCurrentLanguage();

            let languageDisplayName = '';
            switch (currentLang) {
                case 'es':
                    languageDisplayName = getTranslation('common', 'castellano');
                    break;
                case 'en':
                    languageDisplayName = getTranslation('common', 'english');
                    break;
                case 'gl':
                    languageDisplayName = getTranslation('common', 'galician');
                    break;
                case 'zh':
                    languageDisplayName = getTranslation('common', 'chinese');
                    break;
                default:
                    languageDisplayName = getTranslation('common', 'language'); // Fallback
            }

            if (nameSpan) {
                nameSpan.textContent = languageDisplayName;
            }
        };

        // Initialize desktop button UI
        updateLanguageButtonUI('current-language-name-desktop');
        // Initialize mobile inner button UI
        updateLanguageButtonUI('current-language-name-mobile-inner');


        // Desktop Language Dropdown Logic
        const languageDropdownButtonDesktop = document.getElementById('language-dropdown-button-desktop');
        const languageDropdownMenuDesktop = document.getElementById('language-dropdown-menu-desktop');

        if (languageDropdownButtonDesktop && languageDropdownMenuDesktop) {
            languageDropdownButtonDesktop.addEventListener('click', (event) => {
                event.stopPropagation();
                languageDropdownMenuDesktop.classList.toggle('hidden');
                languageDropdownButtonDesktop.setAttribute('aria-expanded', languageDropdownMenuDesktop.classList.contains('hidden') ? 'false' : 'true');
            });

            languageDropdownMenuDesktop.querySelectorAll('a').forEach(item => {
                item.addEventListener('click', (event) => {
                    event.preventDefault();
                    const langId = item.dataset.lang;
                    if (langId) {
                        setLanguage(langId);
                        languageDropdownMenuDesktop.classList.add('hidden');
                        languageDropdownButtonDesktop.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        }

        // Mobile Language Accordion Logic
        const languageAccordionButtonMobile = document.getElementById('language-accordion-button-mobile');
        const languageAccordionContentMobile = document.getElementById('language-accordion-content-mobile');
        const languageAccordionArrowMobile = document.getElementById('language-accordion-arrow-mobile');

        if (languageAccordionButtonMobile && languageAccordionContentMobile && languageAccordionArrowMobile) {
            languageAccordionButtonMobile.addEventListener('click', (event) => {
                event.stopPropagation();
                languageAccordionContentMobile.classList.toggle('max-h-0');
                languageAccordionContentMobile.classList.toggle('max-h-screen'); // Para que se expanda
                languageAccordionArrowMobile.classList.toggle('rotate-180'); // Gira la flecha
            });

            languageAccordionContentMobile.querySelectorAll('a').forEach(item => {
                item.addEventListener('click', (event) => {
                    event.preventDefault();
                    const langId = item.dataset.lang;
                    if (langId) {
                        setLanguage(langId);
                        // Cierra el acordeón de idioma
                        languageAccordionContentMobile.classList.add('max-h-0');
                        languageAccordionContentMobile.classList.remove('max-h-screen');
                        languageAccordionArrowMobile.classList.remove('rotate-180');
                        // Cierra el menú móvil principal (si está abierto)
                        const menuToggle = document.getElementById('menu-toggle') as HTMLInputElement;
                        if (menuToggle) menuToggle.checked = false;
                    }
                });
            });
        }

        // Common click-outside listener for desktop dropdown only (mobile accordion doesn't need it)
        document.addEventListener('click', (event) => {
            if (languageDropdownMenuDesktop && languageDropdownButtonDesktop && !languageDropdownButtonDesktop.contains(event.target as Node) && !languageDropdownMenuDesktop.contains(event.target as Node)) {
                languageDropdownMenuDesktop.classList.add('hidden');
                languageDropdownButtonDesktop.setAttribute('aria-expanded', 'false');
            }
        });

        // Mobile menu toggle logic
        const menuToggle = document.getElementById('menu-toggle') as HTMLInputElement;
        const mobileMenuDropdown = document.querySelector('header .md\\:hidden .peer:checked~div');

        if (menuToggle && mobileMenuDropdown) {
            mobileMenuDropdown.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (event) => {
                    // Cierra el menú principal al hacer clic en un enlace de navegación
                    menuToggle.checked = false;
                });
            });
        }

        // Logout button event listeners
        const logoutBtnDesktop = document.getElementById('logout-btn-desktop');
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');

        if (logoutBtnDesktop) {
            logoutBtnDesktop.addEventListener('click', (event) => {
                event.preventDefault();
                logout();
            });
        }

        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', (event) => {
                event.preventDefault();
                // Close mobile menu first
                if (menuToggle) menuToggle.checked = false;
                logout();
            });
        }
    } else {
        console.error('Navbar container element not found.');
    }
}

document.addEventListener('languageChanged', () => {
  const currentPath = window.location.pathname;
  renderNavbar(currentPath);
  navigateTo(currentPath);
});