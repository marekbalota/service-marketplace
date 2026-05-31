{{/* Chart name */}}
{{- define "marketplace.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/* Fully qualified app name */}}
{{- define "marketplace.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{- define "marketplace.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/* Common labels */}}
{{- define "marketplace.labels" -}}
helm.sh/chart: {{ include "marketplace.chart" . }}
{{ include "marketplace.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/* Selector labels (instance-wide; per-component templates add app.kubernetes.io/component) */}}
{{- define "marketplace.selectorLabels" -}}
app.kubernetes.io/name: {{ include "marketplace.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/* Component-scoped resource names */}}
{{- define "marketplace.api.fullname" -}}{{ include "marketplace.fullname" . }}-api{{- end }}
{{- define "marketplace.web.fullname" -}}{{ include "marketplace.fullname" . }}-web{{- end }}
{{- define "marketplace.redis.fullname" -}}{{ include "marketplace.fullname" . }}-redis{{- end }}
{{- define "marketplace.minio.fullname" -}}{{ include "marketplace.fullname" . }}-minio{{- end }}
{{- define "marketplace.db.fullname" -}}{{ include "marketplace.fullname" . }}-db{{- end }}
