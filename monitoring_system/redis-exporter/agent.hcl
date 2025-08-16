
pid_file = "./vault-agent.pid"

auto_auth {
  method "token_file" {
    config = {
      token_file_path = "/vault/token.txt"
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
  destination = "/output/secrets.env"
}
