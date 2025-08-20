vault {
  address = "https://hashicorp_vault:8200"
  tls_skip_verify = true
}
pid_file = "./vault-agent.pid"

auto_auth {
  method "token_file" {
    config = {
      token_file_path = "/vault/token.txt" # Cambia la ruta si tu token está en otro sitio
    }
  }
  sink "file" {
    config = {
      path = "./agent-token"
    }
  }
}

template {
  source      = "/app/secrets.env.tpl"
  destination = "/app/.env"
}