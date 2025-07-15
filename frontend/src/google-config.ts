// Configuración de Google OAuth para desarrollo
export const GOOGLE_CLIENT_ID = 'your-client-id-here.apps.googleusercontent.com';

// Para desarrollo local, podemos usar un mock o configurar correctamente
export const GOOGLE_CONFIG = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: 'http://localhost:9001',
    scope: 'email profile'
};
