# Dockerfile para el contenedor de la base de datos SQLite
FROM alpine:latest

# Instalar SQLite
RUN apk add --no-cache sqlite

# Crear directorio de trabajo
WORKDIR /app

# Copiar el script de inicialización
COPY init.sql /app/

# Crear el directorio para la base de datos
RUN mkdir -p /app/data

# Script para inicializar la base de datos si no existe
RUN echo '#!/bin/sh' > /app/init.sh && \
    echo 'if [ ! -f /app/data/transcendance.db ]; then' >> /app/init.sh && \
    echo '  echo "Inicializando base de datos..."' >> /app/init.sh && \
    echo '  sqlite3 /app/data/transcendance.db < /app/init.sql' >> /app/init.sh && \
    echo '  echo "Base de datos inicializada correctamente"' >> /app/init.sh && \
    echo 'else' >> /app/init.sh && \
    echo '  echo "Base de datos ya existe"' >> /app/init.sh && \
    echo 'fi' >> /app/init.sh && \
    echo 'echo "Manteniendo contenedor activo..."' >> /app/init.sh && \
    echo 'tail -f /dev/null' >> /app/init.sh && \
    chmod +x /app/init.sh

# Exponer el volumen de datos
VOLUME ["/app/data"]

# Ejecutar el script de inicialización
CMD ["/app/init.sh"]

