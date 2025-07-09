// src/auth.ts

// Datos de usuario hardcodeados
export interface User {
    id: number;
    username: string;
    email: string;
}

// Ejemplo de datos de usuario
const dummyUser: User = {
    id: 1,
    username: "testuser",
    email: "testuser@example.com"
};

// Estado de autenticación (inicialmente deslogueado)
let authenticated = false;

// Simula que el usuario está autenticado
export function isAuthenticated(): boolean {
    return authenticated;
}

// Obtiene el usuario actual hardcoded
export function getCurrentUser(): User | null {
    return authenticated ? dummyUser : null;
}

// Simula login
export function login(username: string, password: string): boolean {
    // Simula autenticación exitosa
    if (username && password) {
        authenticated = true;
        console.log("Usuario logueado exitosamente");
        return true;
    }
    return false;
}

// Simula logout
export function logout(): void {
    authenticated = false;
    console.log("Usuario deslogueado");
    // Redirigir al login
    window.location.href = '/login';
}
