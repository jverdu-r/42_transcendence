# Configuración de Credenciales

Después de hacer `git clone`, debes configurar las siguientes credenciales:

## 1. Google OAuth (para login con Google)

### Archivos a modificar:
- `frontend/src/google-config.ts`
- `frontend/src/pages/login.ts`
- `frontend/src/pages/register.ts`

### Buscar y reemplazar:
```
YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

### Por tu Google Client ID real:
```
TU_CLIENT_ID.apps.googleusercontent.com
```

### Cómo obtener el Google Client ID:
1. Ve a https://console.cloud.google.com/
2. Crea un proyecto (o selecciona uno existente)
3. Habilita la API de Google+ 
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth 2.0"
5. Tipo de aplicación: "Aplicación web"
6. Orígenes autorizados: `https://localhost` (o tu dominio)
7. URIs de redirección autorizados: `https://localhost/auth/callback`
8. Copia el Client ID generado

**IMPORTANTE:** Google OAuth NO funciona con direcciones IP (como 192.168.x.x), solo con dominios o localhost.

## 2. Email (para notificaciones de juegos)

### Archivos a modificar:
- `.env`
- `vault/scripts/seed-secrets.sh`
- `add_email_secret_to_vault.sh` (opcional, solo si lo usas)

### En `.env`:
Reemplazar:
```bash
EMAIL_USER=YOUR_EMAIL@gmail.com
EMAIL_PASS=YOUR_GMAIL_APP_PASSWORD
EMAIL_FROM=YOUR_EMAIL@gmail.com
```

Por:
```bash
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
EMAIL_FROM=tu_email@gmail.com
```

### En `vault/scripts/seed-secrets.sh`:
Buscar:
```bash
EMAIL_PASS="YOUR_GMAIL_APP_PASSWORD"
```

Reemplazar por:
```bash
EMAIL_PASS="tu_contraseña_de_aplicacion"
```

### Cómo obtener la contraseña de aplicación de Gmail:
1. Ve a https://myaccount.google.com/security
2. Activa la verificación en dos pasos (si no está activada)
3. Ve a "Contraseñas de aplicaciones" (al final de la página)
4. Selecciona "Correo" y "Otro" (dispositivo personalizado)
5. Nombra la aplicación: "Transcendence"
6. Copia la contraseña de 16 caracteres generada (sin espacios)

## 3. Iniciar el proyecto

Después de configurar las credenciales:

```bash
make re
```

Esto:
- Construirá todos los contenedores
- Inicializará Vault con el `EMAIL_PASS` configurado
- Levantará todos los servicios

## 4. Verificar que funciona

### Verificar EMAIL_PASS en Vault:
```bash
VAULT_TOKEN=$(cat vault/generated/root.token) && \
docker exec -e VAULT_TOKEN="$VAULT_TOKEN" hashicorp_vault \
vault kv get -field=EMAIL_PASS secret/email
```

Debería mostrar tu contraseña de aplicación.

### Verificar notificaciones:
1. Regístrate con un email real
2. Juega una partida (vs otro usuario o vs bot)
3. Revisa tu email para la notificación del resultado

## Troubleshooting

### Google OAuth: "origin_mismatch"
- Asegúrate de acceder desde `https://localhost` (no desde una IP)
- Verifica que el origen esté autorizado en Google Cloud Console

### Emails no se envían
- Verifica que `EMAIL_PASS` esté en Vault correctamente
- Revisa los logs: `docker logs auth-service | grep EMAIL`
- Asegúrate de tener la verificación en dos pasos activada en Gmail

### Rate limit de Docker Hub
Si al hacer `make re` obtienes "429 Too Many Requests":
- Espera unas horas (el límite se resetea)
- O login en Docker Hub: `docker login`
