import { getTranslation } from './i18n';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface UserSettings {
  language: string;
  notifications: string;
  doubleFactor: string;
  game_difficulty: string;
}

// Obtiene el JWT del localStorage
function getToken(): string | null {
  return localStorage.getItem('jwt');
}

// Decodifica el JWT manualmente (sin librerías)
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error(getTranslation('auth', 'errorParsingJWT'), err);
    return null;
  }
}

// Función para obtener configuraciones del usuario
export async function getUserSettings(): Promise<UserSettings | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/settings/config', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(getTranslation('auth', 'errorGettingSettings'), response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(getTranslation('auth', 'errorInSettingsRequest'), error);
    return null;
  }
}

// Función para obtener datos del usuario
export async function fetchUserProfile(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/settings/user_data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(getTranslation('auth', 'errorGettingUserData'), response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(getTranslation('auth', 'errorInUserDataRequest'), error);
    return null;
  }
}

// Función para aplicar configuraciones del usuario
export async function applyUserSettings(): Promise<void> {
  const settings = await getUserSettings();
  if (!settings) return;

  // Aplicar idioma
  if (settings.language) {
    localStorage.setItem('language', settings.language);
    // Disparar evento para actualizar el idioma en toda la app
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: settings.language }));
  }

  // Guardar configuraciones
  localStorage.setItem('notifications', settings.notifications);
  localStorage.setItem('doubleFactor', settings.doubleFactor);
  localStorage.setItem('game_difficulty', settings.game_difficulty);
}

// Función para obtener configuración guardada
export function getSetting(key: string): string | null {
  return localStorage.getItem(key);
}

// Función para guardar configuración
export function setSetting(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  
  const payload = parseJwt(token);
  const now = Math.floor(Date.now() / 1000);
  return payload?.exp && payload.exp > now;
}

export function getCurrentUser(): User | null {
  const token = getToken();
  if (!token) return null;
  
  const payload = parseJwt(token);
  if (!payload?.user_id) return null;
  
  // Leer datos actualizados de localStorage si existen
  const localUser = localStorage.getItem('user');
  if (localUser) {
    try {
      const user = JSON.parse(localUser);
      if (user.id === payload.user_id) {
        return {
          id: user.id,
          username: user.username || getTranslation('auth', 'user'),
          email: user.email || getTranslation('auth', 'unknownEmail')
        };
      }
    } catch (e) {
      console.error(getTranslation('auth', 'errorParsingLocalUser'), e);
    }
  }
  
  return {
    id: payload.user_id,
    username: payload.username || getTranslation('auth', 'user'),
    email: payload.email || getTranslation('auth', 'unknownEmail')
  };
}

// Función para hacer login y aplicar configuraciones
export async function loginUser(token: string): Promise<void> {
  localStorage.setItem('jwt', token);
  console.log(getTranslation('auth', 'sessionStarted'));
  
  // Aplicar configuraciones del usuario
  await applyUserSettings();
}

export function logout(): void {
  const user = getCurrentUser();
  if (user && user.id) {
    fetch('/api/auth/logout-redis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    }).catch(() => {});
  }
  localStorage.removeItem('jwt');
  localStorage.removeItem('language');
  localStorage.removeItem('notifications');
  localStorage.removeItem('doubleFactor');
  localStorage.removeItem('game_difficulty');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  
  console.log(getTranslation('auth', 'sessionClosed'));
  window.location.href = '/login';
// Eliminar usuario de Redis al cerrar la web
window.addEventListener('beforeunload', () => {
  const user = getCurrentUser();
  if (user && user.id) {
    navigator.sendBeacon('/api/auth/logout-redis', JSON.stringify({ user_id: user.id }));
  }
});
}
