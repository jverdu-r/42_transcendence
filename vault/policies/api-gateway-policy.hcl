# API Gateway Policy
# Allows access to common configuration and JWT secrets

path "secret/data/api-gateway/*" {
  capabilities = ["read", "list"]
}

path "secret/data/common/*" {
  capabilities = ["read", "list"]
}

path "secret/data/jwt/*" {
  capabilities = ["read", "list"]
}

path "secret/data/redis/*" {
  capabilities = ["read", "list"]
}

# Allow token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow token lookup
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
