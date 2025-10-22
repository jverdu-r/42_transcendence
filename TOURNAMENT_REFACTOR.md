# Sistema de Torneos - Refactorización Completa

## 🎯 Objetivo
Rediseñar completamente el sistema de torneos para soportar correctamente torneos de 4, 8, 16, 32 y 64 jugadores de forma unificada y dinámica.

## ❌ Problemas Anteriores

1. **Lógica hardcodeada**: Array fijo `['1/8', '1/4', '1/2', 'Final']` solo funcionaba para 16 jugadores
2. **Inicio incorrecto**: Todos los torneos comenzaban en la misma ronda independientemente del número de jugadores
3. **Team names inconsistentes**: Mezcla de nombres de bot y 'Team A'/'Team B'
4. **Sin validación**: No se verificaba que el número de jugadores fuera potencia de 2
5. **Avance de rondas roto**: No detectaba correctamente la ronda actual

## ✅ Solución Implementada

### 🚫 Importante: NO SE PERMITEN BOTS EN TORNEOS
Los torneos son únicamente para jugadores humanos. Se ha eliminado toda la lógica relacionada con bots.

### 1. Nuevo Módulo: `tournament-logic.ts`

Funciones principales:
- `validatePlayerCount()`: Valida que sea potencia de 2 (2, 4, 8, 16, 32, 64)
- `calculateRounds()`: Calcula número de rondas necesarias (log2)
- `getRoundLabel()`: Genera label dinámicamente según jugadores
- `getMatchLabel()`: Crea identificadores únicos para cada partido
- `generateFirstRoundMatches()`: Genera emparejamientos iniciales con metadata completa
- `generateNextRoundMatches()`: Crea siguientes rondas basándose en ganadores
- `shuffleArray()`: Fisher-Yates shuffle para mezcla aleatoria

### 2. Actualización de db-service/server.ts

**Endpoint `/tournaments/:id/start`**:
- Validación del número de jugadores
- Uso de `generateFirstRoundMatches()` para crear primera ronda
- Team names consistentes: `Team A-R{round}-M{match}` y `Team B-R{round}-M{match}`
- Logs detallados para debugging

**Cambios clave**:
```typescript
// Antes
const roundPrefix = playersCount === 16 ? '1/8' : ...

// Ahora
const firstRoundMatches = generateFirstRoundMatches(shuffled, numPlayers);
```

### 3. Actualización de auth-service/server.ts

**Endpoint `/tournaments/:id/advance`**:
- Detección dinámica de ronda actual basada en datos reales
- Cálculo de siguiente ronda según fórmula: `nextRoundPlayers = currentRoundPlayers / 2`
- Team names consistentes en generación de siguientes rondas
- Uso de HTTPS en llamadas a servicios

**Lógica mejorada**:
```typescript
// Detecta ronda actual dinámicamente
const currentRoundPlayers = ... // Basado en último match
const nextRoundPlayers = currentRoundPlayers / 2;
const matchLabel = nextRoundPlayers === 2 ? 'Final' : 
                   `${getRoundLabel(nextRoundPlayers)}(${matchNumber})`;
```

## 📊 Estructura de Rondas

### Torneo de 4 jugadores
- Ronda 1: `1/2(1)`, `1/2(2)` → 2 partidos
- Ronda 2: `Final` → 1 partido
- **Total: 3 partidos, 2 rondas**

### Torneo de 8 jugadores
- Ronda 1: `1/4(1)` a `1/4(4)` → 4 partidos
- Ronda 2: `1/2(1)`, `1/2(2)` → 2 partidos
- Ronda 3: `Final` → 1 partido
- **Total: 7 partidos, 3 rondas**

### Torneo de 16 jugadores
- Ronda 1: `1/8(1)` a `1/8(8)` → 8 partidos
- Ronda 2: `1/4(1)` a `1/4(4)` → 4 partidos
- Ronda 3: `1/2(1)`, `1/2(2)` → 2 partidos
- Ronda 4: `Final` → 1 partido
- **Total: 15 partidos, 4 rondas**

## 🔧 Consistencia de Datos

### Team Names
- **Formato**: `Team {A|B}-R{roundNumber}-M{matchNumber}`
- **Ejemplo**: `Team A-R1-M3` (Team A, Ronda 1, Match 3)
- **Beneficios**:
  - Identificación única
  - Fácil debugging
  - Trazabilidad de ganadores

### Match Labels
- **Formato**: `{roundPrefix}({matchNumber})` o `Final`
- **Ejemplos**: `1/8(1)`, `1/4(2)`, `1/2(1)`, `Final`
- **Consistente** para todos los tamaños de torneo

## 🎮 Integración con game-service

- URLs usan HTTPS: `https://game-service:8000`
- Se pasa `tournamentId` a cada partida creada
- Campo `external_game_id` vincula games de DB con instancias de juego
- **Solo PvP**: Todos los partidos son entre 2 jugadores humanos reales
- **Validación**: No se puede iniciar un torneo sin suficientes jugadores humanos

## 📝 Logs Mejorados

Todos los endpoints ahora logean:
- ID del torneo
- Ronda actual/siguiente
- Número de participantes/ganadores
- Número de partidos creados
- Errores detallados con contexto

## 🧪 Validaciones

1. **Número de jugadores**: Debe ser potencia de 2 (2-64)
2. **Jugadores humanos**: Se requieren exactamente el número de jugadores configurado, sin bots
3. **Ganadores**: Se verifica que haya número correcto
4. **Ronda actual**: Se detecta dinámicamente, no hardcodeada
5. **Estado**: Solo torneos 'pending' pueden iniciarse

## 🚀 Beneficios

- ✅ **Unificado**: Un solo sistema para todos los tamaños
- ✅ **Escalable**: Soporta hasta 64 jugadores fácilmente
- ✅ **Mantenible**: Lógica centralizada y documentada
- ✅ **Debuggeable**: Logs completos y team names descriptivos
- ✅ **Robusto**: Validaciones en cada paso
- ✅ **Consistente**: Identificadores únicos y predecibles

## 📂 Archivos Modificados

1. `/db-service/src/tournament-logic.ts` - **NUEVO**
2. `/db-service/src/server.ts` - Refactorizado endpoint `/tournaments/:id/start`
3. `/auth-service/src/server.ts` - Refactorizado endpoint `/tournaments/:id/advance`

## 🔄 Migración

**No requiere migración de datos**. El sistema es compatible con registros existentes:
- Detecta automáticamente la estructura actual
- Genera nuevas rondas con formato correcto
- Mantiene backward compatibility con labels antiguos

## 🎯 Testing Recomendado

1. Crear torneo de 4 jugadores → Verificar 2 rondas
2. Crear torneo de 8 jugadores → Verificar 3 rondas
3. Crear torneo de 16 jugadores → Verificar 4 rondas
4. Completar ronda 1 → Verificar generación automática ronda 2
5. Verificar team names en base de datos
6. Verificar external_game_id en partidas humanas
