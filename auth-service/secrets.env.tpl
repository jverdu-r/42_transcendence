REDIS_PASSWORD={{ with secret "secret/data/redis" }}{{ .Data.data.REDIS_PASSWORD }}{{ end }}
JWT_SECRET={{ with secret "secret/data/jwt" }}{{ .Data.data.JWT_SECRET }}{{ end }}
EMAIL_PASS={{ with secret "secret/data/email" }}{{ .Data.data.EMAIL_PASS }}{{ end }}
# Añade aquí más secretos si los necesitas
