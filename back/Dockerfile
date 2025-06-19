# Usa una imagen base de Node.js oficial y ligera.
FROM node:20-alpine

# Define el directorio de trabajo dentro del contenedor.
WORKDIR /usr/src/app

# Copia solo package.json.
# La diferencia clave es que ahora no intentamos copiar package-lock.json en este paso.
COPY package.json ./

# Instala las dependencias del proyecto.
# Esto generará el package-lock.json dentro del contenedor,
# si no existía ya de una capa anterior cacheados.
RUN npm install --production

# Copia el resto del código de tu aplicación (incluyendo src/app.js).
# Si un package-lock.json se generó en el paso anterior, ahora será parte de la imagen.
COPY . .

# Expone el puerto 3000.
EXPOSE 3000

# Comando para iniciar la aplicación.
CMD ["node", "src/app.js"]