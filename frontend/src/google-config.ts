// Configuración de Google OAuth para desarrollo
export const GOOGLE_CLIENT_ID = 'your-client-id-here.apps.googleusercontent.com';

// Para desarrollo local, podemos usar un mock o configurar correctamente
export const GOOGLE_CONFIG = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:9443',
    scope: 'email profile'
};
