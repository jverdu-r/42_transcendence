// Configuración de Google OAuth para desarrollo
export const GOOGLE_CLIENT_ID = '910896001109-i750tf3lr67obd2rf3nkgt0j9puh1i48.apps.googleusercontent.com';

// Para desarrollo local, podemos usar un mock o configurar correctamente
export const GOOGLE_CONFIG = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:9443',
    scope: 'email profile'
};
