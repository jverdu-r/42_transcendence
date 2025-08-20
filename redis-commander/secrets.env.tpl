REDIS_PASSWORD={{ with secret "secret/data/redis" }}{{ .Data.data.REDIS_PASSWORD }}{{ end }}

