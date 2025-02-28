# HashiCorp Vault Server Configuration
# AI Talent Marketplace Platform - Secrets Management Infrastructure
# Version: 1.0.0

# General server configuration
ui = true
api_addr = "https://vault.service.consul:8200"
cluster_addr = "https://vault.service.consul:8201"
default_lease_ttl = "24h"
max_lease_ttl = "720h"
disable_mlock = false
log_level = "info"

# Primary storage backend configuration using Consul for HA
storage "consul" {
  address = "consul.service.consul:8500"
  path = "vault/"
  scheme = "https"
  tls_disable = 0
  token = "CONSUL_ACL_TOKEN"
  service_tags = "prod,aitm"
  service = "vault"
  consistency_mode = "strong"
}

# High-availability storage configuration
ha_storage "consul" {
  address = "consul.service.consul:8500"
  path = "vault-ha/"
  token = "CONSUL_ACL_TOKEN"
  consistency_mode = "strong"
}

# API listener configuration
listener "tcp" {
  address = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file = "/etc/vault/tls/vault.key"
  tls_min_version = "tls12"
  tls_prefer_server_cipher_suites = true
  tls_cipher_suites = "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
  proxy_protocol_behavior = 1
}

# Auto-unseal configuration using AWS KMS
seal "awskms" {
  region = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  endpoint = "https://kms.us-east-1.amazonaws.com"
}

# Telemetry configuration for monitoring
telemetry {
  statsite_address = "statsite.service.consul:8125"
  prometheus_retention_time = "30s"
  disable_hostname = true
  dogstatsd_addr = "datadog-agent.service.consul:8125"
}

# Service registration for discovery
service_registration "kubernetes" {
  namespace = "security"
  pod_name = "${POD_NAME}"
}