// src/pages/login.ts

import { navigateTo } from '../router';
import { getTranslation, setLanguage } from '../i18n';

export function renderLoginPage(): void {
  const appRoot = document.getElementById('app-root');
  if (!appRoot) return;

  // Limpiar solo el contenido, sin asumir estructura
  appRoot.innerHTML = '';

  const loginContainer = document.createElement('div');
  loginContainer.innerHTML = `
    <div
      class="min-h-screen flex justify-center items-center p-4 sm:p-8 bg-[#000814] font-inter text-gray-100 antialiased relative overflow-hidden"
    >
      <div class="absolute inset-0 z-0 opacity-20 login-bg-pattern"></div>
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
              <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" data-lang="es">${getTranslation('common', 'castellano')}</a>
              <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" data-lang="en">${getTranslation('common', 'english')}</a>
              <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" data-lang="gl">${getTranslation('common', 'galego')}</a>
              <a href="#" class="text-gray-300 block px-4 py-2 text-sm hover:bg-[#002c53]" role="menuitem" tabindex="-1" data-lang="zh">${getTranslation('common', 'chinese')}</a>
            </div>
          </div>
        </div>
      </div>

      <div class="relative bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-12 w-full max-w-md mx-auto border border-[#003566] transform transition-all duration-500 ease-in-out z-10">
        <div class="text-center mb-8">
          <h1 class="text-4xl sm:text-5xl font-display font-extrabold text-[#ffc300] mb-2 drop-shadow-md">${getTranslation('login', 'title')}</h1>
          <h2 class="text-2xl sm:text-3xl font-display font-extrabold text-gray-100 mb-4 drop-shadow-md">${getTranslation('login', 'welcomeBack')}</h2>
          <p class="text-base sm:text-lg text-gray-300">${getTranslation('login', 'subtitle')}</p>
        </div>

        <form class="space-y-6">
          <div class="relative z-0 group">
            <input type="email" id="email" name="email" class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer" placeholder=" " required />
            <label for="email" class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
              ${getTranslation('login', 'emailLabel')}
            </label>
          </div>

          <div class="relative z-0 group">
            <input type="password" id="password" name="password" class="block py-2.5 px-0 w-full text-lg text-gray-100 bg-transparent border-0 border-b-2 border-[#003566] appearance-none focus:outline-none focus:ring-0 focus:border-[#ffc300] peer" placeholder=" " required />
            <label for="password" class="peer-focus:font-medium absolute text-lg text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-[#ffc300] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
              ${getTranslation('login', 'passwordLabel')}
            </label>
          </div>

          <button type="submit" id="login-button" class="w-full py-3 mt-6 rounded-xl bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#000814] font-bold text-xl shadow-lg hover:from-[#ffd60a] hover:to-[#ffc300] transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffc300] focus:ring-opacity-75">
            ${getTranslation('login', 'loginButton')}
          </button>
        </form>

        <p class="text-center text-gray-400 text-sm mt-6">${getTranslation('login', 'or')}</p>

        <div id="google-login-button" class="flex justify-center mt-6"></div>

        <p class="text-center text-gray-300 text-base mt-6">
          ${getTranslation('login', 'noAccountYet')} 
          <a href="/register" id="create-account-link" class="text-[#ffc300] hover:underline font-semibold transition-colors duration-200 hover:text-[#ffd60a]">
            ${getTranslation('register', 'registerButton')}
          </a>
        </p>
      </div>

      <style>
        .login-bg-pattern {
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

  appRoot.appendChild(loginContainer);

  // --- Eventos ---

  // Login normal
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', async (event) => {
      event.preventDefault();
      const email = (document.getElementById('email') as HTMLInputElement)?.value || '';
      const password = (document.getElementById('password') as HTMLInputElement)?.value || '';

      if (!email || !password) return alert(getTranslation('alerts', 'emptyFields'));

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          if (data.requires_2fa) {
            const code = prompt(getTranslation('alerts', 'enter2FACode') || 'Ingresa el código de autenticador');
            if (!code) return;

            const verifyRes = await fetch('/api/auth/verify-2fa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ temp_token: data.temp_token, code }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.token) {
              localStorage.setItem('jwt', verifyData.token);
              if (verifyData.user.language) {
                localStorage.setItem('language', verifyData.user.language);
                setLanguage(verifyData.user.language);
              }
              navigateTo('/home');
            } else {
              alert(verifyData.message || getTranslation('alerts', 'invalid2FACode'));
            }
          } else if (data.token) {
            localStorage.setItem('jwt', data.token);
            if (data.user.language) {
              localStorage.setItem('language', data.user.language);
              setLanguage(data.user.language);
            }
            navigateTo('/home');
          }
        } else {
          alert(data.message || getTranslation('alerts', 'failLogin'));
        }
      } catch (e) {
        alert(getTranslation('alerts', 'connection'));
        console.error(e);
      }
    });
  }

  // Google Login
  (window as any).handleGoogleCredentialResponse = async (response: any) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requires_2fa) {
          const code = prompt(getTranslation('alerts', 'enter2FACode') || 'Ingresa el código de autenticador');
          if (!code) return;

          const verifyRes = await fetch('/api/auth/verify-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: data.temp_token, code }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.token) {
            localStorage.setItem('jwt', verifyData.token);
            if (verifyData.user.language) {
              localStorage.setItem('language', verifyData.user.language);
              setLanguage(verifyData.user.language);
            }
            navigateTo('/home');
          } else {
            alert(verifyData.message || getTranslation('alerts', 'invalid2FACode'));
          }
        } else if (data.token) {
          localStorage.setItem('jwt', data.token);
          if (data.user.language) {
            localStorage.setItem('language', data.user.language);
            setLanguage(data.user.language);
          }
          navigateTo('/home');
        }
      } else {
        alert(data.message || getTranslation('alerts', 'failGoogleLogin'));
      }
    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      alert(getTranslation('alerts', 'connection'));
    }
  };

  // Render Google Button
  const renderGoogleButton = () => {
    const googleLoginDiv = document.getElementById('google-login-button');
    if (window.google?.accounts?.id && googleLoginDiv) {
      window.google.accounts.id.initialize({
        client_id: "58128894262-ak29ohah5ovkh31dvp2srdbm16thp961.apps.googleusercontent.com",
        callback: (window as any).handleGoogleCredentialResponse,
      } as any);
      window.google.accounts.id.renderButton(googleLoginDiv, {
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

  // Navegación a registro
  const createAccountLink = document.getElementById('create-account-link');
  if (createAccountLink) {
    createAccountLink.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo('/register');
    });
  }

  // Selector de idioma
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
          // ✅ Usa navigateTo para recargar la página y mantener consistencia
          navigateTo('/login');
          languageDropdownMenu.classList.add('hidden');
        }
      });
    });
  }
}