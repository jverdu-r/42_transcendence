// /src/database.ts

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:9000';
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:8000';

export async function getUserProfile(userId: string): Promise<DbService.UserProfile | null> {
  try {
    const res = await fetch(`${DB_SERVICE_URL}/api/users/${userId}/profile`);
    if (!res.ok) return null;
    return (await res.json()) as DbService.UserProfile;
  } catch (error) {
    console.warn(`No se pudo obtener el perfil del usuario ${userId}`);
    return null;
  }
}

export async function getUserById(userId: string): Promise<DbService.User | null> {
  try {
    const res = await fetch(`${DB_SERVICE_URL}/api/users/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as DbService.User;
  } catch (error) {
    console.warn(`No se pudo obtener el usuario ${userId}`);
    return null;
  }
}