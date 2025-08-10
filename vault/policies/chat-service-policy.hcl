# Chat Service Policy
# Allows access to chat-service specific secrets and common configuration

path "secret/data/chat-service/*" {
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
