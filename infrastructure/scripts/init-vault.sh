#!/bin/bash
# init-vault.sh - HashiCorp Vault Initialization and Configuration Script
# Version: 1.0.0
#
# This script automates the initialization and configuration of HashiCorp Vault
# for the AI Talent Marketplace platform. It handles:
# - Vault initialization and unsealing
# - Authentication methods setup
# - Policy configuration
# - Secrets engines enabling and configuration
# - Initial secrets storage
# - Audit logging and monitoring setup
#
# Requirements:
# - vault CLI (v1.13.x+)
# - aws CLI (v2.x+)
# - kubectl (v1.25.x+)
# - jq (v1.6+)
#
# Environment variables required:
# - VAULT_ADDR: Vault server address
# - AWS_REGION: AWS region
# - S3_BACKUP_BUCKET: S3 bucket for Vault backups
# - KUBERNETES_HOST: Kubernetes API server (optional, for K8s auth)
#
# Usage: ./init-vault.sh [options]
# Options:
#   --help                  Show this help message
#   --skip-init             Skip Vault initialization step
#   --skip-unseal           Skip Vault unsealing step
#   --auto-unseal           Use AWS KMS for auto-unsealing
#   --init-only             Only initialize and unseal, skip configuration
#   --debug                 Enable debug output
#
# Example: ./init-vault.sh --auto-unseal
#
# Copyright (c) 2023 AI Talent Marketplace

# ============================================================================
# Global Variables
# ============================================================================

# Script metadata
readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Log settings
readonly LOG_DIR="${SCRIPT_DIR}/../logs"
readonly LOG_FILE="${LOG_DIR}/vault-init-$(date +%Y%m%d-%H%M%S).log"
readonly DEFAULT_LOG_LEVEL="INFO"
LOG_LEVEL="${DEFAULT_LOG_LEVEL}"

# Vault settings
VAULT_ADDR="${VAULT_ADDR:-https://vault.service.consul:8200}"
VAULT_FORMAT="json"
VAULT_SKIP_VERIFY="${VAULT_SKIP_VERIFY:-false}"
VAULT_CONFIG_DIR="${SCRIPT_DIR}/../config/vault"

# AWS settings
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-ai-talent-marketplace-vault-backup}"
KMS_KEY_ID="${KMS_KEY_ID:-}"

# Vault initialization parameters
VAULT_KEY_SHARES=5
VAULT_KEY_THRESHOLD=3
UNSEAL_KEYS_FILE="/tmp/vault-unseal-keys-$(date +%s).json"
ROOT_TOKEN_FILE="/tmp/vault-root-token-$(date +%s).txt"

# Kubernetes settings
KUBERNETES_HOST="${KUBERNETES_HOST:-}"
KUBERNETES_NAMESPACE="${KUBERNETES_NAMESPACE:-ai-talent-marketplace}"

# Script flags (can be overridden by command-line options)
SKIP_INIT=false
SKIP_UNSEAL=false
AUTO_UNSEAL=false
INIT_ONLY=false
DEBUG=false

# ============================================================================
# Script Configuration and Error Handling
# ============================================================================

# Exit on error, undefined variables, and prevent errors in pipes from being masked
set -euo pipefail

# Clean up on exit
trap cleanup EXIT INT TERM

# Execute commands in debug mode if DEBUG is true
[[ "$DEBUG" == "true" ]] && set -x

# ============================================================================
# Utility Functions
# ============================================================================

# Display usage information
usage() {
    grep '^#' "$0" | grep -v "!/bin/bash" | sed 's/^# \?//g'
    exit 0
}

# Log message to stdout and log file
# Arguments:
#   $1: Log level (DEBUG, INFO, WARN, ERROR)
#   $2: Log message
log() {
    local level="${1}"
    local message="${2}"
    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Only log if the level is at or above LOG_LEVEL
    case "${LOG_LEVEL}" in
        "DEBUG")
            ;;
        "INFO")
            [[ "${level}" == "DEBUG" ]] && return 0
            ;;
        "WARN")
            [[ "${level}" == "DEBUG" || "${level}" == "INFO" ]] && return 0
            ;;
        "ERROR")
            [[ "${level}" != "ERROR" ]] && return 0
            ;;
    esac

    # Create log directory if it doesn't exist
    mkdir -p "${LOG_DIR}"
    
    # Format the log message
    local log_entry="[${timestamp}] [${level}] ${message}"
    
    # Print to stdout with optional color
    case "${level}" in
        "DEBUG")
            echo -e "\e[34m${log_entry}\e[0m" ;;  # Blue
        "INFO")
            echo -e "\e[32m${log_entry}\e[0m" ;;  # Green
        "WARN")
            echo -e "\e[33m${log_entry}\e[0m" ;;  # Yellow
        "ERROR")
            echo -e "\e[31m${log_entry}\e[0m" ;;  # Red
        *)
            echo "${log_entry}" ;;
    esac
    
    # Append to log file
    echo "${log_entry}" >> "${LOG_FILE}"
}

# Check if a command is available
# Arguments:
#   $1: Command to check
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                usage
                ;;
            --skip-init)
                SKIP_INIT=true
                shift
                ;;
            --skip-unseal)
                SKIP_UNSEAL=true
                shift
                ;;
            --auto-unseal)
                AUTO_UNSEAL=true
                shift
                ;;
            --init-only)
                INIT_ONLY=true
                shift
                ;;
            --debug)
                DEBUG=true
                LOG_LEVEL="DEBUG"
                set -x
                shift
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Securely remove a file
secure_delete() {
    local file="$1"
    
    if [[ -f "$file" ]]; then
        if command_exists shred; then
            shred -u "$file"
        else
            rm -f "$file"
        fi
    fi
}

# ============================================================================
# Core Functions
# ============================================================================

# Check if all prerequisites are met
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check required commands
    local cmds=("vault" "jq" "aws")
    if [[ -n "${KUBERNETES_HOST}" ]]; then
        cmds+=("kubectl")
    fi
    
    for cmd in "${cmds[@]}"; do
        if ! command_exists "$cmd"; then
            log "ERROR" "Required command not found: $cmd"
            log "ERROR" "Please install all required tools before running this script."
            return 1
        fi
    done
    
    # Check for minimum versions
    local vault_version
    vault_version=$(vault version | head -n1 | cut -d ' ' -f2 | sed 's/v//')
    if [[ $(echo "$vault_version" | cut -d. -f1) -lt 1 || 
          ($(echo "$vault_version" | cut -d. -f1) -eq 1 && 
           $(echo "$vault_version" | cut -d. -f2) -lt 13) ]]; then
        log "ERROR" "Vault version must be at least 1.13.x (found: $vault_version)"
        return 1
    fi
    
    # Check environment variables
    if [[ -z "${VAULT_ADDR}" ]]; then
        log "ERROR" "VAULT_ADDR environment variable is not set"
        return 1
    fi
    
    if [[ -z "${AWS_REGION}" ]]; then
        log "ERROR" "AWS_REGION environment variable is not set"
        return 1
    fi
    
    if [[ -z "${S3_BACKUP_BUCKET}" ]]; then
        log "ERROR" "S3_BACKUP_BUCKET environment variable is not set"
        return 1
    fi
    
    # Check AWS connectivity
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log "ERROR" "AWS CLI not configured properly. Please run 'aws configure'"
        return 1
    fi
    
    # Check S3 bucket existence or create it
    if ! aws s3api head-bucket --bucket "${S3_BACKUP_BUCKET}" 2>/dev/null; then
        log "WARN" "S3 bucket ${S3_BACKUP_BUCKET} does not exist. Creating it..."
        if ! aws s3api create-bucket \
            --bucket "${S3_BACKUP_BUCKET}" \
            --region "${AWS_REGION}" \
            --create-bucket-configuration LocationConstraint="${AWS_REGION}"; then
            log "ERROR" "Failed to create S3 bucket ${S3_BACKUP_BUCKET}"
            return 1
        fi
        
        # Enable versioning on the bucket
        aws s3api put-bucket-versioning \
            --bucket "${S3_BACKUP_BUCKET}" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption on the bucket
        aws s3api put-bucket-encryption \
            --bucket "${S3_BACKUP_BUCKET}" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        log "INFO" "Created S3 bucket ${S3_BACKUP_BUCKET} with versioning and encryption"
    fi
    
    # Check Kubernetes connectivity if needed
    if [[ -n "${KUBERNETES_HOST}" ]] && ! kubectl get nodes >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to Kubernetes API server"
        return 1
    fi
    
    # Check Vault connectivity
    if ! vault status -format=json >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to Vault server at ${VAULT_ADDR}"
        log "ERROR" "Make sure Vault server is running and VAULT_ADDR is correct"
        return 1
    fi
    
    log "INFO" "All prerequisites met"
    return 0
}

# Initialize Vault if not already initialized
initialize_vault() {
    log "INFO" "Checking Vault initialization status..."
    
    local vault_status
    vault_status=$(vault status -format=json 2>/dev/null) || true
    
    # Check if Vault is already initialized
    if [[ -n "$vault_status" ]] && echo "$vault_status" | jq -e '.initialized' >/dev/null; then
        if [[ $(echo "$vault_status" | jq -r '.initialized') == "true" ]]; then
            log "INFO" "Vault is already initialized"
            return 0
        fi
    fi
    
    log "INFO" "Initializing Vault with ${VAULT_KEY_SHARES} key shares and ${VAULT_KEY_THRESHOLD} key threshold..."
    
    # Initialize Vault
    local init_output
    init_output=$(vault operator init \
                 -key-shares="${VAULT_KEY_SHARES}" \
                 -key-threshold="${VAULT_KEY_THRESHOLD}" \
                 -format=json)
    
    if [[ -z "$init_output" ]]; then
        log "ERROR" "Vault initialization failed"
        return 1
    fi
    
    # Save the unseal keys and root token
    echo "$init_output" > "${UNSEAL_KEYS_FILE}"
    echo "$init_output" | jq -r '.root_token' > "${ROOT_TOKEN_FILE}"
    
    # Set environment variable for subsequent calls
    export VAULT_TOKEN=$(cat "${ROOT_TOKEN_FILE}")
    
    # Backup the initialization data to S3
    log "INFO" "Creating encrypted backup of initialization data to S3..."
    
    # Create a timestamp for the backup
    local timestamp
    timestamp=$(date +"%Y%m%d-%H%M%S")
    
    # Encrypt backup with AWS KMS if KMS_KEY_ID is provided
    if [[ -n "${KMS_KEY_ID}" ]]; then
        # Encrypt and upload the unseal keys
        aws kms encrypt \
            --key-id "${KMS_KEY_ID}" \
            --plaintext fileb://"${UNSEAL_KEYS_FILE}" \
            --output text \
            --query CiphertextBlob \
            | aws s3 cp - "s3://${S3_BACKUP_BUCKET}/vault-init/unseal-keys-${timestamp}.json.encrypted"
        
        # Encrypt and upload the root token
        aws kms encrypt \
            --key-id "${KMS_KEY_ID}" \
            --plaintext fileb://"${ROOT_TOKEN_FILE}" \
            --output text \
            --query CiphertextBlob \
            | aws s3 cp - "s3://${S3_BACKUP_BUCKET}/vault-init/root-token-${timestamp}.txt.encrypted"
    else
        # Upload without KMS encryption (still encrypted by S3 SSE)
        aws s3 cp "${UNSEAL_KEYS_FILE}" "s3://${S3_BACKUP_BUCKET}/vault-init/unseal-keys-${timestamp}.json"
        aws s3 cp "${ROOT_TOKEN_FILE}" "s3://${S3_BACKUP_BUCKET}/vault-init/root-token-${timestamp}.txt"
    fi
    
    log "SUCCESS" "Vault initialized successfully"
    log "INFO" "Unseal keys and root token backed up to S3 bucket: ${S3_BACKUP_BUCKET}"
    log "WARN" "Please securely store the unseal keys and root token for production usage"
    
    return 0
}

# Unseal Vault using the unseal keys
unseal_vault() {
    log "INFO" "Checking Vault seal status..."
    
    local vault_status
    vault_status=$(vault status -format=json 2>/dev/null) || true
    
    # Check if Vault is already unsealed
    if [[ -n "$vault_status" ]] && echo "$vault_status" | jq -e '.sealed' >/dev/null; then
        if [[ $(echo "$vault_status" | jq -r '.sealed') == "false" ]]; then
            log "INFO" "Vault is already unsealed"
            return 0
        fi
    fi
    
    log "INFO" "Vault is sealed, proceeding with unseal operation..."
    
    # Check if auto-unseal is enabled
    if [[ "$AUTO_UNSEAL" == "true" ]]; then
        log "INFO" "Auto-unseal is enabled. Verifying auto-unseal configuration..."
        
        # For auto-unseal, we need to make sure Vault is configured with auto-unseal
        # This should be done in Vault's configuration, not through this script
        # We just verify that auto-unseal is working
        
        # Wait for auto-unseal to complete (if it's configured)
        for i in {1..30}; do
            vault_status=$(vault status -format=json 2>/dev/null) || true
            
            if [[ -n "$vault_status" ]] && echo "$vault_status" | jq -e '.sealed' >/dev/null; then
                if [[ $(echo "$vault_status" | jq -r '.sealed') == "false" ]]; then
                    log "INFO" "Vault was automatically unsealed"
                    return 0
                fi
            fi
            
            log "INFO" "Waiting for auto-unseal to complete... ($i/30)"
            sleep 10
        done
        
        log "ERROR" "Auto-unseal did not complete within the timeout period"
        log "ERROR" "Please verify your auto-unseal configuration"
        return 1
    else
        # Manual unseal process using keys
        if [[ ! -f "${UNSEAL_KEYS_FILE}" ]]; then
            log "ERROR" "Unseal keys file not found: ${UNSEAL_KEYS_FILE}"
            log "ERROR" "Please provide the unseal keys file or use auto-unseal"
            return 1
        fi
        
        log "INFO" "Unsealing Vault using keys from ${UNSEAL_KEYS_FILE}..."
        
        # Extract unseal keys from the file
        local unseal_keys
        unseal_keys=$(jq -r '.unseal_keys_b64[]' "${UNSEAL_KEYS_FILE}")
        
        # Use the threshold number of keys to unseal
        local count=0
        for key in ${unseal_keys}; do
            if [[ $count -lt "${VAULT_KEY_THRESHOLD}" ]]; then
                log "DEBUG" "Applying unseal key $((count+1))/${VAULT_KEY_THRESHOLD}..."
                vault operator unseal "$key" >/dev/null
                count=$((count+1))
            else
                break
            fi
        done
        
        # Verify Vault is unsealed
        vault_status=$(vault status -format=json)
        if [[ $(echo "$vault_status" | jq -r '.sealed') == "false" ]]; then
            log "SUCCESS" "Vault unsealed successfully"
            return 0
        else
            log "ERROR" "Failed to unseal Vault"
            return 1
        fi
    fi
}

# Configure authentication methods
configure_auth_methods() {
    log "INFO" "Configuring authentication methods..."
    
    # Enable token auth method (this is enabled by default)
    log "INFO" "Configuring token auth method..."
    
    # Update token auth method configuration
    vault auth tune -default-lease-ttl=1h -max-lease-ttl=24h token

    # Configure Kubernetes auth method if Kubernetes host is provided
    if [[ -n "${KUBERNETES_HOST}" ]]; then
        log "INFO" "Enabling Kubernetes auth method..."
        
        # Enable the Kubernetes auth method
        vault auth enable kubernetes || log "WARN" "Kubernetes auth method already enabled"
        
        # Get the Kubernetes CA certificate
        local k8s_ca_cert
        k8s_ca_cert=$(kubectl config view --raw --minify --flatten \
                      --output='jsonpath={.clusters[].cluster.certificate-authority-data}' | base64 --decode)
        
        # Get the JWT token for Vault to authenticate to Kubernetes
        local token_reviewer_jwt
        token_reviewer_jwt=$(kubectl create token vault-auth -n "${KUBERNETES_NAMESPACE}")
        
        # Configure the Kubernetes auth method
        vault write auth/kubernetes/config \
            kubernetes_host="${KUBERNETES_HOST}" \
            kubernetes_ca_cert="${k8s_ca_cert}" \
            token_reviewer_jwt="${token_reviewer_jwt}" \
            disable_local_ca_jwt="true"
        
        log "INFO" "Creating Kubernetes auth roles..."
        
        # Create roles for different services
        # User Service Role
        vault write auth/kubernetes/role/user-service \
            bound_service_account_names="user-service" \
            bound_service_account_namespaces="${KUBERNETES_NAMESPACE}" \
            policies="user-service" \
            ttl=1h
        
        # Payment Service Role
        vault write auth/kubernetes/role/payment-service \
            bound_service_account_names="payment-service" \
            bound_service_account_namespaces="${KUBERNETES_NAMESPACE}" \
            policies="payment-service" \
            ttl=1h
        
        # Job Service Role
        vault write auth/kubernetes/role/job-service \
            bound_service_account_names="job-service" \
            bound_service_account_namespaces="${KUBERNETES_NAMESPACE}" \
            policies="job-service" \
            ttl=1h
        
        # AI Service Role
        vault write auth/kubernetes/role/ai-service \
            bound_service_account_names="ai-service" \
            bound_service_account_namespaces="${KUBERNETES_NAMESPACE}" \
            policies="ai-service" \
            ttl=1h
        
        # Collaboration Service Role
        vault write auth/kubernetes/role/collaboration-service \
            bound_service_account_names="collaboration-service" \
            bound_service_account_namespaces="${KUBERNETES_NAMESPACE}" \
            policies="collaboration-service" \
            ttl=1h
            
        log "SUCCESS" "Kubernetes auth method configured"
    else
        log "WARN" "Skipping Kubernetes auth method configuration (KUBERNETES_HOST not provided)"
    fi
    
    # Enable AWS auth method
    log "INFO" "Enabling AWS auth method..."
    
    vault auth enable aws || log "WARN" "AWS auth method already enabled"
    
    # Configure AWS auth method
    vault write auth/aws/config/client \
        region="${AWS_REGION}"
    
    # Create AWS auth roles
    vault write auth/aws/role/ec2-backend-role \
        auth_type=iam \
        bound_iam_principal_arn="arn:aws:iam::*:role/ai-talent-marketplace-backend-*" \
        policies="backend-services" \
        token_ttl=1h \
        token_max_ttl=4h
    
    log "SUCCESS" "AWS auth method configured"
    
    # Enable OIDC auth method for human operators
    log "INFO" "Enabling OIDC auth method..."
    
    vault auth enable oidc || log "WARN" "OIDC auth method already enabled"
    
    # Configure OIDC auth with a placeholder config
    # In a real setup, you would replace these values with your actual OIDC provider details
    vault write auth/oidc/config \
        oidc_discovery_url="https://accounts.google.com" \
        oidc_client_id="REPLACE_WITH_REAL_CLIENT_ID" \
        oidc_client_secret="REPLACE_WITH_REAL_CLIENT_SECRET" \
        default_role="operator"
    
    # Create OIDC roles
    vault write auth/oidc/role/operator \
        bound_audiences="REPLACE_WITH_REAL_CLIENT_ID" \
        allowed_redirect_uris="${VAULT_ADDR}/ui/vault/auth/oidc/oidc/callback" \
        allowed_redirect_uris="http://localhost:8250/oidc/callback" \
        user_claim="email" \
        bound_claims="hd=example.com" \
        groups_claim="groups" \
        policies="operator-policy" \
        ttl=12h
    
    vault write auth/oidc/role/admin \
        bound_audiences="REPLACE_WITH_REAL_CLIENT_ID" \
        allowed_redirect_uris="${VAULT_ADDR}/ui/vault/auth/oidc/oidc/callback" \
        allowed_redirect_uris="http://localhost:8250/oidc/callback" \
        user_claim="email" \
        bound_claims="hd=example.com" \
        groups_claim="groups" \
        bound_claims_type="glob" \
        bound_claims="group=*admin*" \
        policies="admin-policy" \
        ttl=1h
    
    log "SUCCESS" "OIDC auth method configured with placeholder values"
    log "WARN" "Please update OIDC configuration with your actual OIDC provider details"
    
    return 0
}

# Configure access policies
configure_policies() {
    log "INFO" "Configuring access policies..."
    
    # Create directory structure if it doesn't exist
    mkdir -p "${VAULT_CONFIG_DIR}/policies"
    
    # User Service Policy
    cat > "${VAULT_CONFIG_DIR}/policies/user-service.hcl" << 'EOF'
# User Service Policy
path "secret/data/user-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "database/creds/user-service" {
  capabilities = ["read"]
}

path "transit/encrypt/user-data" {
  capabilities = ["update"]
}

path "transit/decrypt/user-data" {
  capabilities = ["update"]
}
EOF

    # Payment Service Policy
    cat > "${VAULT_CONFIG_DIR}/policies/payment-service.hcl" << 'EOF'
# Payment Service Policy
path "secret/data/payment-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "database/creds/payment-service" {
  capabilities = ["read"]
}

path "transit/encrypt/payment-data" {
  capabilities = ["update"]
}

path "transit/decrypt/payment-data" {
  capabilities = ["update"]
}

path "transit/hmac/payment-verification" {
  capabilities = ["update"]
}
EOF

    # Job Service Policy
    cat > "${VAULT_CONFIG_DIR}/policies/job-service.hcl" << 'EOF'
# Job Service Policy
path "secret/data/job-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "database/creds/job-service" {
  capabilities = ["read"]
}

path "transit/encrypt/job-data" {
  capabilities = ["update"]
}

path "transit/decrypt/job-data" {
  capabilities = ["update"]
}
EOF

    # AI Service Policy
    cat > "${VAULT_CONFIG_DIR}/policies/ai-service.hcl" << 'EOF'
# AI Service Policy
path "secret/data/ai-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "database/creds/ai-service" {
  capabilities = ["read"]
}

path "transit/encrypt/ai-data" {
  capabilities = ["update"]
}

path "transit/decrypt/ai-data" {
  capabilities = ["update"]
}
EOF

    # Collaboration Service Policy
    cat > "${VAULT_CONFIG_DIR}/policies/collaboration-service.hcl" << 'EOF'
# Collaboration Service Policy
path "secret/data/collaboration-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "database/creds/collaboration-service" {
  capabilities = ["read"]
}

path "transit/encrypt/collaboration-data" {
  capabilities = ["update"]
}

path "transit/decrypt/collaboration-data" {
  capabilities = ["update"]
}
EOF

    # Admin Policy
    cat > "${VAULT_CONFIG_DIR}/policies/admin-policy.hcl" << 'EOF'
# Admin Policy
path "*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
EOF

    # Operator Policy
    cat > "${VAULT_CONFIG_DIR}/policies/operator-policy.hcl" << 'EOF'
# Operator Policy
path "secret/data/*" {
  capabilities = ["read", "list"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "sys/mounts" {
  capabilities = ["read"]
}

path "sys/health" {
  capabilities = ["read", "sudo"]
}

path "sys/policies/acl" {
  capabilities = ["read", "list"]
}

path "sys/capabilities-self" {
  capabilities = ["update"]
}
EOF

    # Read-only Policy
    cat > "${VAULT_CONFIG_DIR}/policies/read-only.hcl" << 'EOF'
# Read-only Policy
path "secret/data/*" {
  capabilities = ["read", "list"]
}

path "sys/health" {
  capabilities = ["read"]
}

path "sys/mounts" {
  capabilities = ["read"]
}
EOF

    # Backend Services Policy
    cat > "${VAULT_CONFIG_DIR}/policies/backend-services.hcl" << 'EOF'
# Backend Services Policy
path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "database/creds/*" {
  capabilities = ["read"]
}

path "transit/encrypt/*" {
  capabilities = ["update"]
}

path "transit/decrypt/*" {
  capabilities = ["update"]
}
EOF

    # Write each policy to Vault
    log "INFO" "Writing policies to Vault..."
    
    local policies=("user-service" "payment-service" "job-service" "ai-service" "collaboration-service" "admin-policy" "operator-policy" "read-only" "backend-services")
    
    for policy in "${policies[@]}"; do
        vault policy write "${policy}" "${VAULT_CONFIG_DIR}/policies/${policy}.hcl"
        log "DEBUG" "Created policy: ${policy}"
    done
    
    log "SUCCESS" "Vault policies configured"
    return 0
}

# Enable and configure secrets engines
enable_secrets_engines() {
    log "INFO" "Configuring secrets engines..."
    
    # Enable KV v2 secrets engine
    log "INFO" "Enabling KV v2 secrets engine..."
    vault secrets enable -version=2 -path=secret kv || log "WARN" "KV secrets engine already enabled"
    
    # Configure KV secrets engine
    vault write secret/config max_versions=10
    
    # Enable database secrets engine
    log "INFO" "Enabling database secrets engine..."
    vault secrets enable -path=database database || log "WARN" "Database secrets engine already enabled"
    
    # Configure PostgreSQL connection
    # Note: In a real setup, replace placeholder values with actual database connection details
    vault write database/config/postgresql \
        plugin_name=postgresql-database-plugin \
        allowed_roles="*" \
        connection_url="postgresql://{{username}}:{{password}}@postgres:5432/ai_talent_marketplace?sslmode=disable" \
        username="vault_admin" \
        password="REPLACE_WITH_SECURE_PASSWORD" \
        password_policy="policy_name"
    
    # Create database roles for services
    local services=("user-service" "payment-service" "job-service" "ai-service" "collaboration-service")
    
    for service in "${services[@]}"; do
        vault write database/roles/${service} \
            db_name=postgresql \
            creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                                GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
                                GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
            default_ttl="1h" \
            max_ttl="24h"
        
        log "DEBUG" "Created database role: ${service}"
    done
    
    # Enable transit secrets engine
    log "INFO" "Enabling transit secrets engine..."
    vault secrets enable transit || log "WARN" "Transit secrets engine already enabled"
    
    # Create encryption keys for different data types
    local data_types=("user-data" "payment-data" "job-data" "ai-data" "collaboration-data" "payment-verification")
    
    for data_type in "${data_types[@]}"; do
        vault write -f transit/keys/${data_type} \
            type="aes256-gcm96" \
            exportable=false
        
        log "DEBUG" "Created encryption key: ${data_type}"
    done
    
    # Enable AWS secrets engine
    log "INFO" "Enabling AWS secrets engine..."
    vault secrets enable -path=aws aws || log "WARN" "AWS secrets engine already enabled"
    
    # Configure AWS secrets engine
    vault write aws/config/root \
        region="${AWS_REGION}" \
        access_key="REPLACE_WITH_AWS_ACCESS_KEY" \
        secret_key="REPLACE_WITH_AWS_SECRET_KEY"
    
    # Create AWS roles
    vault write aws/roles/s3-access \
        credential_type=iam_user \
        policy_document='{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        "arn:aws:s3:::ai-talent-marketplace-*/*",
                        "arn:aws:s3:::ai-talent-marketplace-*"
                    ]
                }
            ]
        }'
    
    # Enable PKI secrets engine
    log "INFO" "Enabling PKI secrets engine..."
    vault secrets enable -path=pki pki || log "WARN" "PKI secrets engine already enabled"
    
    # Configure PKI secrets engine with a placeholder configuration
    # In a real setup, you would need to adjust these settings
    vault write pki/config/urls \
        issuing_certificates="${VAULT_ADDR}/v1/pki/ca" \
        crl_distribution_points="${VAULT_ADDR}/v1/pki/crl"
    
    # Generate root CA
    vault write -format=json pki/root/generate/internal \
        common_name="AI Talent Marketplace CA" \
        ttl=87600h | jq -r '.data.certificate' > "${VAULT_CONFIG_DIR}/ca.pem"
    
    # Create a role for issuing certificates
    vault write pki/roles/ai-talent-marketplace \
        allowed_domains="ai-talent-marketplace.com,service.ai-talent-marketplace.com,internal.ai-talent-marketplace.com" \
        allow_subdomains=true \
        max_ttl=72h
    
    log "SUCCESS" "Secrets engines configured"
    return 0
}

# Store initial secrets for the platform
store_initial_secrets() {
    log "INFO" "Storing initial secrets..."
    
    # Create shared secret mount points
    vault kv put secret/shared/environment \
        env="development" \
        region="${AWS_REGION}" \
        deploy_date="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    
    # Store database credentials
    vault kv put secret/shared/database \
        postgres_host="postgres.ai-talent-marketplace.svc.cluster.local" \
        postgres_port="5432" \
        postgres_db="ai_talent_marketplace" \
        postgres_user="app_user" \
        postgres_password="REPLACE_WITH_SECURE_PASSWORD" \
        mongodb_uri="mongodb://mongodb.ai-talent-marketplace.svc.cluster.local:27017/ai_talent_marketplace" \
        redis_host="redis.ai-talent-marketplace.svc.cluster.local" \
        redis_port="6379" \
        redis_password="REPLACE_WITH_SECURE_PASSWORD" \
        elasticsearch_host="elasticsearch.ai-talent-marketplace.svc.cluster.local" \
        elasticsearch_port="9200"
    
    # Store API keys for third-party services
    vault kv put secret/shared/third-party \
        stripe_api_key="REPLACE_WITH_STRIPE_API_KEY" \
        stripe_webhook_secret="REPLACE_WITH_STRIPE_WEBHOOK_SECRET" \
        auth0_domain="ai-talent-marketplace.auth0.com" \
        auth0_client_id="REPLACE_WITH_AUTH0_CLIENT_ID" \
        auth0_client_secret="REPLACE_WITH_AUTH0_CLIENT_SECRET" \
        openai_api_key="REPLACE_WITH_OPENAI_API_KEY" \
        github_api_token="REPLACE_WITH_GITHUB_API_TOKEN" \
        smtp_host="email-smtp.us-east-1.amazonaws.com" \
        smtp_port="587" \
        smtp_username="REPLACE_WITH_SMTP_USERNAME" \
        smtp_password="REPLACE_WITH_SMTP_PASSWORD" \
        smtp_sender="noreply@ai-talent-marketplace.com"
    
    # Store JWT signing keys
    vault kv put secret/shared/jwt \
        signing_key="REPLACE_WITH_JWT_SIGNING_KEY" \
        public_key="REPLACE_WITH_JWT_PUBLIC_KEY" \
        algorithm="RS256" \
        expires_in="1h" \
        refresh_expires_in="7d"
    
    # Store service-specific secrets
    
    # User Service
    vault kv put secret/user-service/config \
        service_port="3000" \
        log_level="info" \
        auth_keys="REPLACE_WITH_USER_SERVICE_AUTH_KEYS" \
        password_reset_expiry="1h"
    
    # Payment Service
    vault kv put secret/payment-service/config \
        service_port="3001" \
        log_level="info" \
        transaction_log_retention="90d" \
        default_currency="USD"
    
    # Job Service
    vault kv put secret/job-service/config \
        service_port="3002" \
        log_level="info" \
        job_post_expiry="30d" \
        matching_algorithm_version="1.2.0"
    
    # AI Service
    vault kv put secret/ai-service/config \
        service_port="3003" \
        log_level="info" \
        model_default="gpt-4" \
        embedding_model="text-embedding-ada-002" \
        max_tokens="8192" \
        cache_ttl="24h"
    
    # Collaboration Service
    vault kv put secret/collaboration-service/config \
        service_port="3004" \
        log_level="info" \
        websocket_path="/ws" \
        file_upload_limit="25MB" \
        chat_history_limit="1000"
    
    log "SUCCESS" "Initial secrets stored"
    log "WARN" "Remember to replace placeholder values with actual secrets in production"
    
    return 0
}

# Enable audit logging
enable_audit_logging() {
    log "INFO" "Enabling audit logging..."
    
    # Create the audit log directory
    mkdir -p /var/log/vault
    
    # Enable file audit device
    vault audit enable file file_path=/var/log/vault/audit.log || log "WARN" "File audit device already enabled"
    
    # Enable syslog audit device if not already enabled
    vault audit enable syslog tag="vault" facility="AUTH" || log "WARN" "Syslog audit device already enabled"
    
    log "SUCCESS" "Audit logging enabled"
    return 0
}

# Configure Vault UI
setup_vault_ui() {
    log "INFO" "Configuring Vault UI..."
    
    # UI is enabled in Vault server configuration file, not through API
    # We can configure some UI-related settings
    
    # Set up CORS for the UI
    vault write sys/config/cors \
        allowed_origins="${VAULT_ADDR}" \
        allowed_headers="X-Requested-With,Content-Type,Authorization,X-Vault-Token,X-Vault-Namespace"
    
    log "SUCCESS" "Vault UI configured"
    return 0
}

# Configure Vault telemetry
configure_vault_telemetry() {
    log "INFO" "Configuring telemetry..."
    
    # Telemetry is primarily configured in Vault's server configuration file
    # This would typically involve setting up Prometheus metrics, StatsD, etc.
    
    # For this script, we just validate that telemetry is working
    
    log "INFO" "Telemetry configuration must be done in Vault server config file"
    log "INFO" "Please ensure metrics are properly configured in your Vault server"
    
    return 0
}

# Perform a health check of the Vault installation
perform_vault_health_check() {
    log "INFO" "Performing Vault health check..."
    
    # Check Vault status
    local status
    status=$(vault status -format=json)
    
    # Parse status information
    local initialized sealed standby
    initialized=$(echo "$status" | jq -r '.initialized')
    sealed=$(echo "$status" | jq -r '.sealed')
    standby=$(echo "$status" | jq -r '.standby')
    
    # Display results
    log "INFO" "Vault status: initialized=${initialized}, sealed=${sealed}, standby=${standby}"
    
    # Check auth methods
    log "INFO" "Checking enabled auth methods..."
    vault auth list -format=json | jq -r 'keys[]'
    
    # Check secrets engines
    log "INFO" "Checking enabled secrets engines..."
    vault secrets list -format=json | jq -r 'keys[]'
    
    # Check audit devices
    log "INFO" "Checking enabled audit devices..."
    vault audit list -format=json | jq -r 'keys[]'
    
    # Check overall health
    if [[ "$initialized" == "true" && "$sealed" == "false" ]]; then
        log "SUCCESS" "Vault is healthy and operational"
        return 0
    else
        log "ERROR" "Vault health check failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up..."
    
    # Securely delete temporary files
    secure_delete "${UNSEAL_KEYS_FILE}"
    secure_delete "${ROOT_TOKEN_FILE}"
    
    # Unset sensitive environment variables
    if [[ "${DEBUG}" != "true" ]]; then
        unset VAULT_TOKEN
    fi
    
    log "INFO" "Cleanup completed"
}

# Main function
main() {
    # Parse command line arguments
    parse_args "$@"
    
    # Display script header
    log "INFO" "==================================================="
    log "INFO" "Starting Vault initialization and configuration script"
    log "INFO" "Version: ${SCRIPT_VERSION}"
    log "INFO" "Date: $(date)"
    log "INFO" "==================================================="
    
    # Check prerequisites
    log "INFO" "Checking prerequisites..."
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed. Exiting."
        return 1
    fi
    
    # Initialize Vault if not skipped
    if [[ "${SKIP_INIT}" != "true" ]]; then
        log "INFO" "Initializing Vault..."
        if ! initialize_vault; then
            log "ERROR" "Vault initialization failed. Exiting."
            return 1
        fi
    else
        log "INFO" "Skipping Vault initialization as requested"
    fi
    
    # Unseal Vault if not skipped
    if [[ "${SKIP_UNSEAL}" != "true" ]]; then
        log "INFO" "Unsealing Vault..."
        if ! unseal_vault; then
            log "ERROR" "Vault unsealing failed. Exiting."
            return 1
        fi
    else
        log "INFO" "Skipping Vault unsealing as requested"
    fi
    
    # Stop here if init-only mode is enabled
    if [[ "${INIT_ONLY}" == "true" ]]; then
        log "INFO" "Running in init-only mode, skipping configuration steps"
        log "SUCCESS" "Vault initialization and unsealing completed successfully"
        return 0
    fi
    
    # Configure auth methods
    log "INFO" "Configuring authentication methods..."
    if ! configure_auth_methods; then
        log "ERROR" "Authentication methods configuration failed. Exiting."
        return 1
    fi
    
    # Configure policies
    log "INFO" "Configuring policies..."
    if ! configure_policies; then
        log "ERROR" "Policy configuration failed. Exiting."
        return 1
    fi
    
    # Enable secrets engines
    log "INFO" "Enabling secrets engines..."
    if ! enable_secrets_engines; then
        log "ERROR" "Secrets engines configuration failed. Exiting."
        return 1
    fi
    
    # Store initial secrets
    log "INFO" "Storing initial secrets..."
    if ! store_initial_secrets; then
        log "ERROR" "Initial secrets storage failed. Exiting."
        return 1
    fi
    
    # Enable audit logging
    log "INFO" "Enabling audit logging..."
    if ! enable_audit_logging; then
        log "ERROR" "Audit logging configuration failed. Exiting."
        return 1
    fi
    
    # Configure Vault UI
    log "INFO" "Setting up Vault UI..."
    if ! setup_vault_ui; then
        log "ERROR" "Vault UI configuration failed. Exiting."
        return 1
    fi
    
    # Configure telemetry
    log "INFO" "Configuring telemetry..."
    if ! configure_vault_telemetry; then
        log "ERROR" "Telemetry configuration failed. Exiting."
        return 1
    fi
    
    # Perform health check
    log "INFO" "Performing health check..."
    if ! perform_vault_health_check; then
        log "ERROR" "Health check failed. Exiting."
        return 1
    fi
    
    # Display completion message
    log "SUCCESS" "==================================================="
    log "SUCCESS" "Vault initialization and configuration completed successfully!"
    log "SUCCESS" "==================================================="
    log "INFO" "Next steps:"
    log "INFO" "1. Replace placeholder secrets with actual values for production"
    log "INFO" "2. Securely distribute unseal keys to trusted team members"
    log "INFO" "3. Set up monitoring and alerting for the Vault cluster"
    log "INFO" "4. Configure service accounts for Kubernetes integration"
    log "INFO" "5. Test authentication and authorization for all services"
    log "INFO" "==================================================="
    
    return 0
}

# Execute main function with all arguments
main "$@"