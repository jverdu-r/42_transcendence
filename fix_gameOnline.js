const fs = require('fs');

// Leer el archivo
let content = fs.readFileSync('./frontend/src/pages/gameOnline.ts', 'utf8');

// Obtener el usuario actual al inicio de la función showGameView
const getUserCurrentCode = `
  // Obtener usuario actual
  const currentUser = getCurrentUser();
  const currentUserName = currentUser?.username || 'Usuario';
`;

// Insertar el código para obtener el usuario al inicio de showGameView
content = content.replace(
  'function showGameView(gameId: string): void {',
  `function showGameView(gameId: string): void {${getUserCurrentCode}`
);

// Reemplazar los títulos iniciales para usar nombres dinámicos
content = content.replace(
  '<h3 class="text-xl font-bold text-yellow-400" id="score1-title">🟡 Jugador 1</h3>',
  '<h3 class="text-xl font-bold text-yellow-400" id="score1-title">🟡 Jugador 1</h3>'
);

content = content.replace(
  '<h3 class="text-xl font-bold text-blue-400" id="score2-title">🔵 Jugador 2</h3>',
  '<h3 class="text-xl font-bold text-blue-400" id="score2-title">🔵 Jugador 2</h3>'
);

// Reemplazar la lógica de actualización de títulos
content = content.replace(
  /if \(playerNumber === 1\) \{\s*score1Title\.innerHTML = '🟡 Jugador 1 \(Tú\)';[\s\S]*?score2Title\.innerHTML = '🔵 Jugador 2 \(Tú\)';/g,
  `if (playerNumber === 1) {
        score1Title.innerHTML = \`🟡 \${currentUserName} (Tú)\`;
        score2Title.innerHTML = isPvE ? '🔵 IA (Oponente)' : '🔵 Oponente';
      } else {
        score1Title.innerHTML = isPvE ? '🟡 IA (Oponente)' : '🟡 Oponente';
        score2Title.innerHTML = \`🔵 \${currentUserName} (Tú)\`;`
);

// Escribir el archivo actualizado
fs.writeFileSync('./frontend/src/pages/gameOnline.ts', content);

console.log('✅ Archivo gameOnline.ts actualizado correctamente');
