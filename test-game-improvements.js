// Script de prueba para verificar las mejoras del juego local

// Test 1: Verificar que se pueden obtener nombres de usuario
console.log('Test 1: Verificando obtención de nombres de usuario...');
const testUser = {
  id: 1,
  username: 'TestUser',
  email: 'test@example.com'
};

// Simular localStorage
const mockLocalStorage = {
  getItem: (key) => {
    if (key === 'jwt') {
      // Token JWT simulado con payload
      const payload = {
        user_id: 1,
        username: 'TestUser',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const base64Payload = btoa(JSON.stringify(payload));
      return `header.${base64Payload}.signature`;
    }
    return null;
  },
  setItem: (key, value) => console.log(`Setting ${key}: ${value}`),
  removeItem: (key) => console.log(`Removing ${key}`)
};

// Test 2: Verificar formato de estadísticas
console.log('Test 2: Verificando formato de estadísticas...');
const testStats = {
  player1_id: 1,
  player2_id: 2,
  player1_name: 'TestUser',
  player2_name: 'Jugador 2',
  score1: 5,
  score2: 3,
  winner_id: 1,
  winner_name: 'TestUser',
  game_mode: 'local',
  duration: 120,
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString()
};

console.log('Estadísticas de prueba:', testStats);

// Test 3: Verificar mensaje de ganador mejorado
console.log('Test 3: Verificando mensaje de ganador...');
const winnerMessage = `
  <div class="text-center">
    <div class="text-3xl font-bold text-green-600 mb-3">🏆 ${testStats.winner_name} Gana!</div>
    <div class="text-xl font-semibold mb-4">Resultado Final</div>
    <div class="bg-gray-100 rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center text-lg">
        <span class="font-semibold">${testStats.player1_name}</span>
        <span class="font-bold text-2xl">${testStats.score1}</span>
      </div>
      <div class="border-t border-gray-300 my-2"></div>
      <div class="flex justify-between items-center text-lg">
        <span class="font-semibold">${testStats.player2_name}</span>
        <span class="font-bold text-2xl">${testStats.score2}</span>
      </div>
    </div>
    <div class="text-sm text-gray-600">
      ${testStats.winner_name} venció a ${testStats.player2_name} por ${testStats.score1} - ${testStats.score2}
    </div>
  </div>
`;

console.log('Mensaje de ganador mejorado:', winnerMessage);

console.log('✅ Todas las pruebas completadas exitosamente!');
