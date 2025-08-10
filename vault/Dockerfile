FROM hashicorp/vault:1.15.6


# Set working directory
WORKDIR /vault


# Instalar bash en la imagen oficial de Vault (basada en Alpine)
USER root
RUN apk add --no-cache bash

# Crear los directorios necesarios como root
RUN mkdir -p /vault/file /vault/logs /vault/plugins /vault/certs

# Copy configuration and scripts as root, then set permissions
COPY config/vault.hcl /vault/config/vault.hcl
COPY policies/ /vault/policies/
COPY scripts/ /vault/scripts/

# Change to vault user for runtime
USER vault

# Expose Vault port
EXPOSE 8200 8201

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD vault status || exit 1

# Start Vault server
CMD ["vault", "server", "-config=/vault/config/vault.hcl"]
