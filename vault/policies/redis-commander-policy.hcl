# Política para Redis Commander
path "secret/data/redis" {
  capabilities = ["read", "list"]
}

# Política para Redis Commander
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

# Permitir lookup estándar del token
path "auth/token/lookup" {
  capabilities = ["read"]
}
