# Permite a Grafana leer el secreto de credenciales
path "secret/data/grafana" {
  capabilities = ["read", "list"]
}

path "secret/data/grafana/*" {
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