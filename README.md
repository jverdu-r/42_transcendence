# Transcendence Frontend-Only

Este es un proyecto frontend-only de Transcendence Pong que incluye toda la interfaz de usuario visual con datos hardcodeados. No hay funcionalidad de backend ni juego real, solo la experiencia visual completa.

## 🎮 Características

- **Interfaz completa**: Todas las páginas del proyecto original (Home, Profile, Play, Ranking, Settings, Login, Register)
- **Datos hardcodeados**: Perfiles de usuario, estadísticas, rankings y partidas simuladas
- **Traducciones**: Soporte completo para múltiples idiomas (Español, Inglés)
- **Diseño responsivo**: Optimizado para desktop y móvil
- **Navegación SPA**: Router personalizado sin recarga de página
- **Sin backend**: Login y registro redirigen directamente al home

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js (versión 16 o superior)
- npm o yarn

### Instalación

1. **Navegar al directorio frontend:**
   ```bash
   cd frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```

4. **Abrir en el navegador:**
   El proyecto se abrirá automáticamente en `http://localhost:8080`

### Scripts Disponibles

- `npm start` / `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye el proyecto para producción

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/
│   │   └── navbar.ts          # Barra de navegación
│   ├── pages/
│   │   ├── home.ts            # Página principal
│   │   ├── login.ts           # Página de login
│   │   ├── register.ts        # Página de registro
│   │   ├── profile.ts         # Página de perfil
│   │   ├── play.ts            # Página de modos de juego
│   │   ├── ranking.ts         # Página de ranking
│   │   └── settings.ts        # Página de configuración
│   ├── utils/
│   │   └── safariPolyfills.ts # Compatibilidad con Safari
│   ├── auth.ts                # Autenticación simulada
│   ├── i18n.ts                # Sistema de traducciones
│   ├── router.ts              # Enrutador SPA
│   └── main.ts                # Punto de entrada
├── index.html                 # HTML principal
├── package.json               # Configuración npm
├── tsconfig.json              # Configuración TypeScript
└── webpack.config.js          # Configuración Webpack
```

## 🎨 Características del Diseño

- **Tema oscuro** con gradientes azul y dorado
- **Interfaz moderna** con efectos de cristal y sombras
- **Animaciones suaves** en hover y transiciones
- **Tipografía personalizada** con fuentes Inter y Montserrat
- **Componentes interactivos** con feedback visual

## 🌐 Funcionalidades Implementadas

### Páginas Principales
- **Home**: Bienvenida con partidas en vivo simuladas y estadísticas
- **Login/Register**: Formularios completos que redirigen al home
- **Profile**: Perfil de usuario con estadísticas y historial de partidas
- **Play**: Selección de modos de juego (visual únicamente)
- **Ranking**: Tabla de clasificación global con datos hardcodeados
- **Settings**: Configuración de usuario y preferencias del juego

### Características Técnicas
- **Enrutamiento SPA**: Navegación sin recarga de página
- **Sistema de traducciones**: Soporte multiidioma con cambio dinámico
- **Autenticación simulada**: Usuario siempre logueado para demostrar la UI
- **Datos hardcodeados**: Perfiles, estadísticas y rankings predefinidos
- **Responsive design**: Adaptado a diferentes tamaños de pantalla

## 🔧 Personalización

### Cambiar Datos del Usuario
Edita el archivo `src/auth.ts` para modificar los datos del usuario por defecto:

```typescript
const dummyUser: User = {
    id: 1,
    username: "tu_usuario",
    email: "tu_email@example.com"
};
```

### Modificar Traducciones
Las traducciones se encuentran en `src/i18n.ts`. Puedes agregar nuevos idiomas o modificar textos existentes.

### Personalizar Temas
Los colores y estilos se definen usando Tailwind CSS. Los colores principales están configurados en `index.html`.

## 📱 Compatibilidad

- **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- **Dispositivos móviles**: iOS Safari, Chrome Mobile
- **Características especiales**: Polyfills incluidos para Safari

## 🎯 Propósito

Este proyecto está diseñado como una **demostración visual completa** del frontend de Transcendence. Es perfecto para:

- Mostrar el diseño y la experiencia de usuario
- Demostrar la estructura y organización del código
- Probar la interfaz sin necesidad de backend
- Desarrollo frontend independiente

## 📄 Notas

- Las funcionalidades de juego no están implementadas (solo diseño)
- Los datos son estáticos y no se persisten
- Login y registro siempre redirigen al home
- Este es únicamente el frontend visual, no incluye lógica de juego real

---

**Proyecto desarrollado como demostración de frontend para Transcendence Pong** 🏓
