// Script de diagnóstico para autenticación
// Copia y pega este código en la consola del navegador (F12 → Console)

console.log("=== DIAGNÓSTICO DE AUTENTICACIÓN ===");

// 1. Verificar localStorage
console.log("1. Contenido de localStorage:");
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');
console.log("Token:", token ? `${token.substring(0, 20)}...` : "NO ENCONTRADO");
console.log("User:", user);

// 2. Verificar si el token es válido
if (token) {
    console.log("\n2. Probando validez del token:");
    fetch('/api/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log("Status de /api/profile:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Respuesta de /api/profile:", data);
    })
    .catch(error => {
        console.error("Error al probar /api/profile:", error);
    });
} else {
    console.log("\n2. No hay token para probar");
}

// 3. Verificar si hay errores en la consola
console.log("\n3. Verificando errores anteriores en la consola...");

// 4. Probar login si no hay token
if (!token) {
    console.log("\n4. No hay token. ¿Quieres probar el login?");
    console.log("Ejecuta esto para probar login con usuario de prueba:");
    console.log(`
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'testpass123' })
})
.then(r => r.json())
.then(data => {
    console.log('Login response:', data);
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Token guardado, recarga la página');
    }
});
    `);
}

console.log("\n=== FIN DEL DIAGNÓSTICO ===");

