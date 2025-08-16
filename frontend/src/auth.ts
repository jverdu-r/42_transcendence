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
    console.error(':x: Error al parsear JWT:', err);
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
      console.error('Error al obtener configuraciones:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error en la petición de configuraciones:', error);
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
      console.error('Error al obtener datos de usuario:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error en la petición de datos de usuario:', error);
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
          username: user.username || 'Usuario',
          email: user.email || 'desconocido@example.com'
        };
      }
    } catch (e) {
      console.error('Error parsing local user:', e);
    }
  }
  
  return {
    id: payload.user_id,
    username: payload.username || 'Usuario',
    email: payload.email || 'desconocido@example.com'
  };
}

// Función para hacer login y aplicar configuraciones
export async function loginUser(token: string): Promise<void> {
  localStorage.setItem('jwt', token);
  console.log(':candado: Sesión iniciada');
  
  // Aplicar configuraciones del usuario
  await applyUserSettings();
}
export async function logout(): Promise<void> {
  const token = localStorage.getItem('jwt');

  if (token) {
    try {
      // Llama al backend para cerrar sesión
      const response = await fetch('/api/auth//logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' // por si usas cookies
      });

      if (!response.ok) {
        console.warn('⚠️ El backend no cerró sesión correctamente');
      }
    } catch (error) {
      console.warn('❌ Error al cerrar sesión en el servidor:', error);
    }
  }

  // Limpiar el cliente
  localStorage.removeItem('jwt');
  localStorage.removeItem('language');
  localStorage.removeItem('notifications');
  localStorage.removeItem('doubleFactor');
  localStorage.removeItem('game_difficulty');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  localStorage.removeItem('email');

  console.log('🔐 Sesión cerrada (cliente + servidor)');
  
  // Redirige
  window.location.href = '/login';
}
