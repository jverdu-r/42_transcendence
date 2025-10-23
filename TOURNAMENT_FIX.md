# Fix: Corrección del ganador incorrecto en torneos

## 🐛 Problema identificado

En los torneos, siempre se guardaba como ganador al jugador que aparecía a la **izquierda** en el cuadro de eliminatorias, independientemente de quién ganara realmente la partida.

## 🔍 Análisis de la causa

### Orden de los jugadores en la base de datos
- **Jugador izquierda**: `participants[0]` (primer registro por `id` en tabla `participants`)
- **Jugador derecha**: `participants[1]` (segundo registro por `id` en tabla `participants`)

### El problema: Desincronización de orden
1. El **frontend** crea el juego pasando el orden correcto desde la BD:
   ```typescript
   {
     player1_id, player2_id,
     player1_name, player2_name
   }
   ```

2. El **game-service** guarda esta info en `game.tournamentInfo`

3. Los jugadores se conectan al **WebSocket** (pueden conectarse en cualquier orden):
   - `game.players[0]` = quien se conectó **primero**
   - `game.players[1]` = quien se conectó **segundo**

4. Al terminar, el juego envía scores basados en el orden de conexión:
   - `score1` = puntuación de `game.players[0]`
   - `score2` = puntuación de `game.players[1]`

5. El **db-service** asume que los scores corresponden al orden de la BD:
   - `score1` → `participants[0]` (jugador izquierda)
   - `score2` → `participants[1]` (jugador derecha)

6. **Si el orden de conexión ≠ orden en BD** → ❌ **Ganador incorrecto**

## ✅ Solución aplicada

Se modificó `game-service/src/server.ts`, función `saveGameStats()` (líneas 526-546):

```typescript
let score1 = game.gameState?.puntuacion?.jugador1 ?? 0;
let score2 = game.gameState?.puntuacion?.jugador2 ?? 0;

// CORRECCIÓN PARA TORNEOS: Reordenar scores según el orden de la BD
if (game.tournamentInfo) {
  const p1Name = player1?.nombre;
  const p2Name = player2?.nombre;
  const dbPlayer1Name = game.tournamentInfo.player1_name;
  const dbPlayer2Name = game.tournamentInfo.player2_name;
  
  // Verificar si el orden de jugadores en WebSocket es inverso al orden en BD
  if (p1Name === dbPlayer2Name && p2Name === dbPlayer1Name) {
    // Los jugadores están invertidos → intercambiar scores
    fastify.log.info(`🔄 TORNEO: Invirtiendo scores...`);
    [score1, score2] = [score2, score1];  // Swap scores
  } else {
    fastify.log.info(`✅ TORNEO: Scores en orden correcto`);
  }
}
```

## 🎯 Flujo corregido

```
1. Frontend crea juego con player1_name, player2_name
   ↓
2. game-service guarda en game.tournamentInfo
   ↓
3. Jugadores se conectan (en cualquier orden)
   ↓
4. Juego termina
   ↓
5. saveGameStats() detecta si hay inversión
   ↓
6. Si players[0]=player2_name → SWAP scores ✅
   ↓
7. Envía scores corregidos a auth-service
   ↓
8. auth-service guarda en BD → ✅ Ganador correcto
```

## 📝 Logs para debugging

Ahora el sistema registra información útil:
- `🔄 TORNEO: Invirtiendo scores` - Se detectó inversión y se corrigió
- `✅ TORNEO: Scores en orden correcto` - No hubo necesidad de corregir

## 🧪 Para probar el fix

1. Crear un torneo con varios jugadores
2. Jugar partidas donde el jugador de la **derecha** gane
3. Verificar que el cuadro de eliminatorias muestre correctamente al ganador
4. Revisar los logs del game-service para ver si se aplicó corrección

## 📍 Archivos modificados

- `/game-service/src/server.ts` - Función `saveGameStats()` (líneas 526-546)

---

**Fecha**: 2025-10-23
**Estado**: ✅ Aplicado y listo para probar
