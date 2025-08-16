GF_SECURITY_ADMIN_USER={{ with secret "secret/data/grafana" }}{{ .Data.data.GF_SECURITY_ADMIN_USER }}{{ end }}
GF_SECURITY_ADMIN_PASSWORD={{ with secret "secret/data/grafana" }}{{ .Data.data.GF_SECURITY_ADMIN_PASSWORD }}{{ end }}
# Añade aquí más secretos si los necesitas