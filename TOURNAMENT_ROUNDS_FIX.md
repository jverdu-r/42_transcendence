# Corrección del Sistema de Rondas de Torneos

## Problema Identificado

El sistema de torneos tenía un problema en la visualización y agrupación de rondas. Cuando se creaba un torneo con menos de 16 jugadores (por ejemplo, 4 u 8 jugadores), el endpoint que recuperaba las rondas intentaba agrupar TODAS las rondas posibles (octavos, cuartos, semifinales y final), incluso cuando esas rondas no existían en la base de datos.

### Comportamiento Anterior

- **Torneo de 4 jugadores**: Intentaba mostrar octavos, cuartos, semifinales y final (aunque solo existían semifinales y final)
- **Torneo de 8 jugadores**: Intentaba mostrar octavos, cuartos, semifinales y final (aunque solo existían cuartos, semifinales y final)
- **Torneo de 16 jugadores**: Mostraba correctamente todas las rondas

Esto causaba confusión porque la "primera ronda" se mostraba como si fuera la última ronda del torneo.

## Solución Implementada

Se modificó el endpoint `GET /api/tournaments/:id/matches` en `db-service/src/server.ts` para que:

1. **Detecte qué rondas existen realmente** en la base de datos antes de agruparlas
2. **Solo agrupe y retorne las rondas que existen**
3. **Mantenga el orden correcto** de rondas (primera ronda → final)

### Nomenclatura Correcta de Rondas

La nomenclatura se mantiene consistente en todo el sistema:

- **16 jugadores** → Primera ronda: `1/8` (Octavos de final) → 8 partidos
- **8 jugadores** → Primera ronda: `1/4` (Cuartos de final) → 4 partidos
- **4 jugadores** → Primera ronda: `1/2` (Semifinales) → 2 partidos
- **2 jugadores** → Primera ronda: `Final` → 1 partido

### Cambios en el Código

**Archivo**: `db-service/src/server.ts` (líneas ~136-165)

**Antes**:
```typescript
// Agrupar partidos por ronda en el orden correcto
const groupedRounds: any[][] = [];
// Octavos
const octavos = roundOrder.slice(0,8).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
if (octavos.length > 0) groupedRounds.push(octavos);
// Cuartos
const cuartos = roundOrder.slice(8,12).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
if (cuartos.length > 0) groupedRounds.push(cuartos);
// ... etc
```

**Después**:
```typescript
// Determinar qué rondas existen basándose en las etiquetas de los partidos
const hasOctavos = Object.keys(rounds).some(k => k.startsWith('1/8'));
const hasCuartos = Object.keys(rounds).some(k => k.startsWith('1/4'));
const hasSemis = Object.keys(rounds).some(k => k.startsWith('1/2'));
const hasFinal = Object.keys(rounds).some(k => k === 'Final');

// Agrupar partidos por ronda en el orden correcto
const groupedRounds: any[][] = [];

// Octavos (solo si existen)
if (hasOctavos) {
    const octavos = roundOrder.slice(0,8).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
    if (octavos.length > 0) groupedRounds.push(octavos);
}
// Cuartos (solo si existen)
if (hasCuartos) {
    const cuartos = roundOrder.slice(8,12).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
    if (cuartos.length > 0) groupedRounds.push(cuartos);
}
// ... etc
```

## Resultado Esperado

### Torneo de 4 jugadores
- **Ronda 1**: Semifinales (1/2) - 2 partidos
  - Partido 1: Jugador A vs Jugador B
  - Partido 2: Jugador C vs Jugador D
- **Ronda 2**: Final - 1 partido
  - Partido 1: Ganador(A,B) vs Ganador(C,D)

### Torneo de 8 jugadores
- **Ronda 1**: Cuartos de final (1/4) - 4 partidos
- **Ronda 2**: Semifinales (1/2) - 2 partidos
- **Ronda 3**: Final - 1 partido

### Torneo de 16 jugadores
- **Ronda 1**: Octavos de final (1/8) - 8 partidos
- **Ronda 2**: Cuartos de final (1/4) - 4 partidos
- **Ronda 3**: Semifinales (1/2) - 2 partidos
- **Ronda 4**: Final - 1 partido

## Archivos Modificados

- ✅ `db-service/src/server.ts`: Endpoint `GET /tournaments/:id/matches`

## Archivos Verificados (sin cambios necesarios)

- ✅ `db-service/src/server.ts`: Endpoint `POST /tournaments/:id/start` (creación inicial de rondas)
- ✅ `auth-service/src/server.ts`: Endpoint `POST /tournaments/:id/advance` (avance de rondas)

## Pruebas Recomendadas

Para verificar que el fix funciona correctamente, se recomienda:

1. **Crear un torneo de 4 jugadores**
   - Verificar que la primera ronda sea "Semifinales" (1/2)
   - Jugar los 2 partidos de semifinales
   - Verificar que avance correctamente a la "Final"

2. **Crear un torneo de 8 jugadores**
   - Verificar que la primera ronda sea "Cuartos de final" (1/4)
   - Jugar los 4 partidos de cuartos
   - Verificar que avance a "Semifinales" (1/2)
   - Jugar los 2 partidos de semifinales
   - Verificar que avance a la "Final"

3. **Crear un torneo de 16 jugadores**
   - Verificar que la primera ronda sea "Octavos de final" (1/8)
   - Seguir el flujo completo: Octavos → Cuartos → Semifinales → Final

## Notas Adicionales

- El sistema mantiene compatibilidad con la función de avance automático de rondas
- La nomenclatura es consistente en todo el sistema (frontend y backend)
- El orden de las rondas se mantiene correcto en la visualización del bracket
