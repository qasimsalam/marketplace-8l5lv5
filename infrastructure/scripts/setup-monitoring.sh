#!/bin/bash
# setup-monitoring.sh - Setup monitoring stack for AI Talent Marketplace
# Version: 1.0.0
#
# This script automates the setup and configuration of the comprehensive monitoring
# stack for the AI Talent Marketplace platform. It deploys Prometheus, Grafana, Loki,
# Tempo and other monitoring tools to provide observability.
#
# Prerequisites:
#   - kubectl (Kubernetes CLI)
#   - helm (Kubernetes package manager)
#   - aws CLI (if using AWS backend storage)
#   - jq (for JSON processing)
#   - Access to a Kubernetes cluster

# Strict error handling
set -eo pipefail

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/monitoring-setup.log"
MONITORING_NAMESPACE="monitoring"
CLUSTER_NAME="${CLUSTER_NAME:-ai-talent-marketplace}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET_LOGS="${S3_BUCKET_LOGS:-ai-talent-marketplace-logs}"
S3_BUCKET_TRACES="${S3_BUCKET_TRACES:-ai-talent-marketplace-traces}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin}"

# Monitoring configuration files
PROMETHEUS_CONFIG="${SCRIPT_DIR}/../monitoring/prometheus/prometheus.yml"
PROMETHEUS_ALERTS="${SCRIPT_DIR}/../monitoring/prometheus/rules/alerts.yml"
PROMETHEUS_RECORDING="${SCRIPT_DIR}/../monitoring/prometheus/rules/recording.yml"
GRAFANA_DASHBOARD_API_GATEWAY="${SCRIPT_DIR}/../monitoring/grafana/dashboards/api-gateway.json"
LOKI_CONFIG="${SCRIPT_DIR}/../monitoring/loki/loki.yml"
TEMPO_CONFIG="${SCRIPT_DIR}/../monitoring/tempo/tempo.yml"

# Helm chart versions
PROMETHEUS_CHART_VERSION="15.10.3"
GRAFANA_CHART_VERSION="6.50.7"
LOKI_CHART_VERSION="2.13.3"
TEMPO_CHART_VERSION="1.4.1"
NODE_EXPORTER_CHART_VERSION="4.3.0"
KUBE_STATE_METRICS_CHART_VERSION="4.10.0"

# Specify the application namespace we will monitor
APP_NAMESPACE="ai-talent-marketplace"

# Create temporary directory for values files
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Helper functions

# Log messages to stdout and log file
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] [$level] $message"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if required tools and environment are available
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl is not installed or not in PATH"
        return 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log "ERROR" "helm is not installed or not in PATH"
        return 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq is not installed or not in PATH"
        return 1
    fi
    
    # Check AWS CLI if using AWS for storage
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        if ! command -v aws &> /dev/null; then
            log "ERROR" "AWS CLI is not installed or not in PATH, but AWS credentials are provided"
            return 1
        fi
        
        # Verify AWS credentials work
        if ! aws sts get-caller-identity &> /dev/null; then
            log "ERROR" "AWS credentials are invalid or insufficient permissions"
            return 1
        fi
        
        log "INFO" "AWS credentials validated successfully"
    else
        log "WARN" "AWS credentials not found. S3 storage backends will not be configured."
    fi
    
    # Verify Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        return 1
    fi
    
    log "INFO" "Kubernetes connection verified successfully"
    
    # Check if required namespaces exist
    if ! kubectl get namespace "$APP_NAMESPACE" &> /dev/null; then
        log "ERROR" "Application namespace '$APP_NAMESPACE' does not exist"
        return 1
    fi
    
    # Check configuration files
    if [[ ! -f "$PROMETHEUS_CONFIG" ]]; then
        log "ERROR" "Prometheus configuration file not found: $PROMETHEUS_CONFIG"
        return 1
    fi
    
    if [[ ! -f "$PROMETHEUS_ALERTS" ]]; then
        log "ERROR" "Prometheus alerts file not found: $PROMETHEUS_ALERTS"
        return 1
    fi
    
    if [[ ! -f "$PROMETHEUS_RECORDING" ]]; then
        log "ERROR" "Prometheus recording rules file not found: $PROMETHEUS_RECORDING"
        return 1
    fi
    
    if [[ ! -f "$GRAFANA_DASHBOARD_API_GATEWAY" ]]; then
        log "ERROR" "Grafana dashboard file not found: $GRAFANA_DASHBOARD_API_GATEWAY"
        return 1
    fi
    
    if [[ ! -f "$LOKI_CONFIG" ]]; then
        log "ERROR" "Loki configuration file not found: $LOKI_CONFIG"
        return 1
    fi
    
    if [[ ! -f "$TEMPO_CONFIG" ]]; then
        log "ERROR" "Tempo configuration file not found: $TEMPO_CONFIG"
        return 1
    fi
    
    log "INFO" "All prerequisites met"
    return 0
}

# Create Kubernetes namespace for monitoring components
create_monitoring_namespace() {
    log "INFO" "Creating monitoring namespace..."
    
    if kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        log "INFO" "Namespace '$MONITORING_NAMESPACE' already exists"
    else
        kubectl create namespace "$MONITORING_NAMESPACE"
        log "INFO" "Created namespace '$MONITORING_NAMESPACE'"
    fi
    
    # Label the namespace for proper discovery
    kubectl label namespace "$MONITORING_NAMESPACE" --overwrite \
        app.kubernetes.io/part-of="ai-talent-marketplace" \
        monitoring="true"
    
    log "INFO" "Monitoring namespace configured successfully"
    return 0
}

# Create storage resources for monitoring components
setup_storage_resources() {
    log "INFO" "Setting up storage resources..."
    
    # Check for StorageClass
    if ! kubectl get storageclass gp3 &> /dev/null; then
        log "WARN" "StorageClass 'gp3' not found. Using default StorageClass."
        STORAGE_CLASS="$(kubectl get storageclass -o=jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].metadata.name}')"
        
        if [[ -z "$STORAGE_CLASS" ]]; then
            log "ERROR" "No default StorageClass found. Cannot create persistent volumes."
            return 1
        fi
        
        log "INFO" "Using default StorageClass: $STORAGE_CLASS"
    else
        STORAGE_CLASS="gp3"
    fi
    
    # Create PVCs for Prometheus
    cat <<EOF > "$TMP_DIR/prometheus-pvc.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-server
  namespace: $MONITORING_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: $STORAGE_CLASS
EOF
    
    kubectl apply -f "$TMP_DIR/prometheus-pvc.yaml"
    log "INFO" "Created PVC for Prometheus"
    
    # Create PVCs for Grafana
    cat <<EOF > "$TMP_DIR/grafana-pvc.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana
  namespace: $MONITORING_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: $STORAGE_CLASS
EOF
    
    kubectl apply -f "$TMP_DIR/grafana-pvc.yaml"
    log "INFO" "Created PVC for Grafana"
    
    # Create PVCs for Loki if not using S3
    if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        cat <<EOF > "$TMP_DIR/loki-pvc.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loki-chunks
  namespace: $MONITORING_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: $STORAGE_CLASS
EOF
        
        kubectl apply -f "$TMP_DIR/loki-pvc.yaml"
        log "INFO" "Created PVC for Loki"
    else
        log "INFO" "Skipping Loki PVC creation as S3 storage will be used"
    fi
    
    # Create PVCs for Tempo if not using S3
    if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        cat <<EOF > "$TMP_DIR/tempo-pvc.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tempo-data
  namespace: $MONITORING_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: $STORAGE_CLASS
EOF
        
        kubectl apply -f "$TMP_DIR/tempo-pvc.yaml"
        log "INFO" "Created PVC for Tempo"
    else
        log "INFO" "Skipping Tempo PVC creation as S3 storage will be used"
    fi
    
    log "INFO" "Storage resources setup completed"
    return 0
}

# Install and configure Prometheus
setup_prometheus() {
    log "INFO" "Setting up Prometheus..."
    
    # Add Prometheus Helm repo if not already added
    if ! helm repo list | grep -q "prometheus-community"; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        log "INFO" "Added Prometheus Helm repository"
    fi
    
    # Create directory for Prometheus config
    mkdir -p "$TMP_DIR/prometheus"
    
    # Copy Prometheus config from our template
    cp "$PROMETHEUS_CONFIG" "$TMP_DIR/prometheus/prometheus.yml"
    
    # Create directory for rules
    mkdir -p "$TMP_DIR/prometheus/rules"
    
    # Copy rules files
    cp "$PROMETHEUS_ALERTS" "$TMP_DIR/prometheus/rules/alerts.yml"
    cp "$PROMETHEUS_RECORDING" "$TMP_DIR/prometheus/rules/recording.yml"
    
    # Create Prometheus values file
    cat <<EOF > "$TMP_DIR/prometheus-values.yaml"
server:
  persistentVolume:
    existingClaim: prometheus-server
  configMapOverrideName: prometheus-server-conf
  
  extraFlags:
    - web.enable-lifecycle
    - storage.tsdb.retention.time=15d
    - storage.tsdb.min-block-duration=2h
    - storage.tsdb.max-block-duration=2h

  resources:
    limits:
      cpu: 1000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi

alertmanager:
  enabled: true
  config:
    global:
      resolve_timeout: 5m
    route:
      group_by: ['alertname', 'job', 'severity']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'slack'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty'
    receivers:
    - name: 'slack'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/replace-with-actual-webhook'
        channel: '#alerts'
        send_resolved: true
        title: "{{ template \"slack.default.title\" . }}"
        text: "{{ template \"slack.default.text\" . }}"
    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'replace-with-actual-key'
        send_resolved: true
    templates:
    - '/etc/alertmanager/template/*.tmpl'

  persistentVolume:
    enabled: true
    size: 5Gi
    storageClass: "$STORAGE_CLASS"

  resources:
    limits:
      cpu: 100m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 128Mi

pushgateway:
  enabled: true
  
nodeExporter:
  enabled: false

kubeStateMetrics:
  enabled: false

configmapReload:
  prometheus:
    enabled: true
  alertmanager:
    enabled: true

prometheus-node-exporter:
  enabled: false

prometheus-pushgateway:
  enabled: true
EOF
    
    # Create ConfigMap for Prometheus configuration
    kubectl create configmap prometheus-server-conf -n "$MONITORING_NAMESPACE" \
        --from-file="$TMP_DIR/prometheus/prometheus.yml" \
        --from-file="$TMP_DIR/prometheus/rules/" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Prometheus configuration ConfigMap"
    
    # Install Prometheus
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "prometheus"; then
        log "INFO" "Upgrading existing Prometheus installation"
        helm upgrade prometheus prometheus-community/prometheus \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$PROMETHEUS_CHART_VERSION" \
            --values "$TMP_DIR/prometheus-values.yaml"
    else
        log "INFO" "Installing Prometheus"
        helm install prometheus prometheus-community/prometheus \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$PROMETHEUS_CHART_VERSION" \
            --values "$TMP_DIR/prometheus-values.yaml"
    fi
    
    # Wait for Prometheus to be ready
    log "INFO" "Waiting for Prometheus to be ready..."
    kubectl rollout status statefulset/prometheus-server -n "$MONITORING_NAMESPACE" --timeout=300s
    
    log "INFO" "Prometheus setup completed"
    return 0
}

# Install and configure Grafana
setup_grafana() {
    log "INFO" "Setting up Grafana..."
    
    # Add Grafana Helm repo if not already added
    if ! helm repo list | grep -q "grafana"; then
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update
        log "INFO" "Added Grafana Helm repository"
    fi
    
    # Create directory for dashboards
    mkdir -p "$TMP_DIR/grafana/dashboards"
    
    # Copy dashboard JSON files
    cp "$GRAFANA_DASHBOARD_API_GATEWAY" "$TMP_DIR/grafana/dashboards/api-gateway.json"
    
    # Create ConfigMap for dashboards
    kubectl create configmap grafana-dashboards -n "$MONITORING_NAMESPACE" \
        --from-file="$TMP_DIR/grafana/dashboards/" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Grafana dashboards ConfigMap"
    
    # Create secret for Grafana admin credentials
    kubectl create secret generic grafana-admin-credentials -n "$MONITORING_NAMESPACE" \
        --from-literal=admin-user=admin \
        --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Grafana admin credentials secret"
    
    # Create Grafana values file
    cat <<EOF > "$TMP_DIR/grafana-values.yaml"
persistence:
  enabled: true
  existingClaim: grafana

admin:
  existingSecret: grafana-admin-credentials
  userKey: admin-user
  passwordKey: admin-password

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-server:80
      access: proxy
      isDefault: true
    - name: Loki
      type: loki
      url: http://loki:3100
      access: proxy
    - name: Tempo
      type: tempo
      url: http://tempo:3200
      access: proxy
      jsonData:
        httpMethod: GET
        serviceMap:
          datasourceUid: prometheus
        nodeGraph:
          enabled: true
        lokiSearch:
          datasourceUid: loki

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: true
      options:
        path: /var/lib/grafana/dashboards/default

dashboardsConfigMaps:
  default: grafana-dashboards

smtp:
  enabled: false
  host: smtp.example.com:587
  user: alerts@aitalentmarketplace.com
  password: "replace-with-actual-password"
  from_address: alerts@aitalentmarketplace.com
  from_name: Grafana Alerts

resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 500Mi

plugins:
  - grafana-piechart-panel
  - grafana-worldmap-panel
  - grafana-clock-panel
  - grafana-kubernetes-app

service:
  type: ClusterIP
  port: 80
EOF
    
    # Install Grafana
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "grafana"; then
        log "INFO" "Upgrading existing Grafana installation"
        helm upgrade grafana grafana/grafana \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$GRAFANA_CHART_VERSION" \
            --values "$TMP_DIR/grafana-values.yaml"
    else
        log "INFO" "Installing Grafana"
        helm install grafana grafana/grafana \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$GRAFANA_CHART_VERSION" \
            --values "$TMP_DIR/grafana-values.yaml"
    fi
    
    # Wait for Grafana to be ready
    log "INFO" "Waiting for Grafana to be ready..."
    kubectl rollout status deployment/grafana -n "$MONITORING_NAMESPACE" --timeout=300s
    
    log "INFO" "Grafana setup completed"
    return 0
}

# Install and configure Loki
setup_loki() {
    log "INFO" "Setting up Loki..."
    
    # Add Grafana Helm repo if not already added (should already be added by Grafana setup)
    if ! helm repo list | grep -q "grafana"; then
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update
        log "INFO" "Added Grafana Helm repository"
    fi
    
    # Create a copy of Loki config to modify
    mkdir -p "$TMP_DIR/loki"
    cp "$LOKI_CONFIG" "$TMP_DIR/loki/loki.yml"
    
    # Create Loki values file
    # Set up storage config based on whether we're using S3 or local PVCs
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        # Create secret for S3 credentials
        kubectl create secret generic loki-s3-credentials -n "$MONITORING_NAMESPACE" \
            --from-literal=access_key="$AWS_ACCESS_KEY_ID" \
            --from-literal=secret_key="$AWS_SECRET_ACCESS_KEY" \
            --dry-run=client -o yaml | kubectl apply -f -
        
        log "INFO" "Created Loki S3 credentials secret"
        
        cat <<EOF > "$TMP_DIR/loki-values.yaml"
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    bucketNames:
      chunks: $S3_BUCKET_LOGS
      ruler: $S3_BUCKET_LOGS
      admin: $S3_BUCKET_LOGS
    type: s3
    s3:
      s3: s3://$AWS_REGION/$S3_BUCKET_LOGS
      endpoint: s3.$AWS_REGION.amazonaws.com
      region: $AWS_REGION
      secretAccessKey: ${AWS_SECRET_ACCESS_KEY}
      accessKeyId: ${AWS_ACCESS_KEY_ID}
      s3ForcePathStyle: true
      insecure: false

singleBinary:
  replicas: 1
  extraVolumeMounts:
    - name: loki-config
      mountPath: /etc/loki/loki.yml
      subPath: loki.yml
  extraVolumes:
    - name: loki-config
      configMap:
        name: loki-config

serviceAccount:
  create: true
  name: loki
  annotations: {}

promtail:
  enabled: true
  config:
    logLevel: info
    serverPort: 3101
    clients:
      - url: http://loki:3100/loki/api/v1/push
  serviceMonitor:
    enabled: true
    scrapeInterval: 30s
EOF
    else
        # Using local PVCs
        cat <<EOF > "$TMP_DIR/loki-values.yaml"
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    type: filesystem

persistence:
  enabled: true
  existingClaim: loki-chunks

singleBinary:
  replicas: 1
  extraVolumeMounts:
    - name: loki-config
      mountPath: /etc/loki/loki.yml
      subPath: loki.yml
  extraVolumes:
    - name: loki-config
      configMap:
        name: loki-config

serviceAccount:
  create: true
  name: loki
  annotations: {}

promtail:
  enabled: true
  config:
    logLevel: info
    serverPort: 3101
    clients:
      - url: http://loki:3100/loki/api/v1/push
  serviceMonitor:
    enabled: true
    scrapeInterval: 30s
EOF
    fi
    
    # Create ConfigMap for Loki configuration
    kubectl create configmap loki-config -n "$MONITORING_NAMESPACE" \
        --from-file="$TMP_DIR/loki/loki.yml" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Loki configuration ConfigMap"
    
    # Install Loki
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "loki"; then
        log "INFO" "Upgrading existing Loki installation"
        helm upgrade loki grafana/loki \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$LOKI_CHART_VERSION" \
            --values "$TMP_DIR/loki-values.yaml"
    else
        log "INFO" "Installing Loki"
        helm install loki grafana/loki \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$LOKI_CHART_VERSION" \
            --values "$TMP_DIR/loki-values.yaml"
    fi
    
    # Wait for Loki to be ready
    log "INFO" "Waiting for Loki to be ready..."
    kubectl rollout status statefulset/loki -n "$MONITORING_NAMESPACE" --timeout=300s || true
    
    log "INFO" "Loki setup completed"
    return 0
}

# Install and configure Tempo
setup_tempo() {
    log "INFO" "Setting up Tempo..."
    
    # Add Grafana Helm repo if not already added (should already be added by Grafana setup)
    if ! helm repo list | grep -q "grafana"; then
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update
        log "INFO" "Added Grafana Helm repository"
    fi
    
    # Create a copy of Tempo config to modify
    mkdir -p "$TMP_DIR/tempo"
    cp "$TEMPO_CONFIG" "$TMP_DIR/tempo/tempo.yml"
    
    # Create Tempo values file
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        # Create secret for S3 credentials (if not already created by Loki)
        if ! kubectl get secret tempo-s3-credentials -n "$MONITORING_NAMESPACE" &> /dev/null; then
            kubectl create secret generic tempo-s3-credentials -n "$MONITORING_NAMESPACE" \
                --from-literal=access_key="$AWS_ACCESS_KEY_ID" \
                --from-literal=secret_key="$AWS_SECRET_ACCESS_KEY" \
                --dry-run=client -o yaml | kubectl apply -f -
            
            log "INFO" "Created Tempo S3 credentials secret"
        fi
        
        cat <<EOF > "$TMP_DIR/tempo-values.yaml"
tempo:
  extraArgs:
    - -config.file=/etc/tempo/tempo.yml
  extraVolumeMounts:
    - name: tempo-config
      mountPath: /etc/tempo/tempo.yml
      subPath: tempo.yml
  extraVolumes:
    - name: tempo-config
      configMap:
        name: tempo-config
  serviceAccount:
    create: true
    name: tempo
  persistence:
    enabled: false
  storage:
    trace:
      backend: s3
      s3:
        bucket: $S3_BUCKET_TRACES
        endpoint: s3.$AWS_REGION.amazonaws.com
        region: $AWS_REGION
        access_key: ${AWS_ACCESS_KEY_ID}
        secret_key: ${AWS_SECRET_ACCESS_KEY}

serviceAccount:
  create: true
  name: tempo
  annotations: {}

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

service:
  type: ClusterIP
  annotations: {}

# Enable the OpenTelemetry Collector
opentelemetry-collector:
  enabled: true
  config:
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    exporters:
      otlp:
        endpoint: tempo:4317
    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [otlp]
EOF
    else
        # Using local PVCs
        cat <<EOF > "$TMP_DIR/tempo-values.yaml"
tempo:
  extraArgs:
    - -config.file=/etc/tempo/tempo.yml
  extraVolumeMounts:
    - name: tempo-config
      mountPath: /etc/tempo/tempo.yml
      subPath: tempo.yml
  extraVolumes:
    - name: tempo-config
      configMap:
        name: tempo-config
  serviceAccount:
    create: true
    name: tempo
  persistence:
    enabled: true
    existingClaim: tempo-data
  storage:
    trace:
      backend: local
      local:
        path: /data

serviceAccount:
  create: true
  name: tempo
  annotations: {}

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

service:
  type: ClusterIP
  annotations: {}

# Enable the OpenTelemetry Collector
opentelemetry-collector:
  enabled: true
  config:
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    exporters:
      otlp:
        endpoint: tempo:4317
    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [otlp]
EOF
    fi
    
    # Create ConfigMap for Tempo configuration
    kubectl create configmap tempo-config -n "$MONITORING_NAMESPACE" \
        --from-file="$TMP_DIR/tempo/tempo.yml" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Tempo configuration ConfigMap"
    
    # Install Tempo
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "tempo"; then
        log "INFO" "Upgrading existing Tempo installation"
        helm upgrade tempo grafana/tempo \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$TEMPO_CHART_VERSION" \
            --values "$TMP_DIR/tempo-values.yaml"
    else
        log "INFO" "Installing Tempo"
        helm install tempo grafana/tempo \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$TEMPO_CHART_VERSION" \
            --values "$TMP_DIR/tempo-values.yaml"
    fi
    
    # Wait for Tempo to be ready
    log "INFO" "Waiting for Tempo to be ready..."
    kubectl rollout status statefulset/tempo -n "$MONITORING_NAMESPACE" --timeout=300s || true
    
    log "INFO" "Tempo setup completed"
    return 0
}

# Install and configure Alertmanager
setup_alertmanager() {
    log "INFO" "Setting up Alertmanager..."
    
    # Alertmanager is deployed as part of Prometheus Helm chart
    # Here we just create or update the configuration
    
    # Create Alertmanager config template
    cat <<EOF > "$TMP_DIR/alertmanager-config.yaml"
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alertmanager-config
  namespace: $MONITORING_NAMESPACE
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      smtp_smarthost: 'smtp.example.com:587'
      smtp_from: 'alerts@aitalentmarketplace.com'
      smtp_auth_username: 'alerts@aitalentmarketplace.com'
      smtp_auth_password: 'replace-with-actual-password'
      smtp_require_tls: true
    
    templates:
    - '/etc/alertmanager/template/*.tmpl'
    
    route:
      receiver: 'slack-notifications'
      group_by: ['alertname', 'job', 'severity']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty-notifications'
        continue: true
      - match:
          severity: warning
        receiver: 'email-notifications'
        continue: true
    
    receivers:
    - name: 'slack-notifications'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/replace-with-actual-webhook'
        channel: '#alerts'
        send_resolved: true
        title: "{{ template \"slack.default.title\" . }}"
        text: "{{ template \"slack.default.text\" . }}"
    
    - name: 'pagerduty-notifications'
      pagerduty_configs:
      - service_key: 'replace-with-actual-key'
        send_resolved: true
    
    - name: 'email-notifications'
      email_configs:
      - to: 'oncall@aitalentmarketplace.com'
        send_resolved: true
EOF
    
    # Create Alertmanager templates
    mkdir -p "$TMP_DIR/alertmanager-templates"
    
    cat <<EOF > "$TMP_DIR/alertmanager-templates/default.tmpl"
{{ define "slack.default.title" }}
    [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
{{ end }}

{{ define "slack.default.text" }}
{{ range .Alerts }}
*Alert:* {{ .Labels.alertname }}
*Description:* {{ .Annotations.description }}
*Details:*
  {{ range .Labels.SortedPairs }} • *{{ .Name }}:* `{{ .Value }}`
  {{ end }}
{{ end }}
{{ end }}
EOF
    
    # Create ConfigMap for Alertmanager templates
    kubectl create configmap prometheus-alertmanager-templates -n "$MONITORING_NAMESPACE" \
        --from-file="$TMP_DIR/alertmanager-templates/" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "INFO" "Created Alertmanager templates ConfigMap"
    
    # Apply Alertmanager configuration
    kubectl apply -f "$TMP_DIR/alertmanager-config.yaml"
    
    log "INFO" "Applied Alertmanager configuration"
    
    # Restart Alertmanager to pick up new configuration
    if kubectl get pod -n "$MONITORING_NAMESPACE" -l "app=prometheus,component=alertmanager" &> /dev/null; then
        kubectl delete pod -n "$MONITORING_NAMESPACE" -l "app=prometheus,component=alertmanager"
        log "INFO" "Restarted Alertmanager to apply new configuration"
    fi
    
    log "INFO" "Alertmanager setup completed"
    return 0
}

# Install and configure Node Exporter for host metrics
setup_node_exporter() {
    log "INFO" "Setting up Node Exporter..."
    
    # Add Prometheus Helm repo if not already added
    if ! helm repo list | grep -q "prometheus-community"; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        log "INFO" "Added Prometheus Helm repository"
    fi
    
    # Create Node Exporter values file
    cat <<EOF > "$TMP_DIR/node-exporter-values.yaml"
hostRootfs: true
hostPID: true

podLabels:
  app.kubernetes.io/name: node-exporter
  app.kubernetes.io/part-of: ai-talent-marketplace

service:
  port: 9100
  targetPort: 9100

resources:
  limits:
    cpu: 200m
    memory: 50Mi
  requests:
    cpu: 100m
    memory: 30Mi

serviceAccount:
  create: true
  name: node-exporter

serviceMonitor:
  enabled: true
  interval: 30s
  scrapeTimeout: 10s
  namespace: $MONITORING_NAMESPACE
EOF
    
    # Install Node Exporter
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "node-exporter"; then
        log "INFO" "Upgrading existing Node Exporter installation"
        helm upgrade node-exporter prometheus-community/prometheus-node-exporter \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$NODE_EXPORTER_CHART_VERSION" \
            --values "$TMP_DIR/node-exporter-values.yaml"
    else
        log "INFO" "Installing Node Exporter"
        helm install node-exporter prometheus-community/prometheus-node-exporter \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$NODE_EXPORTER_CHART_VERSION" \
            --values "$TMP_DIR/node-exporter-values.yaml"
    fi
    
    # Wait for Node Exporter to be ready
    log "INFO" "Waiting for Node Exporter to be ready..."
    kubectl rollout status daemonset/node-exporter -n "$MONITORING_NAMESPACE" --timeout=300s
    
    log "INFO" "Node Exporter setup completed"
    return 0
}

# Install and configure kube-state-metrics for Kubernetes metrics
setup_kube_state_metrics() {
    log "INFO" "Setting up kube-state-metrics..."
    
    # Add Prometheus Helm repo if not already added
    if ! helm repo list | grep -q "prometheus-community"; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        log "INFO" "Added Prometheus Helm repository"
    fi
    
    # Create kube-state-metrics values file
    cat <<EOF > "$TMP_DIR/kube-state-metrics-values.yaml"
prometheusScrape: true

podLabels:
  app.kubernetes.io/name: kube-state-metrics
  app.kubernetes.io/part-of: ai-talent-marketplace

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 10m
    memory: 32Mi

serviceAccount:
  create: true
  name: kube-state-metrics

serviceMonitor:
  enabled: true
  namespace: $MONITORING_NAMESPACE
  interval: 30s
  scrapeTimeout: 10s
EOF
    
    # Install kube-state-metrics
    if helm list -n "$MONITORING_NAMESPACE" | grep -q "kube-state-metrics"; then
        log "INFO" "Upgrading existing kube-state-metrics installation"
        helm upgrade kube-state-metrics prometheus-community/kube-state-metrics \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$KUBE_STATE_METRICS_CHART_VERSION" \
            --values "$TMP_DIR/kube-state-metrics-values.yaml"
    else
        log "INFO" "Installing kube-state-metrics"
        helm install kube-state-metrics prometheus-community/kube-state-metrics \
            --namespace "$MONITORING_NAMESPACE" \
            --version "$KUBE_STATE_METRICS_CHART_VERSION" \
            --values "$TMP_DIR/kube-state-metrics-values.yaml"
    fi
    
    # Wait for kube-state-metrics to be ready
    log "INFO" "Waiting for kube-state-metrics to be ready..."
    kubectl rollout status deployment/kube-state-metrics -n "$MONITORING_NAMESPACE" --timeout=300s
    
    log "INFO" "kube-state-metrics setup completed"
    return 0
}

# Configure ingress for monitoring components
configure_ingress() {
    log "INFO" "Configuring ingress for monitoring components..."
    
    # Check if ingress controller is available
    if ! kubectl get ingressclass &> /dev/null; then
        log "WARN" "No IngressClass found. Skipping ingress configuration."
        return 0
    fi
    
    # Get the default ingress class
    INGRESS_CLASS=$(kubectl get ingressclass -o=jsonpath='{.items[?(@.metadata.annotations.ingressclass\.kubernetes\.io/is-default-class=="true")].metadata.name}')
    
    if [[ -z "$INGRESS_CLASS" ]]; then
        # Try to find any ingress class if no default
        INGRESS_CLASS=$(kubectl get ingressclass -o=jsonpath='{.items[0].metadata.name}')
    fi
    
    if [[ -z "$INGRESS_CLASS" ]]; then
        log "WARN" "No IngressClass found. Skipping ingress configuration."
        return 0
    fi
    
    log "INFO" "Using IngressClass: $INGRESS_CLASS"
    
    # Define the base domain (replace with actual domain in production)
    DOMAIN="${DOMAIN:-monitoring.example.com}"
    
    # Create ingress for Grafana
    cat <<EOF > "$TMP_DIR/grafana-ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: $MONITORING_NAMESPACE
  annotations:
    kubernetes.io/ingress.class: $INGRESS_CLASS
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - grafana.$DOMAIN
    secretName: grafana-tls
  rules:
  - host: grafana.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 80
EOF
    
    # Create ingress for Prometheus
    cat <<EOF > "$TMP_DIR/prometheus-ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus
  namespace: $MONITORING_NAMESPACE
  annotations:
    kubernetes.io/ingress.class: $INGRESS_CLASS
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # Add authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: prometheus-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
spec:
  tls:
  - hosts:
    - prometheus.$DOMAIN
    secretName: prometheus-tls
  rules:
  - host: prometheus.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-server
            port:
              number: 80
EOF
    
    # Create ingress for Alertmanager
    cat <<EOF > "$TMP_DIR/alertmanager-ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alertmanager
  namespace: $MONITORING_NAMESPACE
  annotations:
    kubernetes.io/ingress.class: $INGRESS_CLASS
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # Add authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: prometheus-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
spec:
  tls:
  - hosts:
    - alertmanager.$DOMAIN
    secretName: alertmanager-tls
  rules:
  - host: alertmanager.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-alertmanager
            port:
              number: 80
EOF
    
    # Create basic auth secret for Prometheus and Alertmanager
    # Generate a secure password
    PROMETHEUS_PASSWORD=$(openssl rand -base64 12)
    PROMETHEUS_AUTH=$(htpasswd -nb admin "$PROMETHEUS_PASSWORD" | base64)
    
    cat <<EOF > "$TMP_DIR/prometheus-auth.yaml"
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-auth
  namespace: $MONITORING_NAMESPACE
type: Opaque
data:
  auth: $PROMETHEUS_AUTH
EOF
    
    # Apply ingress resources
    kubectl apply -f "$TMP_DIR/grafana-ingress.yaml"
    kubectl apply -f "$TMP_DIR/prometheus-auth.yaml"
    kubectl apply -f "$TMP_DIR/prometheus-ingress.yaml"
    kubectl apply -f "$TMP_DIR/alertmanager-ingress.yaml"
    
    log "INFO" "Ingress configured for monitoring components"
    log "INFO" "Grafana URL: https://grafana.$DOMAIN"
    log "INFO" "Prometheus URL: https://prometheus.$DOMAIN (login: admin / $PROMETHEUS_PASSWORD)"
    log "INFO" "Alertmanager URL: https://alertmanager.$DOMAIN (login: admin / $PROMETHEUS_PASSWORD)"
    
    return 0
}

# Configure RBAC permissions for monitoring components
setup_rbac() {
    log "INFO" "Setting up RBAC for monitoring components..."
    
    # Create ClusterRole for Prometheus
    cat <<EOF > "$TMP_DIR/prometheus-rbac.yaml"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-server
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - nodes/metrics
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: ["extensions"]
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-server
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-server
subjects:
- kind: ServiceAccount
  name: prometheus-server
  namespace: $MONITORING_NAMESPACE
EOF
    
    kubectl apply -f "$TMP_DIR/prometheus-rbac.yaml"
    
    # Create ClusterRole for kube-state-metrics
    cat <<EOF > "$TMP_DIR/kube-state-metrics-rbac.yaml"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics
rules:
- apiGroups: [""]
  resources:
  - configmaps
  - secrets
  - nodes
  - pods
  - services
  - resourcequotas
  - replicationcontrollers
  - limitranges
  - persistentvolumeclaims
  - persistentvolumes
  - namespaces
  - endpoints
  verbs: ["list", "watch"]
- apiGroups: ["extensions"]
  resources:
  - daemonsets
  - deployments
  - replicasets
  - ingresses
  verbs: ["list", "watch"]
- apiGroups: ["apps"]
  resources:
  - statefulsets
  - daemonsets
  - deployments
  - replicasets
  verbs: ["list", "watch"]
- apiGroups: ["batch"]
  resources:
  - cronjobs
  - jobs
  verbs: ["list", "watch"]
- apiGroups: ["autoscaling"]
  resources:
  - horizontalpodautoscalers
  verbs: ["list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources:
  - ingresses
  verbs: ["list", "watch"]
- apiGroups: ["policy"]
  resources:
  - poddisruptionbudgets
  verbs: ["list", "watch"]
- apiGroups: ["certificates.k8s.io"]
  resources:
  - certificatesigningrequests
  verbs: ["list", "watch"]
- apiGroups: ["storage.k8s.io"]
  resources:
  - storageclasses
  - volumeattachments
  verbs: ["list", "watch"]
- apiGroups: ["admissionregistration.k8s.io"]
  resources:
  - mutatingwebhookconfigurations
  - validatingwebhookconfigurations
  verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-state-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: $MONITORING_NAMESPACE
EOF
    
    kubectl apply -f "$TMP_DIR/kube-state-metrics-rbac.yaml"
    
    # Create Role for Node Exporter
    cat <<EOF > "$TMP_DIR/node-exporter-rbac.yaml"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-exporter
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - nodes/metrics
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-exporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-exporter
subjects:
- kind: ServiceAccount
  name: node-exporter
  namespace: $MONITORING_NAMESPACE
EOF
    
    kubectl apply -f "$TMP_DIR/node-exporter-rbac.yaml"
    
    log "INFO" "RBAC setup completed"
    return 0
}

# Configure monitoring for platform services
setup_monitoring_for_services() {
    log "INFO" "Setting up monitoring for platform services..."
    
    # Create ServiceMonitor for API Gateway
    cat <<EOF > "$TMP_DIR/api-gateway-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-gateway
  namespace: $MONITORING_NAMESPACE
  labels:
    app: api-gateway
    release: prometheus
spec:
  selector:
    matchLabels:
      app: api-gateway
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for User Service
    cat <<EOF > "$TMP_DIR/user-service-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: user-service
  namespace: $MONITORING_NAMESPACE
  labels:
    app: user-service
    release: prometheus
spec:
  selector:
    matchLabels:
      app: user-service
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for Job Service
    cat <<EOF > "$TMP_DIR/job-service-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: job-service
  namespace: $MONITORING_NAMESPACE
  labels:
    app: job-service
    release: prometheus
spec:
  selector:
    matchLabels:
      app: job-service
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for Payment Service
    cat <<EOF > "$TMP_DIR/payment-service-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payment-service
  namespace: $MONITORING_NAMESPACE
  labels:
    app: payment-service
    release: prometheus
spec:
  selector:
    matchLabels:
      app: payment-service
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for Collaboration Service
    cat <<EOF > "$TMP_DIR/collaboration-service-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: collaboration-service
  namespace: $MONITORING_NAMESPACE
  labels:
    app: collaboration-service
    release: prometheus
spec:
  selector:
    matchLabels:
      app: collaboration-service
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for AI Service
    cat <<EOF > "$TMP_DIR/ai-service-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ai-service
  namespace: $MONITORING_NAMESPACE
  labels:
    app: ai-service
    release: prometheus
spec:
  selector:
    matchLabels:
      app: ai-service
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
EOF
    
    # Create ServiceMonitor for Database
    cat <<EOF > "$TMP_DIR/database-servicemonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-exporter
  namespace: $MONITORING_NAMESPACE
  labels:
    app: postgres-exporter
    release: prometheus
spec:
  selector:
    matchLabels:
      app: postgres-exporter
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF
    
    # Apply all ServiceMonitors
    kubectl apply -f "$TMP_DIR/api-gateway-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/user-service-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/job-service-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/payment-service-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/collaboration-service-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/ai-service-servicemonitor.yaml"
    kubectl apply -f "$TMP_DIR/database-servicemonitor.yaml"
    
    # Create PodMonitors for services that don't expose metrics via Service
    cat <<EOF > "$TMP_DIR/frontend-podmonitor.yaml"
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: frontend
  namespace: $MONITORING_NAMESPACE
  labels:
    app: frontend
    release: prometheus
spec:
  selector:
    matchLabels:
      app: frontend
  namespaceSelector:
    matchNames:
      - $APP_NAMESPACE
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF
    
    kubectl apply -f "$TMP_DIR/frontend-podmonitor.yaml"
    
    log "INFO" "Service monitoring configuration completed"
    return 0
}

# Verify the monitoring stack is working correctly
verify_monitoring_stack() {
    log "INFO" "Verifying monitoring stack..."
    
    # Check all monitoring pods are running
    log "INFO" "Checking Prometheus pods..."
    PROMETHEUS_PODS=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l "app=prometheus" -o jsonpath="{.items[*].status.phase}")
    if [[ "$PROMETHEUS_PODS" != *"Running"* ]]; then
        log "WARN" "Prometheus pods are not running: $PROMETHEUS_PODS"
    else
        log "INFO" "Prometheus pods are running"
    fi
    
    log "INFO" "Checking Grafana pods..."
    GRAFANA_PODS=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l "app.kubernetes.io/name=grafana" -o jsonpath="{.items[*].status.phase}")
    if [[ "$GRAFANA_PODS" != *"Running"* ]]; then
        log "WARN" "Grafana pods are not running: $GRAFANA_PODS"
    else
        log "INFO" "Grafana pods are running"
    fi
    
    log "INFO" "Checking Loki pods..."
    LOKI_PODS=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l "app=loki" -o jsonpath="{.items[*].status.phase}")
    if [[ "$LOKI_PODS" != *"Running"* ]]; then
        log "WARN" "Loki pods are not running: $LOKI_PODS"
    else
        log "INFO" "Loki pods are running"
    fi
    
    log "INFO" "Checking Tempo pods..."
    TEMPO_PODS=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l "app=tempo" -o jsonpath="{.items[*].status.phase}")
    if [[ "$TEMPO_PODS" != *"Running"* ]]; then
        log "WARN" "Tempo pods are not running: $TEMPO_PODS"
    else
        log "INFO" "Tempo pods are running"
    fi
    
    # Verify Prometheus can scrape metrics from services
    log "INFO" "Verifying Prometheus can scrape metrics..."
    PROMETHEUS_PORT_FORWARD_PID=""
    
    # Start port-forward to Prometheus in the background
    kubectl port-forward -n "$MONITORING_NAMESPACE" svc/prometheus-server 9090:80 &>/dev/null &
    PROMETHEUS_PORT_FORWARD_PID=$!
    
    # Wait for port-forward to establish
    sleep 3
    
    # Query Prometheus targets
    if curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets | length' > /dev/null; then
        ACTIVE_TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets | length')
        log "INFO" "Prometheus is scraping $ACTIVE_TARGETS targets"
    else
        log "WARN" "Could not query Prometheus API"
    fi
    
    # Kill port-forward process
    if [[ -n "$PROMETHEUS_PORT_FORWARD_PID" ]]; then
        kill $PROMETHEUS_PORT_FORWARD_PID &>/dev/null || true
    fi
    
    # Overall status
    log "INFO" "Monitoring stack verification completed"
    log "INFO" "Note: Some warnings may be normal during initial deployment"
    
    return 0
}

# Display information about accessing the monitoring stack
display_access_info() {
    log "INFO" "Displaying access information for monitoring components..."
    
    # Get Grafana service details
    GRAFANA_SERVICE=$(kubectl get svc -n "$MONITORING_NAMESPACE" -l "app.kubernetes.io/name=grafana" -o jsonpath="{.items[0].metadata.name}")
    
    # Get Prometheus service details
    PROMETHEUS_SERVICE=$(kubectl get svc -n "$MONITORING_NAMESPACE" -l "app=prometheus,component=server" -o jsonpath="{.items[0].metadata.name}")
    
    # Get Alertmanager service details
    ALERTMANAGER_SERVICE=$(kubectl get svc -n "$MONITORING_NAMESPACE" -l "app=prometheus,component=alertmanager" -o jsonpath="{.items[0].metadata.name}")
    
    # Check if ingress resources exist
    if kubectl get ingress -n "$MONITORING_NAMESPACE" grafana &> /dev/null; then
        GRAFANA_HOST=$(kubectl get ingress -n "$MONITORING_NAMESPACE" grafana -o jsonpath="{.spec.rules[0].host}")
        GRAFANA_URL="https://$GRAFANA_HOST"
    else
        GRAFANA_URL="http://localhost:3000 (use kubectl port-forward)"
    fi
    
    if kubectl get ingress -n "$MONITORING_NAMESPACE" prometheus &> /dev/null; then
        PROMETHEUS_HOST=$(kubectl get ingress -n "$MONITORING_NAMESPACE" prometheus -o jsonpath="{.spec.rules[0].host}")
        PROMETHEUS_URL="https://$PROMETHEUS_HOST"
    else
        PROMETHEUS_URL="http://localhost:9090 (use kubectl port-forward)"
    fi
    
    if kubectl get ingress -n "$MONITORING_NAMESPACE" alertmanager &> /dev/null; then
        ALERTMANAGER_HOST=$(kubectl get ingress -n "$MONITORING_NAMESPACE" alertmanager -o jsonpath="{.spec.rules[0].host}")
        ALERTMANAGER_URL="https://$ALERTMANAGER_HOST"
    else
        ALERTMANAGER_URL="http://localhost:9093 (use kubectl port-forward)"
    fi
    
    echo ""
    echo "==== AI Talent Marketplace Monitoring Stack Access Information ===="
    echo ""
    echo "Grafana:"
    echo "  URL: $GRAFANA_URL"
    echo "  Username: admin"
    echo "  Password: $GRAFANA_ADMIN_PASSWORD"
    echo "  Port-forward command: kubectl port-forward -n $MONITORING_NAMESPACE svc/$GRAFANA_SERVICE 3000:80"
    echo ""
    echo "Prometheus:"
    echo "  URL: $PROMETHEUS_URL"
    echo "  Port-forward command: kubectl port-forward -n $MONITORING_NAMESPACE svc/$PROMETHEUS_SERVICE 9090:80"
    echo ""
    echo "Alertmanager:"
    echo "  URL: $ALERTMANAGER_URL"
    echo "  Port-forward command: kubectl port-forward -n $MONITORING_NAMESPACE svc/$ALERTMANAGER_SERVICE 9093:80"
    echo ""
    echo "To access these services locally using port-forward, run the respective command in a terminal."
    echo ""
    echo "==== Monitoring Stack Setup Complete ===="
    echo ""
}

# Back up monitoring configurations
backup_configurations() {
    log "INFO" "Backing up monitoring configurations..."
    
    # Create backup directory
    BACKUP_DIR="${SCRIPT_DIR}/monitoring-backups/$(date +"%Y-%m-%d_%H-%M-%S")"
    mkdir -p "$BACKUP_DIR"
    
    # Back up Prometheus configuration
    if kubectl get configmap -n "$MONITORING_NAMESPACE" prometheus-server-conf &> /dev/null; then
        kubectl get configmap -n "$MONITORING_NAMESPACE" prometheus-server-conf -o yaml > "$BACKUP_DIR/prometheus-config.yaml"
        log "INFO" "Backed up Prometheus configuration"
    fi
    
    # Back up Grafana dashboards
    if kubectl get configmap -n "$MONITORING_NAMESPACE" grafana-dashboards &> /dev/null; then
        kubectl get configmap -n "$MONITORING_NAMESPACE" grafana-dashboards -o yaml > "$BACKUP_DIR/grafana-dashboards.yaml"
        log "INFO" "Backed up Grafana dashboards"
    fi
    
    # Back up Loki configuration
    if kubectl get configmap -n "$MONITORING_NAMESPACE" loki-config &> /dev/null; then
        kubectl get configmap -n "$MONITORING_NAMESPACE" loki-config -o yaml > "$BACKUP_DIR/loki-config.yaml"
        log "INFO" "Backed up Loki configuration"
    fi
    
    # Back up Tempo configuration
    if kubectl get configmap -n "$MONITORING_NAMESPACE" tempo-config &> /dev/null; then
        kubectl get configmap -n "$MONITORING_NAMESPACE" tempo-config -o yaml > "$BACKUP_DIR/tempo-config.yaml"
        log "INFO" "Backed up Tempo configuration"
    fi
    
    # Back up ServiceMonitors
    kubectl get servicemonitor -n "$MONITORING_NAMESPACE" -o yaml > "$BACKUP_DIR/servicemonitors.yaml"
    log "INFO" "Backed up ServiceMonitors"
    
    # Back up PodMonitors
    kubectl get podmonitor -n "$MONITORING_NAMESPACE" -o yaml > "$BACKUP_DIR/podmonitors.yaml"
    log "INFO" "Backed up PodMonitors"
    
    # Back up Prometheus rules
    kubectl get prometheusrule -n "$MONITORING_NAMESPACE" -o yaml > "$BACKUP_DIR/prometheusrules.yaml"
    log "INFO" "Backed up Prometheus rules"
    
    # Archive the backup directory
    BACKUP_ARCHIVE="${SCRIPT_DIR}/monitoring-backup-$(date +"%Y-%m-%d_%H-%M-%S").tar.gz"
    tar -czf "$BACKUP_ARCHIVE" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
    
    # Copy to S3 if configured
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" && -n "$S3_BUCKET_LOGS" ]]; then
        aws s3 cp "$BACKUP_ARCHIVE" "s3://$S3_BUCKET_LOGS/monitoring-backups/$(basename "$BACKUP_ARCHIVE")"
        log "INFO" "Backed up configurations to S3: s3://$S3_BUCKET_LOGS/monitoring-backups/$(basename "$BACKUP_ARCHIVE")"
    fi
    
    log "INFO" "Backup completed: $BACKUP_ARCHIVE"
    return 0
}

# Main function
main() {
    # Print banner
    echo "========================================================"
    echo "AI Talent Marketplace - Monitoring Setup"
    echo "Version: 1.0.0"
    echo "========================================================"
    echo ""
    
    # Initialize log file
    echo "# AI Talent Marketplace Monitoring Setup Log" > "$LOG_FILE"
    echo "# Started at $(date)" >> "$LOG_FILE"
    echo "=======================================================" >> "$LOG_FILE"
    
    # Process command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                MONITORING_NAMESPACE="$2"
                shift 2
                ;;
            --cluster-name)
                CLUSTER_NAME="$2"
                shift 2
                ;;
            --aws-region)
                AWS_REGION="$2"
                shift 2
                ;;
            --logs-bucket)
                S3_BUCKET_LOGS="$2"
                shift 2
                ;;
            --traces-bucket)
                S3_BUCKET_TRACES="$2"
                shift 2
                ;;
            --grafana-password)
                GRAFANA_ADMIN_PASSWORD="$2"
                shift 2
                ;;
            --app-namespace)
                APP_NAMESPACE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --namespace NAME        Kubernetes namespace for monitoring components (default: monitoring)"
                echo "  --cluster-name NAME     Cluster name (default: ai-talent-marketplace)"
                echo "  --aws-region REGION     AWS region for S3 storage (default: us-east-1)"
                echo "  --logs-bucket BUCKET    S3 bucket for logs storage (default: ai-talent-marketplace-logs)"
                echo "  --traces-bucket BUCKET  S3 bucket for traces storage (default: ai-talent-marketplace-traces)"
                echo "  --grafana-password PWD  Initial Grafana admin password (default: admin)"
                echo "  --app-namespace NAME    Application namespace to monitor (default: ai-talent-marketplace)"
                echo "  --help                  Display this help message"
                exit 0
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed. Please fix the issues and try again."
        exit 1
    fi
    
    # Create monitoring namespace
    if ! create_monitoring_namespace; then
        log "ERROR" "Failed to create monitoring namespace."
        exit 1
    fi
    
    # Setup storage resources
    if ! setup_storage_resources; then
        log "ERROR" "Failed to set up storage resources."
        exit 1
    fi
    
    # Setup Prometheus
    if ! setup_prometheus; then
        log "ERROR" "Failed to set up Prometheus."
        exit 1
    fi
    
    # Setup Grafana
    if ! setup_grafana; then
        log "ERROR" "Failed to set up Grafana."
        exit 1
    fi
    
    # Setup Loki
    if ! setup_loki; then
        log "ERROR" "Failed to set up Loki."
        exit 1
    fi
    
    # Setup Tempo
    if ! setup_tempo; then
        log "ERROR" "Failed to set up Tempo."
        exit 1
    fi
    
    # Setup Alertmanager
    if ! setup_alertmanager; then
        log "ERROR" "Failed to set up Alertmanager."
        exit 1
    fi
    
    # Setup Node Exporter
    if ! setup_node_exporter; then
        log "ERROR" "Failed to set up Node Exporter."
        exit 1
    fi
    
    # Setup kube-state-metrics
    if ! setup_kube_state_metrics; then
        log "ERROR" "Failed to set up kube-state-metrics."
        exit 1
    fi
    
    # Setup RBAC
    if ! setup_rbac; then
        log "ERROR" "Failed to set up RBAC."
        exit 1
    fi
    
    # Setup monitoring for services
    if ! setup_monitoring_for_services; then
        log "ERROR" "Failed to set up monitoring for services."
        exit 1
    fi
    
    # Configure ingress
    if ! configure_ingress; then
        log "ERROR" "Failed to configure ingress."
        exit 1
    fi
    
    # Verify monitoring stack
    if ! verify_monitoring_stack; then
        log "WARN" "Monitoring stack verification reported issues."
    fi
    
    # Backup configurations
    if ! backup_configurations; then
        log "WARN" "Failed to back up configurations."
    fi
    
    # Display access information
    display_access_info
    
    log "INFO" "Monitoring setup completed successfully!"
    return 0
}

# Execute main function
main "$@"