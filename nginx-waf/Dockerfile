FROM owasp/modsecurity-crs:nginx

# Crea el directorio y cambia permisos
RUN mkdir -p /etc/nginx/includes && chmod -R 777 /etc/nginx/includes

# Copia directamente los archivos necesarios
COPY modsecurity.conf /etc/nginx/modsecurity/modsecurity.conf
COPY proxy_backend.conf /etc/nginx/includes/proxy_backend.conf
COPY location_common.conf /etc/nginx/includes/location_common.conf
