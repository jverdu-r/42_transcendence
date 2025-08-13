# API Gateway Policy

path "secret/data/redis" {
  capabilities = ["read"]
}
path "secret/data/redis/*" {
  capabilities = ["read", "list"]
}

# Permitir acceso a JWT para api-gateway
path "secret/data/jwt" {
  capabilities = ["read", "list"]
}
path "secret/data/jwt/*" {
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
