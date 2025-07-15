// Script para probar la autenticación del usuario

// Simular localStorage con un token válido
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsImV4cCI6MTc1NzI3MjYyM30.test_signature';

// Función para simular parseJwt
function parseJwt(token) {
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
    console.error('Error al parsear JWT:', err);
    return null;
  }
}

// Función para simular getCurrentUser
function getCurrentUser() {
  const token = mockToken;
  if (!token) return null;
  
  const payload = parseJwt(token);
  if (!payload?.user_id) return null;
  
  return {
    id: payload.user_id,
    username: payload.username || 'Usuario',
    email: payload.email || 'desconocido@example.com'
  };
}

// Probar la función
const user = getCurrentUser();
console.log('Usuario obtenido:', user);

// Simular el nombre del jugador
const player1Name = user?.username || 'Jugador 1';
console.log('Nombre del jugador 1:', player1Name);

// Verificar que no sea "Jugador 1"
if (player1Name !== 'Jugador 1') {
  console.log('✅ ÉXITO: El nombre del usuario se obtiene correctamente');
} else {
  console.log('❌ ERROR: No se pudo obtener el nombre del usuario');
}
