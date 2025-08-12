REDIS_PASSWORD={{ with secret "secret/redis" }}{{ .Data.data.REDIS_PASSWORD }}{{ end }}
JWT_SECRET={{ with secret "secret/jwt" }}{{ .Data.data.JWT_SECRET }}{{ end }}
# Añade aquí más secretos si los necesitas
