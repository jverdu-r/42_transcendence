# Política para Redis Exporter
path "secret/data/redis" {
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
