# Auth Service Policy
# Allows access to auth-service specific secrets and common configuration

path "secret/data/auth-service/*" {
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
