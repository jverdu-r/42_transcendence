// src/auth.ts

import { navigateTo } from './router';

// Interfaz para los datos del usuario
export interface User {
    id: number;
    username: string;
    email: string;
    created_at?: string;
}

// Verificar si el usuario está autenticado
export function isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) {
        return false;
    }
    
    try {
        // Verificar si el token ha expirado (JWT básico)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
            // Token expirado, limpiar localStorage
            logout();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar token:', error);
        logout();
        return false;
    }
}

// Obtener el token de autenticación
export function getAuthToken(): string | null {
    return localStorage.getItem('authToken');
}

// Obtener datos del usuario
export function getCurrentUser(): User | null {
    const userData = localStorage.getItem('userData');
    if (!userData) {
        return null;
    }
    
    try {
        return JSON.parse(userData);
    } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
        return null;
    }
}

// Cerrar sesión
export function logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigateTo('/login');
}

// Verificar autenticación en el servidor
export async function verifyAuthWithServer(): Promise<boolean> {
    const token = getAuthToken();
    if (!token) {
        return false;
    }
    
    try {
        const response = await fetch('/api/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Actualizar datos del usuario si es necesario
            if (data.user) {
                localStorage.setItem('userData', JSON.stringify(data.user));
            }
            return true;
        } else {
            // Token inválido o expirado
            logout();
            return false;
        }
    } catch (error) {
        console.error('Error al verificar autenticación con el servidor:', error);
        return false;
    }
}

// Middleware para proteger rutas
export function requireAuth(): boolean {
    if (!isAuthenticated()) {
        console.log('Usuario no autenticado, redirigiendo a login');
        navigateTo('/login');
        return false;
    }
    return true;
}

// Middleware para rutas que solo deben ser accesibles para usuarios no autenticados
export function requireGuest(): boolean {
    if (isAuthenticated()) {
        console.log('Usuario ya autenticado, redirigiendo a home');
        navigateTo('/home');
        return false;
    }
    return true;
}

// Realizar una petición autenticada
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    // Si obtenemos un 401, significa que el token no es válido
    if (response.status === 401) {
        logout();
        throw new Error('No autorizado');
    }
    
    return response;
}

