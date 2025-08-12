REDIS_PASSWORD={{ with secret "secret/redis" }}{{ .Data.data.REDIS_PASSWORD }}{{ end }}
JWT_SECRET={{ with secret "secret/jwt" }}{{ .Data.data.JWT_SECRET }}{{ end }}
EMAIL_PASS={{ with secret "secret/email" }}{{ .Data.data.EMAIL_PASS }}{{ end }}
# Añade aquí más secretos si los necesitas
