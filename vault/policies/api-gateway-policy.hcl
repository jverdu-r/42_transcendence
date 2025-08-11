# API Gateway Policy

path "secret/data/redis" {
  capabilities = ["read"]
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
