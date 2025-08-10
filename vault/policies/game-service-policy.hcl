# Game Service Policy
# Allows access to game-service specific secrets and common configuration

path "secret/data/game-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/common/*" {
  capabilities = ["read", "list"]
}

path "secret/data/database/*" {
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
