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
  source      = "./secrets.env.tpl"
  destination = "./.env"
  command = "pkill -HUP -f dist/server.js"
}
