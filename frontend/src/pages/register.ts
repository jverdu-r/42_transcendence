// src/pages/register.ts

import { navigateTo } from '../router';
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n'; // Importa las funciones de i18n

export function renderRegister(): void {
    const registerHtml = `
        <div
            class="min-h-screen flex justify-center items-center p-4 sm:p-8 bg-[#000814] font-inter text-gray-100 antialiased relative overflow-hidden"
        >
            <div class="absolute inset-0 z-0 opacity-20 register-bg-pattern"></div>
            <div class="absolute inset-0 z-0 bg-gradient-to-br from-[#000814] via-[#001d3d] to-[#000814] opacity-30 animate-pulse-subtle"></div>

            <div class="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
                <div class="relative inline-block text-left">
                    <button
                        type="button"
                        id="language-dropdown-button"
                        class="inline-flex justify-center items-center gap-x-1.5 rounded-full bg-white bg-opacity-10 px-4 py-2 text-sm font-semibold text-gray-100 shadow-sm ring-1 ring-inset ring-[#003566] hover:bg-opacity-20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
                    >
                        <span data-i18n="common.language">${getTranslation('common', 'language')}</span>
                        <svg class="-mr-1 h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <div id="language-dropdown-menu" class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[#001d3d] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden" role="menu" aria-orientation="vertical" aria-labelledby="language-dropdown-button" tabindex="-1">
                        <div class="py-1" role="none">
                            <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" id="lang-es" data-lang="es" data-i18n="common.castellano">${getTranslation('common', 'castellano')}</a>
                            <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" id="lang-en" data-lang="en" data-i18n="common.english">${getTranslation('common', 'english')}</a>
                            <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" id="lang-gl" data-lang="gl" data-i18n="common.galician">${getTranslation('common', 'galician')}</a>
                            <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" id="lang-zh" data-lang="zh" data-i18n="common.chinese">${getTranslation('common', 'chinese')}</a>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="relative bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-12 w-full max-w-md mx-auto border border-[#003566] transform transition-all duration-500 ease-in-out z-10"
            >
                <div class="text-center mb-8">
                    <h1 class="text-4xl sm:text-5xl font-display font-extrabold text-[#ffc300] mb-2 drop-shadow-md" data-i18n="register.title">${getTranslation('register', 'title')}</h1>
                    <h2 class="text-2xl sm:text-3xl font-display font-extrabold text-gray-100 mb-4 drop-shadow-md" data-i18n="register.joinExperience">${getTranslation('register', 'joinExperience')}</h2>
                    <p class="text-base sm:text-lg text-gray-300" data-i18n="register.subtitle">${getTranslation('register', 'subtitle')}</p>
                </div>

                <form class="space-y-6">
                    <div class="relative z-0 group">
                        <input
                            type="text"
                            id="username"
                            name="username"
                            class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer"
                            placeholder=" "
                            required
                        />
                        <label
                            for="username"
                            class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                            data-i18n="register.usernameLabel"
                        >${getTranslation('register', 'usernameLabel')}</label>
                    </div>

                    <div class="relative z-0 group">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer"
                            placeholder=" "
                            required
                        />
                        <label
                            for="email"
                            class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                            data-i18n="register.emailLabel"
                        >${getTranslation('register', 'emailLabel')}</label>
                    </div>

                    <div class="relative z-0 group">
                        <input
                            type="password"
                            id="password"
                            name="password"
                            class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer"
                            placeholder=" "
                            required
                        />
                        <label
                            for="password"
                            class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                            data-i18n="register.passwordLabel"
                        >${getTranslation('register', 'passwordLabel')}</label>
                    </div>

                    <div class="relative z-0 group">
                        <input
                            type="password"
                            id="confirm-password"
                            name="confirm-password"
                            class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer"
                            placeholder=" "
                            required
                        />
                        <label
                            for="confirm-password"
                            class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                            data-i18n="register.confirmPasswordLabel"
                        >${getTranslation('register', 'confirmPasswordLabel')}</label>
                    </div>

                    <button
                        type="submit"
                        id="register-button"
                        class="w-full py-3 mt-6 rounded-xl bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold text-xl shadow-lg hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75"
                        data-i18n="register.registerButton"
                    >${getTranslation('register', 'registerButton')}</button>
                </form>

                <p class="text-center text-gray-400 text-sm mt-6" data-i18n="register.or">${getTranslation('register', 'or')}</p>

                <button id="google-register-button" 
                        class="w-full mt-4 rounded-xl shadow 
                               bg-[#001d3d] border border-[#003566] text-[#e0e0e0] text-sm font-semibold h-10 px-3 relative overflow-hidden 
                               flex items-center justify-center space-x-3 transition-colors duration-200 
                               hover:bg-[#002c53] hover:shadow-lg 
                               focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75 
                               disabled:opacity-50 disabled:cursor-not-allowed">
                    <div class="flex items-center">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" class="h-5 w-5 mr-3 flex-shrink-0">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        <span class="flex-grow text-left" data-i18n="register.registerWithGoogle">${getTranslation('register', 'registerWithGoogle')}</span>
                    </div>
                </button>

                <p class="text-center text-gray-300 text-base mt-6" data-i18n-html="register.alreadyHaveAccountSentence">
                    ¿Ya tienes una cuenta? <a href="/login" id="login-link" class="text-[#ffc300] hover:underline font-semibold transition-colors duration-200 hover:text-[#ffd60a]" data-i18n="register.loginHere">Iniciar sesión aquí</a>
                </p>
            </div>
            <style>
                /* Custom styling for register page - patterns and animations can stay as they are not button-specific */
                .register-bg-pattern {
                    background: radial-gradient(circle at center, rgba(0, 53, 102, 0.2) 1px, transparent 1px),
                                radial-gradient(circle at center, rgba(0, 29, 61, 0.2) 1px, transparent 1px);
                    background-size: 30px 30px;
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 10s infinite ease-in-out;
                }
                @keyframes pulse-subtle {
                    0% { opacity: 0.3; }
                    50% { opacity: 0.45; }
                    100% { opacity: 0.3; }
                }
                .peer:focus ~ label,
                .peer:not(:placeholder-shown) ~ label {
                    color: #ffc300;
                    transform: translateY(-24px) scale(0.75);
                }
            </style>
        </div>
    `;

    const appRoot = document.getElementById('app-root') as HTMLElement;
    if (appRoot) {
        appRoot.innerHTML = registerHtml;

        const registerButton = document.getElementById('register-button');
        if (registerButton) {
            registerButton.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const usernameInput = document.getElementById('username') as HTMLInputElement;
                const emailInput = document.getElementById('email') as HTMLInputElement;
                const passwordInput = document.getElementById('password') as HTMLInputElement;
                const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;
                
                if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                    console.error('No se encontraron todos los campos necesarios');
                    return;
                }
                
                const username = usernameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                // Validaciones
                if (!username || !email || !password || !confirmPassword) {
                    alert('Por favor, completa todos los campos');
                    return;
                }
                
                if (password !== confirmPassword) {
                    alert('Las contraseñas no coinciden');
                    return;
                }
                
                if (password.length < 6) {
                    alert('La contraseña debe tener al menos 6 caracteres');
                    return;
                }
                
                // Validación básica de email
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    alert('Por favor, ingresa un email válido');
                    return;
                }
                
                try {
                    // Deshabilitar botón durante la solicitud
                    registerButton.setAttribute('disabled', 'true');
                    registerButton.textContent = 'Registrando...';
                    
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.token) {
                        // Guardar token y datos del usuario en localStorage
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        
                        console.log('Registro exitoso:', data.user);
                        alert('Registro exitoso! Bienvenido/a!');
                        navigateTo('/home');
                    } else {
                        // Mostrar error
                        alert(data.message || 'Error al registrarse');
                        console.error('Error de registro:', data);
                    }
                } catch (error) {
                    console.error('Error de red al hacer registro:', error);
                    alert('Error de conexión. Por favor, intenta nuevamente.');
                } finally {
                    // Rehabilitar botón
                    registerButton.removeAttribute('disabled');
                    registerButton.textContent = getTranslation('register', 'registerButton');
                }
            });
        }

        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo('/login');
            });
        }

        const languageDropdownButton = document.getElementById('language-dropdown-button');
        const languageDropdownMenu = document.getElementById('language-dropdown-menu');
        if (languageDropdownButton && languageDropdownMenu) {
            languageDropdownButton.addEventListener('click', () => {
                languageDropdownMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (event) => {
                if (!languageDropdownButton.contains(event.target as Node) && !languageDropdownMenu.contains(event.target as Node)) {
                    languageDropdownMenu.classList.add('hidden');
                }
            });

            languageDropdownMenu.querySelectorAll('[data-lang]').forEach(item => {
                item.addEventListener('click', (event) => {
                    event.preventDefault();
                    const newLang = (event.target as HTMLElement).getAttribute('data-lang');
                    if (newLang) {
                        setLanguage(newLang);
                        renderRegister();
                        languageDropdownMenu.classList.add('hidden');
                    }
                });
            });
        }

        applyTranslations();
        window.removeEventListener('languageChange', applyTranslations);
        window.addEventListener('languageChange', applyTranslations);
    } else {
        console.error('Elemento con id "app-root" no encontrado para renderizar la página de registro.');
    }
}

function applyTranslations(): void {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const [component, textKey] = key.split('.');
            const translatedText = getTranslation(component, textKey);
            if (element.tagName === 'INPUT') {
                // Not needed for floating labels managed by CSS.
            } else if (element.tagName === 'BUTTON' || element.tagName === 'SPAN' || element.tagName === 'P' || element.tagName === 'H1' || element.tagName === 'LABEL' || element.tagName === 'A') {
                element.textContent = translatedText;
            }
        }
    });

    // Handle special case for '¿Ya tienes una cuenta? Iniciar sesión aquí'
    const alreadyHaveAccountElement = document.querySelector('[data-i18n-html="register.alreadyHaveAccountSentence"]');
    if (alreadyHaveAccountElement) {
        const part1 = getTranslation('register', 'alreadyHaveAccount') || "¿Ya tienes una cuenta?"; // Fallback if key is missing
        const linkText = getTranslation('register', 'loginHere');
        alreadyHaveAccountElement.innerHTML = `${part1} <a href="/login" id="login-link" class="text-[#ffc300] hover:underline font-semibold transition-colors duration-200 hover:text-[#ffd60a]">${linkText}</a>`;
    }
}