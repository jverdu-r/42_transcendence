GRAFANA_USER={{ with secret "secret/grafana" }}{{ .Data.data.GRAFANA_USER }}{{ end }}
GRAFANA_PASSWORD={{ with secret "secret/grafana" }}{{ .Data.data.GRAFANA_PASSWORD }}{{ end }}
