// Script de diagnóstico para problemas de autenticación y perfil
// Ejecutar en la consola del navegador en http://localhost:8080

console.log("🔍 INICIANDO DIAGNÓSTICO DE AUTENTICACIÓN Y PERFIL");
console.log("====================================================");

// 1. Verificar token en localStorage
console.log("\n1. VERIFICANDO TOKEN EN LOCALSTORAGE:");
const token = localStorage.getItem('authToken');
if (token) {
    console.log("✅ Token encontrado en localStorage");
    console.log("Token (primeros 50 caracteres):", token.substring(0, 50) + "...");
    
    // Decodificar JWT para verificar expiración
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("📄 Payload del token:", payload);
        
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.log("❌ Token EXPIRADO. Exp:", new Date(payload.exp * 1000));
        } else {
            console.log("✅ Token válido. Exp:", payload.exp ? new Date(payload.exp * 1000) : "Sin expiración");
        }
    } catch (e) {
        console.log("⚠️ Error al decodificar token:", e.message);
    }
} else {
    console.log("❌ No se encontró token en localStorage");
    console.log("🔍 Verificando todas las claves en localStorage:");
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
    }
}

// 2. Verificar endpoint de verificación
console.log("\n2. VERIFICANDO ENDPOINT /api/verify:");
if (token) {
    fetch('/api/verify', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log("Status /api/verify:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("✅ Respuesta /api/verify:", data);
    })
    .catch(error => {
        console.log("❌ Error en /api/verify:", error);
    });
} else {
    console.log("⏭️ Saltando verificación - no hay token");
}

// 3. Verificar endpoint de perfil
console.log("\n3. VERIFICANDO ENDPOINT /api/profile:");
if (token) {
    fetch('/api/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log("Status /api/profile:", response.status);
        if (response.ok) {
            return response.json();
        } else {
            return response.text();
        }
    })
    .then(data => {
        if (typeof data === 'string') {
            console.log("❌ Error en /api/profile:", data);
        } else {
            console.log("✅ Respuesta /api/profile:", data);
        }
    })
    .catch(error => {
        console.log("❌ Error en /api/profile:", error);
    });
} else {
    console.log("⏭️ Saltando verificación - no hay token");
}

// 4. Verificar si estamos en la página correcta
console.log("\n4. VERIFICANDO CONTEXTO DE PÁGINA:");
console.log("URL actual:", window.location.href);
console.log("Pathname:", window.location.pathname);

// 5. Verificar si hay errores en consola relacionados
console.log("\n5. VERIFICANDO ERRORES PREVIOS:");
console.log("Revisar la consola arriba para errores previos relacionados con:");
console.log("- Fetch errors");
console.log("- 401 Unauthorized");
console.log("- Token inválido");
console.log("- CORS errors");

// 6. Simular proceso de carga de perfil
console.log("\n6. SIMULANDO CARGA DE PERFIL:");
async function testProfileLoad() {
    if (!token) {
        console.log("❌ No se puede cargar perfil sin token");
        return;
    }
    
    try {
        console.log("🔄 Enviando petición a /api/profile...");
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("📡 Response status:", response.status);
        console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const profileData = await response.json();
            console.log("✅ Perfil cargado exitosamente:", profileData);
            
            // Verificar campos requeridos
            const requiredFields = ['id', 'username', 'email'];
            const missingFields = requiredFields.filter(field => !profileData[field]);
            if (missingFields.length > 0) {
                console.log("⚠️ Campos faltantes en perfil:", missingFields);
            }
        } else {
            const errorText = await response.text();
            console.log("❌ Error al cargar perfil:", errorText);
        }
    } catch (error) {
        console.log("❌ Error de red al cargar perfil:", error);
    }
}

setTimeout(testProfileLoad, 1000); // Esperar un segundo para que se completen las otras verificaciones

console.log("\n====================================================");
console.log("🔍 DIAGNÓSTICO COMPLETADO - Revisar resultados arriba");
console.log("====================================================");

