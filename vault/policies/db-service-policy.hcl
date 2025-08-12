# DB Service Policy
# Allows access to database service secrets

path "secret/data/redis/*" {
  capabilities = ["read", "list"]
}

path "secret/data/redis" {
  capabilities = ["read", "list"]
}

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
