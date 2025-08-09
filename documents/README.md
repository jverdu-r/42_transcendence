# 🎮 Transcendence - Juego de Pong Mejorado

## ✨ Características Implementadas

### 🎨 **Estética Unificada**
- **Paleta de colores flamenca** aplicada en toda la aplicación
- **Efectos visuales mejorados**: Resplandor, bordes redondeados, partículas
- **Interfaz moderna** con gradientes y sombras

### 🕹️ **Modos de Juego**

#### **1. Pong Local (1 vs 1)**
- **Controles suaves** con interpolación
- **Física mejorada** de la pelota con rebotes naturales
- **Efectos visuales**: Trail de pelota, partículas, screen shake
- **Controles**: Jugador 1 (W/S), Jugador 2 (↑/↓)

#### **2. Pong Online (Multijugador)**
- **Asignación correcta de jugadores**: Primer jugador = Jugador 1, segundo = Jugador 2
- **Colores diferenciados**: Tu pala amarilla, oponente azul marino
- **Estados de partida**: Esperando oponente → Cuenta atrás → Juego
- **Sincronización en tiempo real** con interpolación

#### **3. Visor de Partidas**
- **Partidas locales y online** en una sola interfaz
- **Observación en tiempo real** de partidas online
- **Navegación fácil** entre modos

## 🚀 Cómo Ejecutar

### **1. Iniciar el Servidor**
```bash
cd /media/manufern/SSD_Manuel/42_Madrid/transcendence/game-service
npm run dev
```

### **2. Abrir la Aplicación**
- **Página principal**: `http://localhost:8000/test/index.html`
- **Pong Local**: `http://localhost:8000/test/pong-local.html`
- **Pong Online**: `http://localhost:8000/test/test_network.html`
- **Visor**: `http://localhost:8000/test/visor.html`

## 🎮 Cómo Jugar

### **Modo Local**
1. Abre `pong-local.html`
2. Jugador 1: Usa **W** (arriba) y **S** (abajo)
3. Jugador 2: Usa **↑** (arriba) y **↓** (abajo)
4. ¡Disfruta de la física mejorada!

### **Modo Online**
1. Abre `test_network.html`
2. **Crear partida**: Haz clic en "Crear Nueva Partida"
3. **Unirse**: Selecciona una partida de la lista y haz clic en "Unirse"
4. **Esperando oponente**: Verás el mensaje hasta que se una otro jugador
5. **Cuenta atrás**: Cuando hay 2 jugadores, comienza la cuenta atrás
6. **Jugar**: Usa **W** y **S** para controlar tu pala (amarilla)

### **Visor de Partidas**
1. Abre `visor.html`
2. Ve partidas locales disponibles
3. Observa partidas online en tiempo real
4. Navega fácilmente entre diferentes partidas

## 🔧 Mejoras Técnicas

### **Física del Juego**
- ✅ Velocidades balanceadas y realistas
- ✅ Rebotes naturales en paredes
- ✅ Efectos de spin controlados en las palas
- ✅ Límites de velocidad para mantener jugabilidad

### **Controles**
- ✅ Interpolación suave de movimiento
- ✅ Respuesta inmediata con predicción del lado cliente
- ✅ Separación correcta de controles por jugador en modo online

### **Efectos Visuales**
- ✅ Trail de pelota con transparencia gradual
- ✅ Partículas en colisiones y puntos
- ✅ Screen shake dinámico
- ✅ Resplandor en elementos del juego
- ✅ Bordes redondeados con fallback para compatibilidad

### **Red y Sincronización**
- ✅ WebSockets para comunicación en tiempo real
- ✅ Interpolación del estado del servidor
- ✅ Manejo de desconexiones
- ✅ Estados de partida apropiados

## 🎨 Paleta de Colores

```css
--bg-dark-navy: #000814    /* Fondo principal */
--bg-mid-navy: #001d3d     /* Fondo secundario */
--border-light-navy: #003566 /* Bordes y elementos */
--text-gold: #ffc300       /* Texto principal */
--highlight-gold: #ffd60a   /* Acentos y resaltados */
--text-light-gray: #e0e0e0 /* Texto secundario */
```

## 🐛 Problemas Solucionados

- ✅ **Controles duplicados**: Cada jugador controla solo su pala
- ✅ **Asignación de jugadores**: Primer jugador = 1, segundo = 2
- ✅ **Colores de palas**: Tu pala amarilla, oponente azul
- ✅ **Estados de partida**: Mensajes claros de espera y cuenta atrás
- ✅ **Física extraña**: Movimiento natural y predecible de la pelota
- ✅ **Visor incompleto**: Muestra partidas locales y online

## 📝 Notas de Desarrollo

- **Puerto del servidor**: 8000
- **Compatibilidad**: Función `drawRoundedRect` con fallback
- **Rendimiento**: Partículas optimizadas, 60 FPS estables
- **Escalabilidad**: Arquitectura preparada para múltiples partidas simultáneas

¡El juego está listo para disfrutar! 🎉
