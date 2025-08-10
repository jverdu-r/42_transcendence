# HashiCorp Vault Configuration for Production Environment
# Trascender Project - Study Environment Configuration

# Storage Backend - File storage for development/study purposes
# In real production, consider using Consul, etcd, or cloud storage
storage "file" {
  path = "/vault/file"
}

# Listener configuration - TLS enabled for production
listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_disable     = false
  tls_cert_file   = "/vault/certs/vault.crt"
  tls_key_file    = "/vault/certs/vault.key"
  tls_min_version = "tls12"
}

# API address (how Vault advertises itself) - HTTPS enabled
api_addr = "https://vault:8200"
cluster_addr = "https://vault:8201"

# Disable mlock for containerized environments
disable_mlock = true

# UI Configuration
ui = true

# Logging
log_level = "INFO"
log_format = "json"

# Plugin directory
plugin_directory = "/vault/plugins"

# Default lease TTL
default_lease_ttl = "168h"
max_lease_ttl = "720h"

# Seal configuration (Auto-unseal would be ideal for production)
# For study purposes, we'll use manual unsealing
# seal "gcpckms" {
#   project     = "my-project"
#   region      = "global"
#   key_ring    = "vault-keyring"
#   crypto_key  = "vault-key"
# }
