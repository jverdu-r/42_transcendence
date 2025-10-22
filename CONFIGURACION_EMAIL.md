# 📧 Configuración del Sistema de Notificaciones por Email

## ⚙️ Configuración Necesaria

Para que el sistema de notificaciones por email funcione correctamente, necesitas configurar las credenciales SMTP en el archivo `.env`.

### 1. Obtener credenciales de Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En "Seguridad", activa la verificación en 2 pasos
3. Busca "Contraseñas de aplicaciones" 
4. Genera una nueva contraseña de aplicación para "Correo"
5. Copia la contraseña generada (16 caracteres sin espacios)

### 2. Configurar el archivo .env

Añade o actualiza estas líneas en tu archivo `.env`:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_16_caracteres
EMAIL_FROM=tu-email@gmail.com
```

### 3. Reiniciar el servicio

```bash
make re
# o
docker-compose restart auth-service
```

## 📨 Tipos de Notificaciones

El sistema envía correos automáticamente cuando un jugador tiene las **notificaciones activadas** en su configuración (Settings):

### ✅ Partidas contra IA (PvE)
- **Cuándo**: Al finalizar una partida contra la inteligencia artificial
- **Contenido**: Resultado, puntuación, dificultad de la IA

### ✅ Partidas Online (PvP)
- **Cuándo**: Al finalizar una partida online entre humanos
- **Contenido**: Resultado, oponente, puntuación
- **Excepción**: NO se envían para partidas locales (mismo ordenador)

### ✅ Partidas de Torneo
- **Cuándo**: Al finalizar cada partida del torneo
- **Contenido**: Resultado, oponente, ronda (1/8, 1/4, Semifinal, Final), torneo

## 🔍 Verificación

### Comprobar logs del servicio
```bash
docker logs auth-service | grep -i "email\|correo"
```

### Si está configurado correctamente verás:
```
✅ Correo enviado: <message-id> a: usuario@email.com
```

### Si falta configuración verás:
```
⚠️  Email no configurado (falta EMAIL_USER o EMAIL_PASS). No se enviará correo.
```

## 🚫 Casos donde NO se envían correos

1. **Notificaciones desactivadas**: El jugador tiene `notifications = false` en Settings
2. **Sin email**: El jugador no tiene email registrado
3. **Partida local**: Ambos jugadores juegan en el mismo ordenador (mismo user_id)
4. **Bot vs Bot**: Partidas automáticas entre bots en torneos
5. **Email no configurado**: Falta EMAIL_PASS en el .env

## 🐛 Troubleshooting

### "Missing credentials for PLAIN"
- **Causa**: Falta EMAIL_PASS en el .env
- **Solución**: Añade EMAIL_PASS con tu contraseña de aplicación de Gmail

### "Invalid login"
- **Causa**: Contraseña incorrecta o verificación en 2 pasos no activada
- **Solución**: 
  1. Verifica que la verificación en 2 pasos esté activa
  2. Genera una nueva contraseña de aplicación
  3. Copia la contraseña sin espacios

### No llegan correos pero no hay errores
- **Causa**: Puede estar en spam o el jugador tiene notificaciones desactivadas
- **Solución**: 
  1. Verifica la configuración en Settings > Notifications
  2. Revisa la carpeta de spam
  3. Añade el remitente a contactos

## 📋 Ejemplo de correo enviado

**Asunto**: 🎉 ¡Has ganado una partida!

**Contenido**:
```
Transcendence
¡Felicidades!

Jugador: tu_username
Oponente: oponente_username
Resultado: 5-3
Modo: Contra humano
Torneo: Torneo de Prueba - Semifinal

Gracias por jugar a Transcendence.
Este es un correo automático, por favor no respondas.
```

## 🔐 Seguridad

- ✅ Las contraseñas de aplicación son más seguras que usar tu contraseña principal
- ✅ Puedes revocar el acceso en cualquier momento desde tu cuenta de Google
- ✅ No expongas EMAIL_PASS en repositorios públicos (está en .gitignore)
- ✅ Considera usar variables de entorno en producción

## 📝 Notas

- El sistema funciona incluso sin configuración de email (solo muestra warnings)
- Los correos se envían de forma asíncrona para no bloquear el juego
- Se respetan las preferencias de notificaciones de cada usuario
