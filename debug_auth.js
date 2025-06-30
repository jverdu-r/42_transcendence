// Script de diagnóstico para verificar el estado de autenticación
// Ejecutar en la consola del navegador en http://localhost:8080

console.log('=== DIAGNÓSTICO DE AUTENTICACIÓN ===');

// 1. Verificar si existe el token en localStorage
const token = localStorage.getItem('authToken');
console.log('1. Token en localStorage:', token ? 'EXISTE' : 'NO EXISTE');
if (token) {
    console.log('   Token:', token.substring(0, 20) + '...');
    
    // 2. Verificar si el token es válido (no expirado)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp < now;
        console.log('2. Token expirado:', isExpired ? 'SÍ' : 'NO');
        console.log('   Expira en:', new Date(payload.exp * 1000));
        console.log('   Ahora:', new Date());
    } catch (e) {
        console.log('2. Error al decodificar token:', e.message);
    }
}

// 3. Verificar la ruta actual
console.log('3. Ruta actual:', window.location.pathname);

// 4. Probar la función isAuthenticated si existe
if (typeof isAuthenticated === 'function') {
    console.log('4. isAuthenticated():', isAuthenticated());
} else {
    console.log('4. Función isAuthenticated no disponible');
}

// 5. Probar las APIs directamente
async function testAPIs() {
    console.log('5. Probando APIs...');
    
    if (!token) {
        console.log('   No se puede probar APIs sin token');
        return;
    }
    
    try {
        // Probar /api/verify
        const verifyResponse = await fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('   /api/verify:', verifyResponse.status, verifyResponse.statusText);
        
        // Probar /api/profile
        const profileResponse = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('   /api/profile:', profileResponse.status, profileResponse.statusText);
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('   Datos del perfil:', profileData);
        }
    } catch (error) {
        console.log('   Error al probar APIs:', error.message);
    }
}

testAPIs();

console.log('=== FIN DEL DIAGNÓSTICO ===');

