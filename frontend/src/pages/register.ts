// src/pages/register.ts

import { navigateTo } from '../router';
import { getTranslation, setLanguage, getCurrentLanguage } from '../i18n';

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
                        <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" id="lang-gl" data-lang="gl" data-i18n="common.galego">${getTranslation('common', 'galego')}</a>
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

                <div id="google-register-button" class="flex justify-center mt-6"></div>

                <p class="text-center text-gray-300 text-base mt-6" data-i18n-html="register.alreadyHaveAccountSentence">
                    ${getTranslation('register', 'alreadyHaveAccount')} <a href="/login" id="login-link" class="text-[#ffc300] hover:underline font-semibold transition-colors duration-200 hover:text-[#ffd60a]" data-i18n="register.loginHere">${getTranslation('register', 'loginHere')}</a>
                </p>
            </div>
            <style>
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

        // Registro normal (sin Google)
        const registerButton = document.getElementById('register-button');
        if (registerButton) {
            registerButton.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const usernameInput = document.getElementById('username') as HTMLInputElement;
                const emailInput = document.getElementById('email') as HTMLInputElement;
                const passwordInput = document.getElementById('password') as HTMLInputElement;
                const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;
                
                const username = usernameInput?.value || '';
                const email = emailInput?.value || '';
                const password = passwordInput?.value || '';
                const confirmPassword = confirmPasswordInput?.value || '';
                
                if (!username || !email || !password || !confirmPassword) {
                    alert(getTranslation('alerts', 'emptyFields'));
                    return;
                }
                
                if (password !== confirmPassword) {
                    alert(getTranslation('alerts', 'passError'));
                    return;
                }

                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, email, password }),
                    });

                    if (response.ok) {
                        alert(getTranslation('alerts', 'successLogin'));
                        navigateTo('/login');
                    } else {
                        const error = await response.json();
                        alert(`${getTranslation('alerts', 'successLogin')}${error.message}`);
                    }
                } catch (error) {
                    console.error(getTranslation('alerts', 'registerError'), error);
                    alert(getTranslation('alerts', 'connection'));
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

        // Google Sign-In callback
        (window as any).handleGoogleCredentialResponse = async (response: any) => {
            try {
                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: response.credential })
                });
                const data = await res.json();
                if (res.ok && data.token) {
                    localStorage.setItem('jwt', data.token);
                    navigateTo('/home');
                } else {
                    alert(data.message || getTranslation('alerts', 'connection'));
                }
            } catch (error) {
                console.error(`${getTranslation('alerts', 'google')}:`, error);
                alert(getTranslation('alerts', 'serverError'));
            }
        };

        const googleDiv = document.getElementById('google-register-button');
        const renderGoogleButton = () => {
            if (window.google?.accounts?.id && googleDiv) {
                window.google.accounts.id.initialize({
                    client_id: '58128894262-ak29ohah5ovkh31dvp2srdbm16thp961.apps.googleusercontent.com',
                    callback: (window as any).handleGoogleCredentialResponse
                });
                window.google.accounts.id.renderButton(googleDiv, {
                    theme: 'outline',
                    size: 'large',
                    width: '100%'
                });
            } else {
                setTimeout(renderGoogleButton, 100);
            }
        };

        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => renderGoogleButton();
            document.head.appendChild(script);
        } else {
            renderGoogleButton();
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

    } else {
        console.error('Elemento con id "app-root" no encontrado para renderizar la página de registro.');
    }
}
