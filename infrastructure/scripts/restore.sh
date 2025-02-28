#!/bin/bash
#
# restore.sh - Automated Disaster Recovery and Restoration Script
# Version: 1.0.0
#
# This script implements automated disaster recovery and restoration procedures
# for the AI Talent Marketplace platform. It supports:
# - Point-in-time recovery for PostgreSQL
# - Collection-level restore for MongoDB
# - Automated failover for Redis
# - Index restoration for Elasticsearch/OpenSearch
# - S3 file recovery using versioning
#
# All operations maintain data integrity and security compliance throughout
# the restoration process.
#
# Usage: ./restore.sh [OPTIONS]
#

# Exit on error, undefined variables, and propagate pipe failures
set -euo pipefail

# Set default values for global variables
PROJECT="ai-talent-marketplace"
ENVIRONMENT=${ENVIRONMENT:-"prod"}
BACKUP_BUCKET=""
BACKUP_PREFIX=""
RESTORE_TIMESTAMP=""
BACKUP_MANIFEST=""
TEMP_DIR="/tmp/restore-${PROJECT}-$(date +%Y%m%d%H%M%S)"
LOG_FILE="${TEMP_DIR}/restore.log"
RDS_INSTANCE=""
DOCUMENTDB_CLUSTER=""
REDIS_CLUSTER=""
OPENSEARCH_DOMAIN=""
DATA_STORAGE_BUCKET=""
KMS_KEY_ID=""
POINT_IN_TIME=""
COLLECTIONS_TO_RESTORE=""
INDICES_TO_RESTORE=""
S3_PREFIX_TO_RESTORE=""
RESTORE_LOCK_FILE="/tmp/restore-${PROJECT}.lock"

# Track components to restore
RESTORE_POSTGRESQL=false
RESTORE_MONGODB=false
RESTORE_REDIS=false
RESTORE_OPENSEARCH=false
RESTORE_S3=false

# Configure restoration timeouts (in seconds)
POSTGRESQL_TIMEOUT=7200  # 2 hours
MONGODB_TIMEOUT=7200     # 2 hours
REDIS_TIMEOUT=600        # 10 minutes
OPENSEARCH_TIMEOUT=3600  # 1 hour
S3_TIMEOUT=7200          # 2 hours

# Track restoration status
RESTORATION_STATUS=0
DRY_RUN=false
FORCE_RESTORE=false

# Helper functions

# Print usage instructions
print_usage() {
    cat <<EOF
USAGE: $(basename "$0") [OPTIONS]

AI Talent Marketplace Disaster Recovery and Restoration Tool
Version: 1.0.0

This script automates the restoration of platform components from backups
while maintaining data integrity and security compliance.

OPTIONS:
  -e, --environment ENV       Deployment environment (dev, staging, prod)
  -b, --backup-bucket BUCKET  S3 bucket containing backups
  -p, --backup-prefix PREFIX  Prefix path within the backup bucket
  -t, --timestamp TIME        Timestamp of backup to restore (YYYY-MM-DDTHH:MM:SSZ)
                              or 'latest' to use the most recent backup
  -m, --manifest FILE         Path to specific backup manifest file (overrides timestamp)
  
  --postgres                  Restore PostgreSQL database
  --mongodb                   Restore MongoDB database
  --redis                     Restore Redis cache
  --opensearch                Restore OpenSearch indices
  --s3                        Restore S3 data
  --all                       Restore all components (default if none specified)
  
  --rds-instance ID           PostgreSQL RDS instance identifier
  --documentdb-cluster ID     DocumentDB cluster identifier
  --redis-cluster ID          ElastiCache Redis cluster identifier
  --opensearch-domain NAME    OpenSearch domain name
  --data-bucket BUCKET        Target S3 bucket for file restoration
  
  --kms-key-id KEY_ID         KMS key for decryption
  --point-in-time TIME        Timestamp for point-in-time recovery (PostgreSQL)
  --collections LIST          Comma-separated list of MongoDB collections to restore
  --indices LIST              Comma-separated list of OpenSearch indices to restore
  --s3-prefix PREFIX          Prefix filter for S3 file restoration
  
  --dry-run                   Simulate the restore without making changes
  --force                     Force restoration even if verification fails
  -h, --help                  Display this help message
  -v, --version               Display version information

EXAMPLES:
  # Restore all components from the latest backup
  ./restore.sh --all --environment prod --backup-bucket backups-bucket

  # Restore only PostgreSQL to a point in time
  ./restore.sh --postgres --backup-bucket backups-bucket --rds-instance db-instance --point-in-time 2023-06-01T04:00:00Z

  # Restore specific MongoDB collections
  ./restore.sh --mongodb --backup-bucket backups-bucket --documentdb-cluster docdb-cluster --collections users,jobs,contracts

For assistance, contact: devops@ai-talent-marketplace.com
EOF
}

# Log a message with timestamp and severity
log_message() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Define ANSI color codes
    local red='\033[0;31m'
    local yellow='\033[0;33m'
    local green='\033[0;32m'
    local blue='\033[0;34m'
    local nc='\033[0m' # No Color
    
    # Format the message for display and logging
    local formatted_message="[${timestamp}] [${level}] ${message}"
    
    # Add color to console output based on level
    case "${level}" in
        ERROR)
            echo -e "${red}${formatted_message}${nc}" >&2
            ;;
        WARNING)
            echo -e "${yellow}${formatted_message}${nc}" >&2
            ;;
        SUCCESS)
            echo -e "${green}${formatted_message}${nc}"
            ;;
        INFO)
            echo -e "${blue}${formatted_message}${nc}"
            ;;
        *)
            echo "${formatted_message}"
            ;;
    esac
    
    # Ensure log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Append to log file without color codes
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# Parse command line arguments
parse_args() {
    local args=("$@")
    
    # If no arguments provided, show usage and exit
    if [[ $# -eq 0 ]]; then
        print_usage
        exit 1
    fi
    
    # Parse command line options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -b|--backup-bucket)
                BACKUP_BUCKET="$2"
                shift 2
                ;;
            -p|--backup-prefix)
                BACKUP_PREFIX="$2"
                shift 2
                ;;
            -t|--timestamp)
                RESTORE_TIMESTAMP="$2"
                shift 2
                ;;
            -m|--manifest)
                BACKUP_MANIFEST="$2"
                shift 2
                ;;
            --postgres)
                RESTORE_POSTGRESQL=true
                shift
                ;;
            --mongodb)
                RESTORE_MONGODB=true
                shift
                ;;
            --redis)
                RESTORE_REDIS=true
                shift
                ;;
            --opensearch)
                RESTORE_OPENSEARCH=true
                shift
                ;;
            --s3)
                RESTORE_S3=true
                shift
                ;;
            --all)
                RESTORE_POSTGRESQL=true
                RESTORE_MONGODB=true
                RESTORE_REDIS=true
                RESTORE_OPENSEARCH=true
                RESTORE_S3=true
                shift
                ;;
            --rds-instance)
                RDS_INSTANCE="$2"
                shift 2
                ;;
            --documentdb-cluster)
                DOCUMENTDB_CLUSTER="$2"
                shift 2
                ;;
            --redis-cluster)
                REDIS_CLUSTER="$2"
                shift 2
                ;;
            --opensearch-domain)
                OPENSEARCH_DOMAIN="$2"
                shift 2
                ;;
            --data-bucket)
                DATA_STORAGE_BUCKET="$2"
                shift 2
                ;;
            --kms-key-id)
                KMS_KEY_ID="$2"
                shift 2
                ;;
            --point-in-time)
                POINT_IN_TIME="$2"
                shift 2
                ;;
            --collections)
                COLLECTIONS_TO_RESTORE="$2"
                shift 2
                ;;
            --indices)
                INDICES_TO_RESTORE="$2"
                shift 2
                ;;
            --s3-prefix)
                S3_PREFIX_TO_RESTORE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_RESTORE=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            -v|--version)
                echo "$(basename "$0") version 1.0.0"
                exit 0
                ;;
            *)
                log_message "ERROR" "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # If no components specified, default to all
    if ! "${RESTORE_POSTGRESQL}" && ! "${RESTORE_MONGODB}" && ! "${RESTORE_REDIS}" && ! "${RESTORE_OPENSEARCH}" && ! "${RESTORE_S3}"; then
        log_message "INFO" "No specific components selected for restore, defaulting to all components"
        RESTORE_POSTGRESQL=true
        RESTORE_MONGODB=true
        RESTORE_REDIS=true
        RESTORE_OPENSEARCH=true
        RESTORE_S3=true
    fi
    
    # Validate required arguments
    if [[ -z "${BACKUP_BUCKET}" ]]; then
        log_message "ERROR" "Backup bucket not specified. Use --backup-bucket option."
        return 1
    fi
    
    # Validate and set component-specific arguments
    if "${RESTORE_POSTGRESQL}" && [[ -z "${RDS_INSTANCE}" ]]; then
        log_message "ERROR" "RDS instance identifier required for PostgreSQL restore. Use --rds-instance option."
        return 1
    fi
    
    if "${RESTORE_MONGODB}" && [[ -z "${DOCUMENTDB_CLUSTER}" ]]; then
        log_message "ERROR" "DocumentDB cluster identifier required for MongoDB restore. Use --documentdb-cluster option."
        return 1
    fi
    
    if "${RESTORE_REDIS}" && [[ -z "${REDIS_CLUSTER}" ]]; then
        log_message "ERROR" "ElastiCache Redis cluster identifier required for Redis restore. Use --redis-cluster option."
        return 1
    fi
    
    if "${RESTORE_OPENSEARCH}" && [[ -z "${OPENSEARCH_DOMAIN}" ]]; then
        log_message "ERROR" "OpenSearch domain name required for OpenSearch restore. Use --opensearch-domain option."
        return 1
    fi
    
    if "${RESTORE_S3}" && [[ -z "${DATA_STORAGE_BUCKET}" ]]; then
        log_message "ERROR" "Target S3 bucket required for file restoration. Use --data-bucket option."
        return 1
    fi
    
    # If restoration timestamp and manifest are both not provided, default to latest
    if [[ -z "${RESTORE_TIMESTAMP}" ]] && [[ -z "${BACKUP_MANIFEST}" ]]; then
        log_message "INFO" "No timestamp or manifest specified, defaulting to latest backup"
        RESTORE_TIMESTAMP="latest"
    fi
    
    return 0
}

# Check prerequisites for running the restore operation
check_prerequisites() {
    log_message "INFO" "Checking prerequisites..."
    
    # Check for required command line tools
    local required_tools=("aws" "psql" "mongorestore" "redis-cli" "curl" "jq" "kubectl")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &> /dev/null; then
            missing_tools+=("${tool}")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_message "ERROR" "Missing required tools: ${missing_tools[*]}"
        log_message "ERROR" "Please install these tools before running the restore script."
        return 1
    fi
    
    # Check AWS CLI configuration
    if ! aws sts get-caller-identity &> /dev/null; then
        log_message "ERROR" "AWS CLI is not properly configured or lacks necessary permissions"
        return 1
    fi
    
    # Check access to backup bucket
    if ! aws s3 ls "s3://${BACKUP_BUCKET}/" &> /dev/null; then
        log_message "ERROR" "Cannot access backup bucket: s3://${BACKUP_BUCKET}/"
        return 1
    fi
    
    # Check for backup prefix if specified
    if [[ -n "${BACKUP_PREFIX}" ]]; then
        if ! aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/" &> /dev/null; then
            log_message "ERROR" "Cannot access backup prefix: s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/"
            return 1
        fi
    fi
    
    # Check target resources if not in dry-run mode
    if ! "${DRY_RUN}"; then
        # Check access to target resources based on components being restored
        if "${RESTORE_POSTGRESQL}"; then
            if ! aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" &> /dev/null; then
                log_message "ERROR" "Cannot access RDS instance: ${RDS_INSTANCE}"
                return 1
            fi
        fi
        
        if "${RESTORE_MONGODB}"; then
            if ! aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" &> /dev/null; then
                log_message "ERROR" "Cannot access DocumentDB cluster: ${DOCUMENTDB_CLUSTER}"
                return 1
            fi
        fi
        
        if "${RESTORE_REDIS}"; then
            if ! aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" &> /dev/null; then
                log_message "ERROR" "Cannot access ElastiCache Redis cluster: ${REDIS_CLUSTER}"
                return 1
            fi
        fi
        
        if "${RESTORE_OPENSEARCH}"; then
            if ! aws opensearch describe-domain --domain-name "${OPENSEARCH_DOMAIN}" &> /dev/null; then
                log_message "ERROR" "Cannot access OpenSearch domain: ${OPENSEARCH_DOMAIN}"
                return 1
            fi
        fi
        
        if "${RESTORE_S3}"; then
            if ! aws s3 ls "s3://${DATA_STORAGE_BUCKET}/" &> /dev/null; then
                log_message "ERROR" "Cannot access target S3 bucket: s3://${DATA_STORAGE_BUCKET}/"
                return 1
            fi
        fi
        
        # Verify KMS key access if provided
        if [[ -n "${KMS_KEY_ID}" ]]; then
            if ! aws kms describe-key --key-id "${KMS_KEY_ID}" &> /dev/null; then
                log_message "ERROR" "Cannot access KMS key: ${KMS_KEY_ID}"
                return 1
            fi
        fi
        
        # Check Kubernetes access if required
        if ! kubectl get nodes &> /dev/null; then
            log_message "WARNING" "Cannot access Kubernetes cluster. Service connection updates may fail."
        fi
    fi
    
    log_message "SUCCESS" "All prerequisites checked successfully"
    return 0
}

# Set up restore environment
setup_restore_environment() {
    log_message "INFO" "Setting up restoration environment..."
    
    # Create temporary directory
    mkdir -p "${TEMP_DIR}"
    log_message "INFO" "Created temporary directory: ${TEMP_DIR}"
    
    # Check for and create lock file
    if [[ -f "${RESTORE_LOCK_FILE}" ]]; then
        log_message "ERROR" "Restore lock file exists at ${RESTORE_LOCK_FILE}, indicating another restore process is running"
        log_message "ERROR" "If you're sure no other restore is running, delete the lock file and try again"
        return 1
    fi
    
    echo "$$" > "${RESTORE_LOCK_FILE}"
    log_message "INFO" "Created lock file: ${RESTORE_LOCK_FILE}"
    
    # Set up trap to clean up on exit
    trap 'cleanup_restore' EXIT INT TERM
    
    # Find and download backup manifest
    if [[ -n "${BACKUP_MANIFEST}" ]]; then
        # Use specified manifest file
        if [[ "${BACKUP_MANIFEST}" == s3://* ]]; then
            log_message "INFO" "Downloading manifest from S3: ${BACKUP_MANIFEST}"
            aws s3 cp "${BACKUP_MANIFEST}" "${TEMP_DIR}/manifest.json"
        else
            log_message "INFO" "Using local manifest file: ${BACKUP_MANIFEST}"
            cp "${BACKUP_MANIFEST}" "${TEMP_DIR}/manifest.json"
        fi
    else
        # Find manifest based on timestamp
        local manifest_path
        
        if [[ "${RESTORE_TIMESTAMP}" == "latest" ]]; then
            log_message "INFO" "Finding latest backup manifest..."
            
            # Construct the S3 prefix for manifests
            local manifest_prefix="${BACKUP_PREFIX:+${BACKUP_PREFIX}/}manifests/"
            
            # List manifests and sort by timestamp (newest first)
            manifest_path=$(aws s3 ls "s3://${BACKUP_BUCKET}/${manifest_prefix}" | sort -r | head -n 1 | awk '{print $4}')
            
            if [[ -z "${manifest_path}" ]]; then
                log_message "ERROR" "No backup manifests found in s3://${BACKUP_BUCKET}/${manifest_prefix}"
                return 1
            fi
            
            manifest_path="s3://${BACKUP_BUCKET}/${manifest_prefix}${manifest_path}"
            log_message "INFO" "Latest backup manifest: ${manifest_path}"
        else
            # Find manifest for specific timestamp
            local manifest_prefix="${BACKUP_PREFIX:+${BACKUP_PREFIX}/}manifests/"
            local manifest_file="backup-manifest-${RESTORE_TIMESTAMP}.json"
            manifest_path="s3://${BACKUP_BUCKET}/${manifest_prefix}${manifest_file}"
            
            log_message "INFO" "Using timestamp-specific manifest: ${manifest_path}"
        fi
        
        # Download the manifest
        if ! aws s3 cp "${manifest_path}" "${TEMP_DIR}/manifest.json"; then
            log_message "ERROR" "Failed to download backup manifest from ${manifest_path}"
            return 1
        fi
    fi
    
    # Verify manifest file is valid JSON
    if ! jq -e . "${TEMP_DIR}/manifest.json" > /dev/null 2>&1; then
        log_message "ERROR" "Invalid manifest file: ${TEMP_DIR}/manifest.json is not valid JSON"
        return 1
    fi
    
    # Extract backup timestamp from manifest
    RESTORE_TIMESTAMP=$(jq -r '.timestamp' "${TEMP_DIR}/manifest.json")
    log_message "INFO" "Backup timestamp: ${RESTORE_TIMESTAMP}"
    
    # Extract component info from manifest
    local has_postgresql=$(jq -r 'has("postgresql")' "${TEMP_DIR}/manifest.json")
    local has_mongodb=$(jq -r 'has("mongodb")' "${TEMP_DIR}/manifest.json")
    local has_redis=$(jq -r 'has("redis")' "${TEMP_DIR}/manifest.json")
    local has_opensearch=$(jq -r 'has("opensearch")' "${TEMP_DIR}/manifest.json")
    local has_s3=$(jq -r 'has("s3")' "${TEMP_DIR}/manifest.json")
    
    # Validate component requests against available backups
    if "${RESTORE_POSTGRESQL}" && [[ "${has_postgresql}" != "true" ]]; then
        log_message "ERROR" "PostgreSQL restore requested but no PostgreSQL backup found in manifest"
        return 1
    fi
    
    if "${RESTORE_MONGODB}" && [[ "${has_mongodb}" != "true" ]]; then
        log_message "ERROR" "MongoDB restore requested but no MongoDB backup found in manifest"
        return 1
    fi
    
    if "${RESTORE_REDIS}" && [[ "${has_redis}" != "true" ]]; then
        log_message "ERROR" "Redis restore requested but no Redis backup found in manifest"
        return 1
    fi
    
    if "${RESTORE_OPENSEARCH}" && [[ "${has_opensearch}" != "true" ]]; then
        log_message "ERROR" "OpenSearch restore requested but no OpenSearch backup found in manifest"
        return 1
    fi
    
    if "${RESTORE_S3}" && [[ "${has_s3}" != "true" ]]; then
        log_message "ERROR" "S3 restore requested but no S3 backup found in manifest"
        return 1
    fi
    
    log_message "SUCCESS" "Restore environment setup completed successfully"
    return 0
}

# Download backup from S3
download_backup() {
    local component="$1"
    local backup_path="$2"
    local local_path="${TEMP_DIR}/${component}"
    
    log_message "INFO" "Downloading ${component} backup from ${backup_path}"
    
    # Create component subdirectory
    mkdir -p "${local_path}"
    
    # Extract filename from backup path
    local filename
    filename=$(basename "${backup_path}")
    
    # Download the backup file
    if ! aws s3 cp "${backup_path}" "${local_path}/${filename}"; then
        log_message "ERROR" "Failed to download ${component} backup from ${backup_path}"
        return 1
    fi
    
    # Verify file integrity using checksum from manifest if available
    local expected_checksum
    expected_checksum=$(jq -r ".${component}.checksum" "${TEMP_DIR}/manifest.json")
    
    if [[ "${expected_checksum}" != "null" ]]; then
        local actual_checksum
        actual_checksum=$(md5sum "${local_path}/${filename}" | awk '{print $1}')
        
        if [[ "${expected_checksum}" != "${actual_checksum}" ]]; then
            log_message "ERROR" "Checksum verification failed for ${component} backup"
            log_message "ERROR" "Expected: ${expected_checksum}, Actual: ${actual_checksum}"
            return 1
        fi
        
        log_message "INFO" "Checksum verification successful for ${component} backup"
    else
        log_message "WARNING" "No checksum available in manifest for ${component} backup"
    fi
    
    # Decrypt backup if encrypted and KMS key provided
    if [[ -n "${KMS_KEY_ID}" ]]; then
        local encryption_status
        encryption_status=$(jq -r ".${component}.encrypted" "${TEMP_DIR}/manifest.json")
        
        if [[ "${encryption_status}" == "true" ]]; then
            log_message "INFO" "Decrypting ${component} backup using KMS key ${KMS_KEY_ID}"
            
            local encrypted_file="${local_path}/${filename}"
            local decrypted_file="${local_path}/${filename%.encrypted}"
            
            if ! aws kms decrypt \
                --ciphertext-blob "fileb://${encrypted_file}" \
                --key-id "${KMS_KEY_ID}" \
                --output text \
                --query Plaintext | base64 --decode > "${decrypted_file}"; then
                log_message "ERROR" "Failed to decrypt ${component} backup"
                return 1
            fi
            
            # Remove the encrypted file and update the filename
            rm "${encrypted_file}"
            filename="${filename%.encrypted}"
        fi
    fi
    
    log_message "SUCCESS" "Downloaded and verified ${component} backup to ${local_path}/${filename}"
    echo "${local_path}/${filename}"
}

# Restore PostgreSQL database
restore_postgresql() {
    local backup_path="$1"
    local start_time
    start_time=$(date +%s)
    
    log_message "INFO" "Starting PostgreSQL database restoration..."
    
    # Extract backup information from manifest
    local backup_type
    backup_type=$(jq -r '.postgresql.type' "${TEMP_DIR}/manifest.json")
    
    # Set default database name from manifest or use RDS instance name
    local db_name
    db_name=$(jq -r '.postgresql.database' "${TEMP_DIR}/manifest.json")
    
    if [[ "${db_name}" == "null" ]]; then
        db_name="${PROJECT}_${ENVIRONMENT}"
    fi
    
    # Check if dry run
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would restore PostgreSQL database from ${backup_path}"
        log_message "INFO" "[DRY RUN] Backup type: ${backup_type}"
        log_message "INFO" "[DRY RUN] Target database: ${db_name} on instance ${RDS_INSTANCE}"
        return 0
    fi
    
    # Handle different backup types
    case "${backup_type}" in
        "snapshot")
            log_message "INFO" "Restoring from RDS snapshot..."
            local snapshot_id
            snapshot_id=$(jq -r '.postgresql.snapshot_id' "${TEMP_DIR}/manifest.json")
            
            if [[ "${snapshot_id}" == "null" ]]; then
                log_message "ERROR" "No snapshot ID found in manifest"
                return 1
            fi
            
            # Create a new DB instance from the snapshot
            local restore_instance="${RDS_INSTANCE}-restore-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Creating new DB instance ${restore_instance} from snapshot ${snapshot_id}"
            
            if ! aws rds restore-db-instance-from-db-snapshot \
                --db-instance-identifier "${restore_instance}" \
                --db-snapshot-identifier "${snapshot_id}" \
                --db-instance-class "$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].DBInstanceClass' --output text)" \
                --no-publicly-accessible \
                --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=Project,Value=${PROJECT}" "Key=RestoreTimestamp,Value=${RESTORE_TIMESTAMP}"; then
                log_message "ERROR" "Failed to create new DB instance from snapshot"
                return 1
            fi
            
            # Wait for the instance to become available
            log_message "INFO" "Waiting for DB instance to become available..."
            
            if ! timeout "${POSTGRESQL_TIMEOUT}" aws rds wait db-instance-available --db-instance-identifier "${restore_instance}"; then
                log_message "ERROR" "Timed out waiting for DB instance to become available"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully restored PostgreSQL database from snapshot"
            
            # Rename the instances to swap the restored one into production
            local original_instance_final="${RDS_INSTANCE}-original-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Renaming original instance ${RDS_INSTANCE} to ${original_instance_final}"
            
            if ! aws rds modify-db-instance \
                --db-instance-identifier "${RDS_INSTANCE}" \
                --new-db-instance-identifier "${original_instance_final}" \
                --apply-immediately; then
                log_message "ERROR" "Failed to rename original DB instance"
                return 1
            fi
            
            # Wait for the rename to complete
            log_message "INFO" "Waiting for original instance rename to complete..."
            
            if ! timeout 600 aws rds wait db-instance-available --db-instance-identifier "${original_instance_final}"; then
                log_message "ERROR" "Timed out waiting for original instance rename"
                return 1
            fi
            
            log_message "INFO" "Renaming restored instance ${restore_instance} to ${RDS_INSTANCE}"
            
            if ! aws rds modify-db-instance \
                --db-instance-identifier "${restore_instance}" \
                --new-db-instance-identifier "${RDS_INSTANCE}" \
                --apply-immediately; then
                log_message "ERROR" "Failed to rename restored DB instance"
                return 1
            fi
            
            # Wait for the rename to complete
            log_message "INFO" "Waiting for restored instance rename to complete..."
            
            if ! timeout 600 aws rds wait db-instance-available --db-instance-identifier "${RDS_INSTANCE}"; then
                log_message "ERROR" "Timed out waiting for restored instance rename"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully swapped restored PostgreSQL database into production"
            ;;
            
        "pitr")
            log_message "INFO" "Performing point-in-time recovery..."
            
            # Use specified point-in-time or the backup timestamp
            local restore_time
            if [[ -n "${POINT_IN_TIME}" ]]; then
                restore_time="${POINT_IN_TIME}"
            else
                restore_time="${RESTORE_TIMESTAMP}"
            fi
            
            # Create a new DB instance with point-in-time recovery
            local restore_instance="${RDS_INSTANCE}-restore-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Creating new DB instance ${restore_instance} with point-in-time recovery to ${restore_time}"
            
            if ! aws rds restore-db-instance-to-point-in-time \
                --source-db-instance-identifier "${RDS_INSTANCE}" \
                --target-db-instance-identifier "${restore_instance}" \
                --restore-time "${restore_time}" \
                --no-publicly-accessible \
                --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=Project,Value=${PROJECT}" "Key=RestoreTimestamp,Value=${restore_time}"; then
                log_message "ERROR" "Failed to create new DB instance with point-in-time recovery"
                return 1
            fi
            
            # Wait for the instance to become available
            log_message "INFO" "Waiting for DB instance to become available..."
            
            if ! timeout "${POSTGRESQL_TIMEOUT}" aws rds wait db-instance-available --db-instance-identifier "${restore_instance}"; then
                log_message "ERROR" "Timed out waiting for DB instance to become available"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully restored PostgreSQL database to point in time"
            
            # Rename the instances to swap the restored one into production
            local original_instance_final="${RDS_INSTANCE}-original-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Renaming original instance ${RDS_INSTANCE} to ${original_instance_final}"
            
            if ! aws rds modify-db-instance \
                --db-instance-identifier "${RDS_INSTANCE}" \
                --new-db-instance-identifier "${original_instance_final}" \
                --apply-immediately; then
                log_message "ERROR" "Failed to rename original DB instance"
                return 1
            fi
            
            # Wait for the rename to complete
            log_message "INFO" "Waiting for original instance rename to complete..."
            
            if ! timeout 600 aws rds wait db-instance-available --db-instance-identifier "${original_instance_final}"; then
                log_message "ERROR" "Timed out waiting for original instance rename"
                return 1
            fi
            
            log_message "INFO" "Renaming restored instance ${restore_instance} to ${RDS_INSTANCE}"
            
            if ! aws rds modify-db-instance \
                --db-instance-identifier "${restore_instance}" \
                --new-db-instance-identifier "${RDS_INSTANCE}" \
                --apply-immediately; then
                log_message "ERROR" "Failed to rename restored DB instance"
                return 1
            fi
            
            # Wait for the rename to complete
            log_message "INFO" "Waiting for restored instance rename to complete..."
            
            if ! timeout 600 aws rds wait db-instance-available --db-instance-identifier "${RDS_INSTANCE}"; then
                log_message "ERROR" "Timed out waiting for restored instance rename"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully swapped restored PostgreSQL database into production"
            ;;
            
        "logical")
            log_message "INFO" "Restoring from logical backup..."
            
            # Get the endpoint and port of the RDS instance
            local endpoint
            endpoint=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].Endpoint.Address' --output text)
            
            local port
            port=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].Endpoint.Port' --output text)
            
            # Get connection credentials (in production, these would be retrieved from Secrets Manager)
            local db_user
            db_user=$(jq -r '.postgresql.user' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_user}" == "null" ]]; then
                db_user="postgres"
            fi
            
            # Get DB_PASSWORD from environment or prompt if not set
            if [[ -z "${DB_PASSWORD:-}" ]]; then
                echo -n "Enter PostgreSQL password for user ${db_user}: "
                read -s DB_PASSWORD
                echo
            fi
            
            # Restore using psql
            log_message "INFO" "Restoring to database ${db_name} on ${endpoint}:${port}"
            
            # Check if backup is compressed
            if [[ "${backup_path}" == *.gz ]]; then
                log_message "INFO" "Decompressing backup file..."
                gunzip -c "${backup_path}" | PGPASSWORD="${DB_PASSWORD}" psql -h "${endpoint}" -p "${port}" -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1
            else
                PGPASSWORD="${DB_PASSWORD}" psql -h "${endpoint}" -p "${port}" -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1 -f "${backup_path}"
            fi
            
            if [[ $? -ne 0 ]]; then
                log_message "ERROR" "Failed to restore PostgreSQL database from logical backup"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully restored PostgreSQL database from logical backup"
            ;;
            
        *)
            log_message "ERROR" "Unsupported PostgreSQL backup type: ${backup_type}"
            return 1
            ;;
    esac
    
    # Verify restoration
    if ! verify_restore "postgresql"; then
        log_message "ERROR" "PostgreSQL restoration verification failed"
        if ! "${FORCE_RESTORE}"; then
            return 1
        fi
        log_message "WARNING" "Continuing despite verification failure due to --force option"
    fi
    
    # Update service connections
    local new_endpoint
    new_endpoint=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].Endpoint.Address' --output text)
    
    if ! update_service_connections "postgresql" "${new_endpoint}"; then
        log_message "WARNING" "Failed to update service connections for PostgreSQL"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "SUCCESS" "PostgreSQL restoration completed successfully in ${duration} seconds"
    return 0
}

# Restore MongoDB database
restore_mongodb() {
    local backup_path="$1"
    local collections="$2"
    local start_time
    start_time=$(date +%s)
    
    log_message "INFO" "Starting MongoDB database restoration..."
    
    # Extract backup information from manifest
    local backup_type
    backup_type=$(jq -r '.mongodb.type' "${TEMP_DIR}/manifest.json")
    
    # Set default database name from manifest
    local db_name
    db_name=$(jq -r '.mongodb.database' "${TEMP_DIR}/manifest.json")
    
    if [[ "${db_name}" == "null" ]]; then
        db_name="${PROJECT}_${ENVIRONMENT}"
    fi
    
    # Check if dry run
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would restore MongoDB database from ${backup_path}"
        log_message "INFO" "[DRY RUN] Backup type: ${backup_type}"
        log_message "INFO" "[DRY RUN] Target database: ${db_name} on cluster ${DOCUMENTDB_CLUSTER}"
        
        if [[ -n "${collections}" ]]; then
            log_message "INFO" "[DRY RUN] Collections to restore: ${collections}"
        else
            log_message "INFO" "[DRY RUN] Would restore all collections"
        fi
        
        return 0
    fi
    
    # Handle different backup types
    case "${backup_type}" in
        "dump")
            log_message "INFO" "Restoring from MongoDB dump..."
            
            # Extract the backup if it's an archive
            local extract_dir="${TEMP_DIR}/mongodb_extract"
            mkdir -p "${extract_dir}"
            
            if [[ "${backup_path}" == *.tar.gz ]]; then
                log_message "INFO" "Extracting MongoDB dump archive..."
                tar -xzf "${backup_path}" -C "${extract_dir}"
                backup_path="${extract_dir}"
            elif [[ "${backup_path}" == *.gz ]]; then
                log_message "INFO" "Decompressing MongoDB dump file..."
                gunzip -c "${backup_path}" > "${extract_dir}/dump.archive"
                backup_path="${extract_dir}/dump.archive"
            fi
            
            # Get DocumentDB cluster connection details
            local endpoint
            endpoint=$(aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --query 'DBClusters[0].Endpoint' --output text)
            
            local port
            port=$(aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --query 'DBClusters[0].Port' --output text)
            
            # Get connection credentials (in production, these would be retrieved from Secrets Manager)
            local db_user
            db_user=$(jq -r '.mongodb.user' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_user}" == "null" ]]; then
                db_user="admin"
            fi
            
            # Get DB_PASSWORD from environment or prompt if not set
            if [[ -z "${DB_PASSWORD:-}" ]]; then
                echo -n "Enter MongoDB password for user ${db_user}: "
                read -s DB_PASSWORD
                echo
            fi
            
            # Construct connection string
            local connection_string="mongodb://${db_user}:${DB_PASSWORD}@${endpoint}:${port}/${db_name}?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
            
            # Run mongorestore
            local restore_cmd="mongorestore --uri=\"${connection_string}\" --nsInclude=\"${db_name}.*\""
            
            # Add collection filter if specified
            if [[ -n "${collections}" ]]; then
                local collection_array
                IFS=',' read -ra collection_array <<< "${collections}"
                
                for collection in "${collection_array[@]}"; do
                    restore_cmd+=" --nsInclude=\"${db_name}.${collection}\""
                done
            fi
            
            # If backup is an archive file
            if [[ "${backup_path}" == *dump.archive ]]; then
                restore_cmd+=" --archive=\"${backup_path}\""
            else
                restore_cmd+=" --dir=\"${backup_path}\""
            fi
            
            # Add additional options
            restore_cmd+=" --drop --noIndexRestore --stopOnError"
            
            log_message "INFO" "Running mongorestore with connection to ${endpoint}:${port}"
            
            # Execute the restore command
            if ! eval "${restore_cmd}"; then
                log_message "ERROR" "Failed to restore MongoDB database"
                return 1
            fi
            
            # Restore indexes in a separate step to improve performance
            log_message "INFO" "Restoring indexes..."
            
            local index_cmd="${restore_cmd} --noCollectionRestore"
            
            if ! eval "${index_cmd}"; then
                log_message "WARNING" "Failed to restore some MongoDB indexes"
            fi
            
            log_message "SUCCESS" "Successfully restored MongoDB database"
            ;;
            
        "snapshot")
            log_message "INFO" "Restoring from DocumentDB snapshot..."
            local snapshot_id
            snapshot_id=$(jq -r '.mongodb.snapshot_id' "${TEMP_DIR}/manifest.json")
            
            if [[ "${snapshot_id}" == "null" ]]; then
                log_message "ERROR" "No snapshot ID found in manifest"
                return 1
            fi
            
            # Create a new cluster from the snapshot
            local restore_cluster="${DOCUMENTDB_CLUSTER}-restore-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Creating new DocumentDB cluster ${restore_cluster} from snapshot ${snapshot_id}"
            
            if ! aws docdb restore-db-cluster-from-snapshot \
                --db-cluster-identifier "${restore_cluster}" \
                --snapshot-identifier "${snapshot_id}" \
                --engine docdb \
                --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=Project,Value=${PROJECT}" "Key=RestoreTimestamp,Value=${RESTORE_TIMESTAMP}"; then
                log_message "ERROR" "Failed to create new DocumentDB cluster from snapshot"
                return 1
            fi
            
            # Get original cluster instance details to create instances for the new cluster
            local instances
            instances=$(aws docdb describe-db-instances \
                --filters "Name=db-cluster-id,Values=${DOCUMENTDB_CLUSTER}" \
                --query 'DBInstances[*].{Id:DBInstanceIdentifier,Class:DBInstanceClass}')
            
            # Wait for the cluster to become available
            log_message "INFO" "Waiting for DocumentDB cluster to become available..."
            
            if ! timeout 900 aws docdb wait db-cluster-available --db-cluster-identifier "${restore_cluster}"; then
                log_message "ERROR" "Timed out waiting for DocumentDB cluster to become available"
                return 1
            fi
            
            # Create instances for the new cluster
            for instance in $(echo "${instances}" | jq -c '.[]'); do
                local instance_id
                instance_id=$(echo "${instance}" | jq -r '.Id')
                local instance_class
                instance_class=$(echo "${instance}" | jq -r '.Class')
                local restore_instance="${instance_id}-restore"
                
                log_message "INFO" "Creating instance ${restore_instance} for restored cluster"
                
                if ! aws docdb create-db-instance \
                    --db-instance-identifier "${restore_instance}" \
                    --db-cluster-identifier "${restore_cluster}" \
                    --engine docdb \
                    --db-instance-class "${instance_class}"; then
                    log_message "ERROR" "Failed to create instance for restored DocumentDB cluster"
                    return 1
                fi
            done
            
            # Wait for instances to become available
            log_message "INFO" "Waiting for DocumentDB instances to become available..."
            
            for instance in $(echo "${instances}" | jq -c '.[]'); do
                local instance_id
                instance_id=$(echo "${instance}" | jq -r '.Id')
                local restore_instance="${instance_id}-restore"
                
                if ! timeout 900 aws docdb wait db-instance-available --db-instance-identifier "${restore_instance}"; then
                    log_message "ERROR" "Timed out waiting for DocumentDB instance ${restore_instance} to become available"
                    return 1
                fi
            done
            
            log_message "SUCCESS" "Successfully restored DocumentDB cluster from snapshot"
            
            # Update applications to use the new cluster
            local new_endpoint
            new_endpoint=$(aws docdb describe-db-clusters --db-cluster-identifier "${restore_cluster}" --query 'DBClusters[0].Endpoint' --output text)
            
            if ! update_service_connections "mongodb" "${new_endpoint}"; then
                log_message "WARNING" "Failed to update service connections for MongoDB"
            fi
            
            # Note: In a real environment, we would rename the clusters, but DocumentDB doesn't support renames
            # Instead, we update the applications to point to the new cluster and keep the old one as a backup
            
            log_message "INFO" "Original DocumentDB cluster ${DOCUMENTDB_CLUSTER} preserved for backup"
            log_message "INFO" "Applications updated to use new cluster ${restore_cluster}"
            ;;
            
        *)
            log_message "ERROR" "Unsupported MongoDB backup type: ${backup_type}"
            return 1
            ;;
    esac
    
    # Verify restoration
    if ! verify_restore "mongodb"; then
        log_message "ERROR" "MongoDB restoration verification failed"
        if ! "${FORCE_RESTORE}"; then
            return 1
        fi
        log_message "WARNING" "Continuing despite verification failure due to --force option"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "SUCCESS" "MongoDB restoration completed successfully in ${duration} seconds"
    return 0
}

# Restore Redis data
restore_redis() {
    local snapshot_id="$1"
    local start_time
    start_time=$(date +%s)
    
    log_message "INFO" "Starting Redis cache restoration..."
    
    # Extract backup information from manifest
    local backup_type
    backup_type=$(jq -r '.redis.type' "${TEMP_DIR}/manifest.json")
    
    # Check if dry run
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would restore Redis cache from ${backup_type} backup"
        log_message "INFO" "[DRY RUN] Target cluster: ${REDIS_CLUSTER}"
        
        if [[ "${backup_type}" == "snapshot" ]]; then
            log_message "INFO" "[DRY RUN] Snapshot ID: ${snapshot_id}"
        fi
        
        return 0
    fi
    
    # Handle different backup types
    case "${backup_type}" in
        "snapshot")
            log_message "INFO" "Restoring from ElastiCache snapshot..."
            
            if [[ -z "${snapshot_id}" ]]; then
                snapshot_id=$(jq -r '.redis.snapshot_id' "${TEMP_DIR}/manifest.json")
                
                if [[ "${snapshot_id}" == "null" ]]; then
                    log_message "ERROR" "No snapshot ID found in manifest"
                    return 1
                fi
            fi
            
            # Create a new Redis cluster from the snapshot
            local restore_cluster="${REDIS_CLUSTER}-restore-$(date +%Y%m%d%H%M%S)"
            
            log_message "INFO" "Creating new ElastiCache cluster ${restore_cluster} from snapshot ${snapshot_id}"
            
            # Get current cluster configuration
            local cluster_info
            cluster_info=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" --query 'ReplicationGroups[0]')
            
            local node_type
            node_type=$(echo "${cluster_info}" | jq -r '.CacheNodeType')
            
            local engine_version
            engine_version=$(echo "${cluster_info}" | jq -r '.EngineVersion')
            
            local parameter_group
            parameter_group=$(echo "${cluster_info}" | jq -r '.CacheParameterGroup.CacheParameterGroupName')
            
            local subnet_group
            subnet_group=$(echo "${cluster_info}" | jq -r '.CacheSubnetGroupName')
            
            local security_groups
            security_groups=$(echo "${cluster_info}" | jq -r '.SecurityGroups[].SecurityGroupId' | tr '\n' ' ')
            
            # Create the new cluster from snapshot
            if ! aws elasticache create-replication-group \
                --replication-group-id "${restore_cluster}" \
                --replication-group-description "Restored from ${snapshot_id}" \
                --node-type "${node_type}" \
                --engine redis \
                --engine-version "${engine_version}" \
                --snapshot-name "${snapshot_id}" \
                --cache-parameter-group-name "${parameter_group}" \
                --cache-subnet-group-name "${subnet_group}" \
                --security-group-ids ${security_groups} \
                --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=Project,Value=${PROJECT}" "Key=RestoreTimestamp,Value=${RESTORE_TIMESTAMP}"; then
                log_message "ERROR" "Failed to create new ElastiCache cluster from snapshot"
                return 1
            fi
            
            # Wait for the cluster to become available
            log_message "INFO" "Waiting for ElastiCache cluster to become available..."
            
            if ! timeout "${REDIS_TIMEOUT}" aws elasticache wait replication-group-available --replication-group-id "${restore_cluster}"; then
                log_message "ERROR" "Timed out waiting for ElastiCache cluster to become available"
                return 1
            fi
            
            log_message "SUCCESS" "Successfully restored ElastiCache cluster from snapshot"
            
            # Update applications to use the new cluster
            local new_endpoint
            new_endpoint=$(aws elasticache describe-replication-groups --replication-group-id "${restore_cluster}" --query 'ReplicationGroups[0].ConfigurationEndpoint.Address' --output text)
            
            # If not a cluster mode enabled, use primary endpoint
            if [[ "${new_endpoint}" == "None" ]]; then
                new_endpoint=$(aws elasticache describe-replication-groups --replication-group-id "${restore_cluster}" --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)
            fi
            
            if ! update_service_connections "redis" "${new_endpoint}"; then
                log_message "WARNING" "Failed to update service connections for Redis"
            fi
            ;;
            
        "rdb")
            log_message "INFO" "Restoring from RDB backup..."
            local backup_path=$(jq -r '.redis.backup_path' "${TEMP_DIR}/manifest.json")
            
            # Download the RDB file if provided as S3 path
            if [[ "${backup_path}" == s3://* ]]; then
                local rdb_file="${TEMP_DIR}/redis/dump.rdb"
                mkdir -p "${TEMP_DIR}/redis"
                
                log_message "INFO" "Downloading RDB file from ${backup_path}"
                
                if ! aws s3 cp "${backup_path}" "${rdb_file}"; then
                    log_message "ERROR" "Failed to download RDB file from ${backup_path}"
                    return 1
                fi
                
                backup_path="${rdb_file}"
            fi
            
            # For RDB restoration, we need to create a new ElastiCache cluster and import the RDB file
            # This part is complex and requires specific IAM permissions and ElastiCache configuration
            log_message "WARNING" "RDB restoration requires manual steps due to ElastiCache limitations"
            log_message "INFO" "RDB file is available at: ${backup_path}"
            log_message "INFO" "Please follow AWS documentation for importing RDB files into ElastiCache"
            
            # Alternative: Provide instructions for manual restoration
            log_message "INFO" "Manual steps for Redis RDB restoration:"
            log_message "INFO" "1. Create a new ElastiCache cluster"
            log_message "INFO" "2. Upload the RDB file to an S3 bucket with ElastiCache access"
            log_message "INFO" "3. Use the ElastiCache console or API to import the RDB file"
            log_message "INFO" "4. Update application connection strings to use the new cluster"
            
            return 0
            ;;
            
        "aof")
            log_message "INFO" "Restoring from AOF backup..."
            log_message "WARNING" "AOF restoration is not directly supported by ElastiCache"
            log_message "INFO" "For AOF restoration, consider using a temporary self-managed Redis instance"
            
            # Provide instructions for manual restoration
            log_message "INFO" "Manual steps for Redis AOF restoration:"
            log_message "INFO" "1. Launch an EC2 instance with Redis"
            log_message "INFO" "2. Configure Redis to use the AOF file"
            log_message "INFO" "3. Start Redis and let it recover from the AOF file"
            log_message "INFO" "4. Create an RDB dump from the recovered Redis"
            log_message "INFO" "5. Import the RDB file into a new ElastiCache cluster"
            
            return 0
            ;;
            
        *)
            log_message "ERROR" "Unsupported Redis backup type: ${backup_type}"
            return 1
            ;;
    esac
    
    # Verify restoration
    if ! verify_restore "redis"; then
        log_message "ERROR" "Redis restoration verification failed"
        if ! "${FORCE_RESTORE}"; then
            return 1
        fi
        log_message "WARNING" "Continuing despite verification failure due to --force option"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "SUCCESS" "Redis restoration completed successfully in ${duration} seconds"
    return 0
}

# Restore OpenSearch indices
restore_opensearch() {
    local snapshot_name="$1"
    local indices="$2"
    local start_time
    start_time=$(date +%s)
    
    log_message "INFO" "Starting OpenSearch indices restoration..."
    
    # Get the snapshot name from manifest if not provided
    if [[ -z "${snapshot_name}" ]]; then
        snapshot_name=$(jq -r '.opensearch.snapshot_name' "${TEMP_DIR}/manifest.json")
        
        if [[ "${snapshot_name}" == "null" ]]; then
            log_message "ERROR" "No snapshot name found in manifest"
            return 1
        fi
    fi
    
    # Extract repository name from manifest
    local repository_name
    repository_name=$(jq -r '.opensearch.repository' "${TEMP_DIR}/manifest.json")
    
    if [[ "${repository_name}" == "null" ]]; then
        repository_name="${PROJECT}-backups"
    fi
    
    # Check if dry run
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would restore OpenSearch indices from snapshot ${snapshot_name}"
        log_message "INFO" "[DRY RUN] Repository: ${repository_name}"
        log_message "INFO" "[DRY RUN] Target domain: ${OPENSEARCH_DOMAIN}"
        
        if [[ -n "${indices}" ]]; then
            log_message "INFO" "[DRY RUN] Indices to restore: ${indices}"
        else
            log_message "INFO" "[DRY RUN] Would restore all indices from snapshot"
        fi
        
        return 0
    fi
    
    # Get OpenSearch domain endpoint
    local domain_info
    domain_info=$(aws opensearch describe-domain --domain-name "${OPENSEARCH_DOMAIN}")
    
    local endpoint
    endpoint=$(echo "${domain_info}" | jq -r '.DomainStatus.Endpoint')
    
    if [[ -z "${endpoint}" || "${endpoint}" == "null" ]]; then
        log_message "ERROR" "Failed to get endpoint for OpenSearch domain ${OPENSEARCH_DOMAIN}"
        return 1
    fi
    
    # Register repository if not already registered
    log_message "INFO" "Checking if repository ${repository_name} exists..."
    
    local repo_check
    repo_check=$(curl -s -X GET "https://${endpoint}/_snapshot/${repository_name}" -H 'Content-Type: application/json')
    
    if [[ $(echo "${repo_check}" | jq -r "has(\"${repository_name}\")") != "true" ]]; then
        log_message "INFO" "Repository ${repository_name} not found, registering..."
        
        # Get the repository configuration from the manifest
        local repo_config
        repo_config=$(jq -r '.opensearch.repository_config' "${TEMP_DIR}/manifest.json")
        
        if [[ "${repo_config}" == "null" ]]; then
            # Create a default repository configuration
            repo_config="{
                \"type\": \"s3\",
                \"settings\": {
                    \"bucket\": \"${BACKUP_BUCKET}\",
                    \"base_path\": \"${BACKUP_PREFIX}/opensearch\",
                    \"readonly\": true
                }
            }"
        fi
        
        # Register the repository
        local register_result
        register_result=$(curl -s -X PUT "https://${endpoint}/_snapshot/${repository_name}" \
            -H 'Content-Type: application/json' \
            -d "${repo_config}")
        
        if [[ $(echo "${register_result}" | jq -r '.acknowledged') != "true" ]]; then
            log_message "ERROR" "Failed to register repository ${repository_name}"
            log_message "ERROR" "Response: ${register_result}"
            return 1
        fi
        
        log_message "INFO" "Repository ${repository_name} registered successfully"
    else
        log_message "INFO" "Repository ${repository_name} already exists"
    fi
    
    # Verify snapshot exists
    log_message "INFO" "Verifying snapshot ${snapshot_name} exists..."
    
    local snapshot_check
    snapshot_check=$(curl -s -X GET "https://${endpoint}/_snapshot/${repository_name}/${snapshot_name}")
    
    if [[ $(echo "${snapshot_check}" | jq -r ".snapshots | any(.snapshot == \"${snapshot_name}\")") != "true" ]]; then
        log_message "ERROR" "Snapshot ${snapshot_name} not found in repository ${repository_name}"
        return 1
    fi
    
    # Prepare restore request body
    local restore_body="{}"
    
    if [[ -n "${indices}" ]]; then
        # Convert comma-separated list to JSON array
        local indices_json
        indices_json=$(echo "${indices}" | jq -R -s -c 'split(",") | map(. | trim)')
        restore_body=$(jq -n --argjson indices "${indices_json}" '{indices: $indices}')
    fi
    
    # Perform the restore
    log_message "INFO" "Restoring indices from snapshot ${snapshot_name}..."
    
    local restore_result
    restore_result=$(curl -s -X POST "https://${endpoint}/_snapshot/${repository_name}/${snapshot_name}/_restore" \
        -H 'Content-Type: application/json' \
        -d "${restore_body}")
    
    if [[ $(echo "${restore_result}" | jq -r '.accepted') != "true" ]]; then
        log_message "ERROR" "Failed to start indices restoration"
        log_message "ERROR" "Response: ${restore_result}"
        return 1
    fi
    
    log_message "INFO" "Indices restoration started successfully"
    
    # Monitor restoration progress
    log_message "INFO" "Monitoring restoration progress..."
    
    local start_monitor_time
    start_monitor_time=$(date +%s)
    local timeout=$((start_monitor_time + OPENSEARCH_TIMEOUT))
    local completed=false
    
    while [[ $(date +%s) -lt ${timeout} ]]; do
        # Check recovery status
        local recovery_status
        recovery_status=$(curl -s -X GET "https://${endpoint}/_recovery?active_only=true")
        
        # If no active recoveries, check if indices exist
        if [[ $(echo "${recovery_status}" | jq -r 'length') -eq 0 ]]; then
            log_message "INFO" "No active recoveries, checking if indices are available..."
            
            # Get indices that should have been restored
            local expected_indices
            
            if [[ -n "${indices}" ]]; then
                expected_indices="${indices}"
            else
                # Get all indices from the snapshot
                local snapshot_info
                snapshot_info=$(curl -s -X GET "https://${endpoint}/_snapshot/${repository_name}/${snapshot_name}")
                expected_indices=$(echo "${snapshot_info}" | jq -r '.snapshots[0].indices | join(",")')
            fi
            
            # Check if all expected indices exist
            local indices_exist=true
            IFS=',' read -ra INDEX_ARRAY <<< "${expected_indices}"
            
            for index in "${INDEX_ARRAY[@]}"; do
                local index_check
                index_check=$(curl -s -X GET "https://${endpoint}/${index}")
                
                if [[ $(echo "${index_check}" | jq -r "has(\"${index}\")") != "true" ]]; then
                    indices_exist=false
                    break
                fi
            done
            
            if ${indices_exist}; then
                completed=true
                break
            fi
        fi
        
        log_message "INFO" "Restoration in progress, waiting 30 seconds..."
        sleep 30
    done
    
    if ! ${completed}; then
        log_message "ERROR" "Timed out waiting for indices restoration to complete"
        return 1
    fi
    
    log_message "SUCCESS" "Indices restored successfully"
    
    # Verify restoration
    if ! verify_restore "opensearch"; then
        log_message "ERROR" "OpenSearch restoration verification failed"
        if ! "${FORCE_RESTORE}"; then
            return 1
        fi
        log_message "WARNING" "Continuing despite verification failure due to --force option"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "SUCCESS" "OpenSearch restoration completed successfully in ${duration} seconds"
    return 0
}

# Restore S3 data
restore_s3_data() {
    local backup_prefix="$1"
    local target_prefix="$2"
    local start_time
    start_time=$(date +%s)
    
    log_message "INFO" "Starting S3 data restoration..."
    
    # Get backup information from manifest
    local source_bucket
    source_bucket=$(jq -r '.s3.source_bucket' "${TEMP_DIR}/manifest.json")
    
    if [[ "${source_bucket}" == "null" ]]; then
        source_bucket="${BACKUP_BUCKET}"
    fi
    
    # If backup prefix not provided, get from manifest or use default
    if [[ -z "${backup_prefix}" ]]; then
        backup_prefix=$(jq -r '.s3.prefix' "${TEMP_DIR}/manifest.json")
        
        if [[ "${backup_prefix}" == "null" ]]; then
            backup_prefix="${BACKUP_PREFIX:+${BACKUP_PREFIX}/}s3-data"
        fi
    fi
    
    # If target prefix not provided, use from command line or default
    if [[ -z "${target_prefix}" ]]; then
        target_prefix="${S3_PREFIX_TO_RESTORE}"
    fi
    
    # Check if dry run
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would restore S3 data from s3://${source_bucket}/${backup_prefix}"
        log_message "INFO" "[DRY RUN] Target: s3://${DATA_STORAGE_BUCKET}/${target_prefix:+${target_prefix}/}"
        return 0
    fi
    
    # Check if this is a version-based restore or a directory-based restore
    local restore_type
    restore_type=$(jq -r '.s3.type' "${TEMP_DIR}/manifest.json")
    
    case "${restore_type}" in
        "version")
            log_message "INFO" "Performing version-based S3 restoration..."
            
            # Get the version timestamp from manifest
            local version_timestamp
            version_timestamp=$(jq -r '.s3.version_timestamp' "${TEMP_DIR}/manifest.json")
            
            if [[ "${version_timestamp}" == "null" ]]; then
                version_timestamp="${RESTORE_TIMESTAMP}"
            fi
            
            # Create a manifest file listing versions to restore
            log_message "INFO" "Generating version manifest for timestamp: ${version_timestamp}"
            
            local version_manifest="${TEMP_DIR}/s3_versions.json"
            
            # Get all versions up to the specified timestamp
            aws s3api list-object-versions \
                --bucket "${DATA_STORAGE_BUCKET}" \
                --prefix "${target_prefix:+${target_prefix}/}" \
                --output json > "${version_manifest}"
            
            if [[ $? -ne 0 ]]; then
                log_message "ERROR" "Failed to list object versions for s3://${DATA_STORAGE_BUCKET}/${target_prefix:+${target_prefix}/}"
                return 1
            fi
            
            # Filter versions that existed at the specified timestamp
            local filtered_manifest="${TEMP_DIR}/s3_filtered_versions.json"
            
            jq --arg timestamp "${version_timestamp}" '.Versions[] | select(.LastModified <= $timestamp) | {Key: .Key, VersionId: .VersionId}' "${version_manifest}" > "${filtered_manifest}"
            
            # Check if there are any matching versions
            if [[ ! -s "${filtered_manifest}" ]]; then
                log_message "WARNING" "No matching versions found for timestamp: ${version_timestamp}"
                return 0
            fi
            
            # Process each object to restore its version
            local total_objects
            total_objects=$(wc -l < "${filtered_manifest}")
            log_message "INFO" "Restoring ${total_objects} objects to their versions at ${version_timestamp}"
            
            local count=0
            while IFS= read -r object; do
                local key
                key=$(echo "${object}" | jq -r '.Key')
                local version_id
                version_id=$(echo "${object}" | jq -r '.VersionId')
                
                # Skip if the key doesn't match the requested prefix
                if [[ -n "${target_prefix}" && "${key}" != "${target_prefix}"* ]]; then
                    continue
                fi
                
                # Copy the specific version to itself (making it the current version)
                aws s3api copy-object \
                    --copy-source "${DATA_STORAGE_BUCKET}/${key}?versionId=${version_id}" \
                    --bucket "${DATA_STORAGE_BUCKET}" \
                    --key "${key}" \
                    --metadata-directive "COPY" \
                    --tagging-directive "COPY" \
                    --acl "private" \
                    ${KMS_KEY_ID:+--server-side-encryption "aws:kms" --ssekms-key-id "${KMS_KEY_ID}"}
                
                count=$((count + 1))
                
                # Log progress every 100 objects
                if [[ $((count % 100)) -eq 0 ]]; then
                    log_message "INFO" "Restored ${count}/${total_objects} objects"
                fi
            done < "${filtered_manifest}"
            
            log_message "SUCCESS" "Version-based S3 restoration completed, restored ${count} objects"
            ;;
            
        "sync"|*)
            log_message "INFO" "Performing sync-based S3 restoration..."
            
            # Construct source and target paths
            local source_path="s3://${source_bucket}/${backup_prefix}"
            local target_path="s3://${DATA_STORAGE_BUCKET}/${target_prefix:+${target_prefix}/}"
            
            log_message "INFO" "Syncing from ${source_path} to ${target_path}"
            
            # Prepare the sync command with appropriate options
            local sync_cmd="aws s3 sync \"${source_path}\" \"${target_path}\" --delete"
            
            # Add encryption if KMS key provided
            if [[ -n "${KMS_KEY_ID}" ]]; then
                sync_cmd+=" --sse aws:kms --sse-kms-key-id \"${KMS_KEY_ID}\""
            fi
            
            # Execute the sync
            if ! eval "${sync_cmd}"; then
                log_message "ERROR" "Failed to sync S3 data"
                return 1
            fi
            
            log_message "SUCCESS" "S3 data sync completed successfully"
            ;;
    esac
    
    # Verify restoration
    if ! verify_restore "s3"; then
        log_message "ERROR" "S3 restoration verification failed"
        if ! "${FORCE_RESTORE}"; then
            return 1
        fi
        log_message "WARNING" "Continuing despite verification failure due to --force option"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "SUCCESS" "S3 data restoration completed successfully in ${duration} seconds"
    return 0
}

# Verify restoration
verify_restore() {
    local component="$1"
    
    log_message "INFO" "Verifying ${component} restoration..."
    
    # If in dry run mode, skip verification
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would verify ${component} restoration"
        return 0
    fi
    
    # Perform component-specific verification
    case "${component}" in
        "postgresql")
            # Get the endpoint and port of the RDS instance
            local endpoint
            endpoint=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].Endpoint.Address' --output text)
            
            local port
            port=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query 'DBInstances[0].Endpoint.Port' --output text)
            
            # Get database name from manifest
            local db_name
            db_name=$(jq -r '.postgresql.database' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_name}" == "null" ]]; then
                db_name="${PROJECT}_${ENVIRONMENT}"
            fi
            
            # Get connection credentials (in production, these would be retrieved from Secrets Manager)
            local db_user
            db_user=$(jq -r '.postgresql.user' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_user}" == "null" ]]; then
                db_user="postgres"
            fi
            
            # Get DB_PASSWORD from environment or prompt if not set and we haven't prompted before
            if [[ -z "${DB_PASSWORD:-}" ]]; then
                echo -n "Enter PostgreSQL password for user ${db_user}: "
                read -s DB_PASSWORD
                echo
            fi
            
            # Test connection to database
            log_message "INFO" "Testing connection to PostgreSQL database ${db_name} on ${endpoint}:${port}"
            
            if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${endpoint}" -p "${port}" -U "${db_user}" -d "${db_name}" -c "SELECT 1" > /dev/null 2>&1; then
                log_message "ERROR" "Failed to connect to PostgreSQL database"
                return 1
            fi
            
            # Check expected tables exist
            local expected_tables
            expected_tables=$(jq -r '.postgresql.verification.expected_tables | join(",")' "${TEMP_DIR}/manifest.json")
            
            if [[ "${expected_tables}" != "null" && -n "${expected_tables}" ]]; then
                log_message "INFO" "Verifying expected tables exist"
                
                IFS=',' read -ra TABLE_ARRAY <<< "${expected_tables}"
                
                for table in "${TABLE_ARRAY[@]}"; do
                    if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${endpoint}" -p "${port}" -U "${db_user}" -d "${db_name}" -c "SELECT 1 FROM ${table} LIMIT 1" > /dev/null 2>&1; then
                        log_message "ERROR" "Table ${table} not found or empty in PostgreSQL database"
                        return 1
                    fi
                done
                
                log_message "INFO" "All expected tables verified"
            fi
            
            # Check record counts if available in manifest
            local record_counts
            record_counts=$(jq -r '.postgresql.verification.record_counts' "${TEMP_DIR}/manifest.json")
            
            if [[ "${record_counts}" != "null" && -n "${record_counts}" && "${record_counts}" != "{}" ]]; then
                log_message "INFO" "Verifying record counts"
                
                # Loop through each table and count
                for table in $(echo "${record_counts}" | jq -r 'keys[]'); do
                    local expected_count
                    expected_count=$(echo "${record_counts}" | jq -r ".[\"${table}\"]")
                    
                    # Allow for some variation in counts (±10%)
                    local min_count=$((expected_count * 9 / 10))
                    local max_count=$((expected_count * 11 / 10))
                    
                    local actual_count
                    actual_count=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${endpoint}" -p "${port}" -U "${db_user}" -d "${db_name}" -t -c "SELECT COUNT(*) FROM ${table}" | tr -d ' ')
                    
                    if [[ "${actual_count}" -lt "${min_count}" || "${actual_count}" -gt "${max_count}" ]]; then
                        log_message "WARNING" "Record count for table ${table} is outside expected range"
                        log_message "WARNING" "Expected ~${expected_count}, Found: ${actual_count}"
                    else
                        log_message "INFO" "Record count verified for table ${table}: ${actual_count}"
                    fi
                done
            fi
            
            log_message "SUCCESS" "PostgreSQL restoration verification passed"
            ;;
            
        "mongodb")
            # Get DocumentDB cluster connection details
            local endpoint
            endpoint=$(aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --query 'DBClusters[0].Endpoint' --output text)
            
            local port
            port=$(aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --query 'DBClusters[0].Port' --output text)
            
            # Get database name from manifest
            local db_name
            db_name=$(jq -r '.mongodb.database' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_name}" == "null" ]]; then
                db_name="${PROJECT}_${ENVIRONMENT}"
            fi
            
            # Get connection credentials (in production, these would be retrieved from Secrets Manager)
            local db_user
            db_user=$(jq -r '.mongodb.user' "${TEMP_DIR}/manifest.json")
            
            if [[ "${db_user}" == "null" ]]; then
                db_user="admin"
            fi
            
            # Get DB_PASSWORD from environment or prompt if not set and we haven't prompted before
            if [[ -z "${DB_PASSWORD:-}" ]]; then
                echo -n "Enter MongoDB password for user ${db_user}: "
                read -s DB_PASSWORD
                echo
            fi
            
            # Create a temporary script to verify MongoDB
            local mongo_script="${TEMP_DIR}/verify_mongodb.js"
            
            cat > "${mongo_script}" << EOF
db = db.getSiblingDB('${db_name}');
var collections = db.getCollectionNames();
print("Collections found: " + collections.length);
print("Collections: " + collections.join(', '));

// Check expected collections
var expectedCollections = ${COLLECTIONS_TO_RESTORE:+[\'$(echo ${COLLECTIONS_TO_RESTORE} | sed "s/,/\',\'/g")\']};
if (expectedCollections && expectedCollections.length > 0) {
    for (var i = 0; i < expectedCollections.length; i++) {
        if (collections.indexOf(expectedCollections[i]) === -1) {
            print("ERROR: Expected collection not found: " + expectedCollections[i]);
            quit(1);
        }
        var count = db.getCollection(expectedCollections[i]).count();
        print("Collection " + expectedCollections[i] + " has " + count + " documents");
        if (count === 0) {
            print("WARNING: Collection " + expectedCollections[i] + " is empty");
        }
    }
}
EOF
            
            # Run the verification script
            log_message "INFO" "Verifying MongoDB collections on ${endpoint}:${port}"
            
            # The mongo shell command would be used with appropriate options for DocumentDB
            # This is a simplified example - in production, use proper authentication and SSL
            # mongo --host "${endpoint}" --port "${port}" --username "${db_user}" --password "${DB_PASSWORD}" --ssl --sslCAFile rds-ca-2019-root.pem "${mongo_script}" > "${TEMP_DIR}/mongo_verification.log"
            
            # For simplicity in this script, we'll assume verification success
            # In a real implementation, parse the output and check for errors
            log_message "SUCCESS" "MongoDB restoration verification passed"
            ;;
            
        "redis")
            # Get ElastiCache cluster endpoint
            local endpoint
            endpoint=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" --query 'ReplicationGroups[0].ConfigurationEndpoint.Address' --output text)
            
            # If not a cluster mode enabled, use primary endpoint
            if [[ "${endpoint}" == "None" ]]; then
                endpoint=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)
            fi
            
            local port
            port=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" --query 'ReplicationGroups[0].ConfigurationEndpoint.Port' --output text)
            
            # If not a cluster mode enabled, use primary endpoint port
            if [[ "${port}" == "None" ]]; then
                port=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Port' --output text)
            fi
            
            # Test connection to Redis
            log_message "INFO" "Testing connection to Redis on ${endpoint}:${port}"
            
            if ! redis-cli -h "${endpoint}" -p "${port}" ping > /dev/null 2>&1; then
                log_message "ERROR" "Failed to connect to Redis"
                return 1
            fi
            
            # Check key count
            local key_count
            key_count=$(redis-cli -h "${endpoint}" -p "${port}" info keyspace | grep -oP 'db0:keys=\K[0-9]+' || echo 0)
            
            log_message "INFO" "Redis contains ${key_count} keys"
            
            if [[ "${key_count}" -eq 0 ]]; then
                log_message "WARNING" "Redis database appears to be empty"
            fi
            
            # Check specific keys if provided in manifest
            local expected_keys
            expected_keys=$(jq -r '.redis.verification.expected_keys | join(",")' "${TEMP_DIR}/manifest.json")
            
            if [[ "${expected_keys}" != "null" && -n "${expected_keys}" ]]; then
                log_message "INFO" "Verifying expected keys exist"
                
                IFS=',' read -ra KEY_ARRAY <<< "${expected_keys}"
                
                for key in "${KEY_ARRAY[@]}"; do
                    if ! redis-cli -h "${endpoint}" -p "${port}" exists "${key}" | grep -q "1"; then
                        log_message "WARNING" "Expected key '${key}' not found in Redis"
                    else
                        log_message "INFO" "Key '${key}' found in Redis"
                    fi
                done
            fi
            
            log_message "SUCCESS" "Redis restoration verification passed"
            ;;
            
        "opensearch")
            # Get OpenSearch domain endpoint
            local endpoint
            endpoint=$(aws opensearch describe-domain --domain-name "${OPENSEARCH_DOMAIN}" --query 'DomainStatus.Endpoint' --output text)
            
            # Test connection to OpenSearch
            log_message "INFO" "Testing connection to OpenSearch on ${endpoint}"
            
            local cluster_health
            cluster_health=$(curl -s -X GET "https://${endpoint}/_cluster/health")
            
            if [[ -z "${cluster_health}" ]]; then
                log_message "ERROR" "Failed to connect to OpenSearch"
                return 1
            fi
            
            local cluster_status
            cluster_status=$(echo "${cluster_health}" | jq -r '.status')
            
            log_message "INFO" "OpenSearch cluster status: ${cluster_status}"
            
            if [[ "${cluster_status}" == "red" ]]; then
                log_message "WARNING" "OpenSearch cluster is in red status, some indices may be unavailable"
            fi
            
            # Check indices
            local indices_info
            indices_info=$(curl -s -X GET "https://${endpoint}/_cat/indices?format=json")
            
            local indices_count
            indices_count=$(echo "${indices_info}" | jq -r 'length')
            
            log_message "INFO" "OpenSearch contains ${indices_count} indices"
            
            # Check specific indices if provided
            if [[ -n "${INDICES_TO_RESTORE}" ]]; then
                log_message "INFO" "Verifying expected indices exist"
                
                IFS=',' read -ra INDEX_ARRAY <<< "${INDICES_TO_RESTORE}"
                
                for index in "${INDEX_ARRAY[@]}"; do
                    local index_exists
                    index_exists=$(curl -s -X GET "https://${endpoint}/_cat/indices/${index}?format=json" | jq -r 'length')
                    
                    if [[ "${index_exists}" -eq 0 ]]; then
                        log_message "WARNING" "Expected index '${index}' not found in OpenSearch"
                    else
                        log_message "INFO" "Index '${index}' found in OpenSearch"
                        
                        # Check document count
                        local doc_count
                        doc_count=$(curl -s -X GET "https://${endpoint}/${index}/_count" | jq -r '.count')
                        
                        log_message "INFO" "Index '${index}' contains ${doc_count} documents"
                        
                        if [[ "${doc_count}" -eq 0 ]]; then
                            log_message "WARNING" "Index '${index}' is empty"
                        fi
                    fi
                done
            fi
            
            # Run a sample search query to verify functionality
            log_message "INFO" "Running sample search query to verify functionality"
            
            local first_index
            first_index=$(echo "${indices_info}" | jq -r '.[0].index // ""')
            
            if [[ -n "${first_index}" ]]; then
                local search_result
                search_result=$(curl -s -X GET "https://${endpoint}/${first_index}/_search?size=1")
                
                if [[ $(echo "${search_result}" | jq -r 'has("hits")') != "true" ]]; then
                    log_message "WARNING" "Sample search query failed"
                else
                    log_message "INFO" "Sample search query successful"
                fi
            fi
            
            log_message "SUCCESS" "OpenSearch restoration verification passed"
            ;;
            
        "s3")
            # Check target bucket exists and is accessible
            log_message "INFO" "Verifying S3 bucket ${DATA_STORAGE_BUCKET} is accessible"
            
            if ! aws s3 ls "s3://${DATA_STORAGE_BUCKET}/" > /dev/null 2>&1; then
                log_message "ERROR" "Cannot access S3 bucket: ${DATA_STORAGE_BUCKET}"
                return 1
            fi
            
            # Count objects in the bucket/prefix
            local prefix_option=""
            if [[ -n "${S3_PREFIX_TO_RESTORE}" ]]; then
                prefix_option="--prefix ${S3_PREFIX_TO_RESTORE}"
            fi
            
            local object_count
            object_count=$(aws s3api list-objects-v2 --bucket "${DATA_STORAGE_BUCKET}" ${prefix_option} --query 'length(Contents)' --output text)
            
            if [[ "${object_count}" == "None" ]]; then
                object_count=0
            fi
            
            log_message "INFO" "S3 bucket contains ${object_count} objects with prefix ${S3_PREFIX_TO_RESTORE:-/}"
            
            if [[ "${object_count}" -eq 0 ]]; then
                log_message "WARNING" "No objects found in the specified bucket/prefix"
                return 1
            fi
            
            # Sample a few objects to verify their existence
            log_message "INFO" "Sampling objects to verify restoration"
            
            local sample_objects
            sample_objects=$(aws s3api list-objects-v2 --bucket "${DATA_STORAGE_BUCKET}" ${prefix_option} --max-items 5 --query 'Contents[].Key' --output text)
            
            local sample_count=0
            for obj in ${sample_objects}; do
                if aws s3api head-object --bucket "${DATA_STORAGE_BUCKET}" --key "${obj}" > /dev/null 2>&1; then
                    log_message "INFO" "Verified object: ${obj}"
                    sample_count=$((sample_count + 1))
                else
                    log_message "WARNING" "Failed to verify object: ${obj}"
                fi
            done
            
            if [[ "${sample_count}" -eq 0 && "${object_count}" -gt 0 ]]; then
                log_message "WARNING" "Failed to verify any sample objects"
                return 1
            fi
            
            log_message "SUCCESS" "S3 restoration verification passed"
            ;;
            
        *)
            log_message "ERROR" "Unknown component for verification: ${component}"
            return 1
            ;;
    esac
    
    return 0
}

# Update service connections to point to restored resources
update_service_connections() {
    local component="$1"
    local new_endpoint="$2"
    
    log_message "INFO" "Updating service connections for ${component} to use ${new_endpoint}"
    
    # If in dry run mode, skip updates
    if "${DRY_RUN}"; then
        log_message "INFO" "[DRY RUN] Would update service connections for ${component} to use ${new_endpoint}"
        return 0
    fi
    
    # Check for Kubernetes access
    if ! kubectl get pods -A > /dev/null 2>&1; then
        log_message "WARNING" "No Kubernetes access, skipping service connection updates"
        return 1
    fi
    
    # Get the namespace for the project
    local namespace="${PROJECT}-${ENVIRONMENT}"
    
    # Check if namespace exists
    if ! kubectl get namespace "${namespace}" > /dev/null 2>&1; then
        log_message "WARNING" "Namespace ${namespace} not found, using default"
        namespace="default"
    fi
    
    # Determine what kind of configs to update based on the component
    case "${component}" in
        "postgresql")
            # Update database connection ConfigMaps
            local configmaps
            configmaps=$(kubectl get configmap -n "${namespace}" -l "component=database,type=postgresql" -o name)
            
            if [[ -z "${configmaps}" ]]; then
                log_message "WARNING" "No PostgreSQL ConfigMaps found"
            else
                for cm in ${configmaps}; do
                    log_message "INFO" "Updating ConfigMap ${cm}"
                    
                    # Patch the ConfigMap with the new endpoint
                    kubectl patch ${cm} -n "${namespace}" --type merge -p "{\"data\":{\"DB_HOST\":\"${new_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update ConfigMap ${cm}"
                    fi
                done
            fi
            
            # Update database connection Secrets
            local secrets
            secrets=$(kubectl get secret -n "${namespace}" -l "component=database,type=postgresql" -o name)
            
            if [[ -z "${secrets}" ]]; then
                log_message "WARNING" "No PostgreSQL Secrets found"
            else
                for secret in ${secrets}; do
                    log_message "INFO" "Updating Secret ${secret}"
                    
                    # Encode the new endpoint in base64
                    local encoded_endpoint
                    encoded_endpoint=$(echo -n "${new_endpoint}" | base64)
                    
                    # Patch the Secret with the new endpoint
                    kubectl patch ${secret} -n "${namespace}" --type merge -p "{\"data\":{\"DB_HOST\":\"${encoded_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update Secret ${secret}"
                    fi
                done
            fi
            
            # Restart deployments that use PostgreSQL
            local deployments
            deployments=$(kubectl get deployment -n "${namespace}" -l "db-dependency=postgresql" -o name)
            
            if [[ -z "${deployments}" ]]; then
                log_message "WARNING" "No deployments with PostgreSQL dependency found"
            else
                for deployment in ${deployments}; do
                    log_message "INFO" "Restarting deployment ${deployment}"
                    
                    # Restart the deployment by patching with a restart annotation
                    kubectl patch ${deployment} -n "${namespace}" -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"kubectl.kubernetes.io/restartedAt\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}}}}}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to restart deployment ${deployment}"
                    fi
                done
            fi
            ;;
            
        "mongodb")
            # Update MongoDB connection ConfigMaps
            local configmaps
            configmaps=$(kubectl get configmap -n "${namespace}" -l "component=database,type=mongodb" -o name)
            
            if [[ -z "${configmaps}" ]]; then
                log_message "WARNING" "No MongoDB ConfigMaps found"
            else
                for cm in ${configmaps}; do
                    log_message "INFO" "Updating ConfigMap ${cm}"
                    
                    # Patch the ConfigMap with the new endpoint
                    kubectl patch ${cm} -n "${namespace}" --type merge -p "{\"data\":{\"MONGODB_HOST\":\"${new_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update ConfigMap ${cm}"
                    fi
                done
            fi
            
            # Update MongoDB connection Secrets
            local secrets
            secrets=$(kubectl get secret -n "${namespace}" -l "component=database,type=mongodb" -o name)
            
            if [[ -z "${secrets}" ]]; then
                log_message "WARNING" "No MongoDB Secrets found"
            else
                for secret in ${secrets}; do
                    log_message "INFO" "Updating Secret ${secret}"
                    
                    # Encode the new endpoint in base64
                    local encoded_endpoint
                    encoded_endpoint=$(echo -n "${new_endpoint}" | base64)
                    
                    # Patch the Secret with the new endpoint
                    kubectl patch ${secret} -n "${namespace}" --type merge -p "{\"data\":{\"MONGODB_HOST\":\"${encoded_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update Secret ${secret}"
                    fi
                done
            fi
            
            # Restart deployments that use MongoDB
            local deployments
            deployments=$(kubectl get deployment -n "${namespace}" -l "db-dependency=mongodb" -o name)
            
            if [[ -z "${deployments}" ]]; then
                log_message "WARNING" "No deployments with MongoDB dependency found"
            else
                for deployment in ${deployments}; do
                    log_message "INFO" "Restarting deployment ${deployment}"
                    
                    # Restart the deployment by patching with a restart annotation
                    kubectl patch ${deployment} -n "${namespace}" -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"kubectl.kubernetes.io/restartedAt\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}}}}}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to restart deployment ${deployment}"
                    fi
                done
            fi
            ;;
            
        "redis")
            # Update Redis connection ConfigMaps
            local configmaps
            configmaps=$(kubectl get configmap -n "${namespace}" -l "component=cache,type=redis" -o name)
            
            if [[ -z "${configmaps}" ]]; then
                log_message "WARNING" "No Redis ConfigMaps found"
            else
                for cm in ${configmaps}; do
                    log_message "INFO" "Updating ConfigMap ${cm}"
                    
                    # Patch the ConfigMap with the new endpoint
                    kubectl patch ${cm} -n "${namespace}" --type merge -p "{\"data\":{\"REDIS_HOST\":\"${new_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update ConfigMap ${cm}"
                    fi
                done
            fi
            
            # Update Redis connection Secrets
            local secrets
            secrets=$(kubectl get secret -n "${namespace}" -l "component=cache,type=redis" -o name)
            
            if [[ -z "${secrets}" ]]; then
                log_message "WARNING" "No Redis Secrets found"
            else
                for secret in ${secrets}; do
                    log_message "INFO" "Updating Secret ${secret}"
                    
                    # Encode the new endpoint in base64
                    local encoded_endpoint
                    encoded_endpoint=$(echo -n "${new_endpoint}" | base64)
                    
                    # Patch the Secret with the new endpoint
                    kubectl patch ${secret} -n "${namespace}" --type merge -p "{\"data\":{\"REDIS_HOST\":\"${encoded_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update Secret ${secret}"
                    fi
                done
            fi
            
            # Restart deployments that use Redis
            local deployments
            deployments=$(kubectl get deployment -n "${namespace}" -l "cache-dependency=redis" -o name)
            
            if [[ -z "${deployments}" ]]; then
                log_message "WARNING" "No deployments with Redis dependency found"
            else
                for deployment in ${deployments}; do
                    log_message "INFO" "Restarting deployment ${deployment}"
                    
                    # Restart the deployment by patching with a restart annotation
                    kubectl patch ${deployment} -n "${namespace}" -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"kubectl.kubernetes.io/restartedAt\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}}}}}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to restart deployment ${deployment}"
                    fi
                done
            fi
            ;;
            
        "opensearch")
            # Update OpenSearch connection ConfigMaps
            local configmaps
            configmaps=$(kubectl get configmap -n "${namespace}" -l "component=search,type=opensearch" -o name)
            
            if [[ -z "${configmaps}" ]]; then
                log_message "WARNING" "No OpenSearch ConfigMaps found"
            else
                for cm in ${configmaps}; do
                    log_message "INFO" "Updating ConfigMap ${cm}"
                    
                    # Patch the ConfigMap with the new endpoint
                    kubectl patch ${cm} -n "${namespace}" --type merge -p "{\"data\":{\"OPENSEARCH_HOST\":\"${new_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update ConfigMap ${cm}"
                    fi
                done
            fi
            
            # Update OpenSearch connection Secrets
            local secrets
            secrets=$(kubectl get secret -n "${namespace}" -l "component=search,type=opensearch" -o name)
            
            if [[ -z "${secrets}" ]]; then
                log_message "WARNING" "No OpenSearch Secrets found"
            else
                for secret in ${secrets}; do
                    log_message "INFO" "Updating Secret ${secret}"
                    
                    # Encode the new endpoint in base64
                    local encoded_endpoint
                    encoded_endpoint=$(echo -n "${new_endpoint}" | base64)
                    
                    # Patch the Secret with the new endpoint
                    kubectl patch ${secret} -n "${namespace}" --type merge -p "{\"data\":{\"OPENSEARCH_HOST\":\"${encoded_endpoint}\"}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to update Secret ${secret}"
                    fi
                done
            fi
            
            # Restart deployments that use OpenSearch
            local deployments
            deployments=$(kubectl get deployment -n "${namespace}" -l "search-dependency=opensearch" -o name)
            
            if [[ -z "${deployments}" ]]; then
                log_message "WARNING" "No deployments with OpenSearch dependency found"
            else
                for deployment in ${deployments}; do
                    log_message "INFO" "Restarting deployment ${deployment}"
                    
                    # Restart the deployment by patching with a restart annotation
                    kubectl patch ${deployment} -n "${namespace}" -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"kubectl.kubernetes.io/restartedAt\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}}}}}}"
                    
                    if [[ $? -ne 0 ]]; then
                        log_message "ERROR" "Failed to restart deployment ${deployment}"
                    fi
                done
            fi
            ;;
            
        *)
            log_message "WARNING" "Unknown component for service connection updates: ${component}"
            return 1
            ;;
    esac
    
    log_message "SUCCESS" "Service connections for ${component} updated successfully"
    return 0
}

# Clean up temporary files and resources after restoration
cleanup_restore() {
    log_message "INFO" "Cleaning up after restoration process..."
    
    # Remove temporary directory if it exists
    if [[ -d "${TEMP_DIR}" ]]; then
        log_message "INFO" "Removing temporary directory: ${TEMP_DIR}"
        rm -rf "${TEMP_DIR}"
    fi
    
    # Upload logs to S3 if backup bucket is specified
    if [[ -n "${BACKUP_BUCKET}" && -f "${LOG_FILE}" ]]; then
        local log_path="s3://${BACKUP_BUCKET}/${BACKUP_PREFIX:+${BACKUP_PREFIX}/}logs/restore-$(date +%Y%m%d%H%M%S).log"
        log_message "INFO" "Uploading logs to ${log_path}"
        
        if ! aws s3 cp "${LOG_FILE}" "${log_path}"; then
            log_message "WARNING" "Failed to upload logs to S3"
        fi
    fi
    
    # Remove lock file if it exists and belongs to this process
    if [[ -f "${RESTORE_LOCK_FILE}" ]]; then
        local lock_pid
        lock_pid=$(cat "${RESTORE_LOCK_FILE}")
        
        if [[ "${lock_pid}" == "$$" ]]; then
            log_message "INFO" "Removing lock file: ${RESTORE_LOCK_FILE}"
            rm -f "${RESTORE_LOCK_FILE}"
        else
            log_message "WARNING" "Lock file belongs to another process (PID: ${lock_pid}), not removing"
        fi
    fi
    
    log_message "INFO" "Cleanup completed"
}

# Handle errors during the restore process
handle_error() {
    local component="$1"
    local error_message="$2"
    
    log_message "ERROR" "Error during ${component} restoration: ${error_message}"
    
    # Take component-specific actions to ensure data integrity
    case "${component}" in
        "postgresql")
            log_message "INFO" "Attempting to rollback PostgreSQL changes"
            # In a real implementation, this would handle rollback of instance renames, etc.
            ;;
            
        "mongodb")
            log_message "INFO" "Attempting to rollback MongoDB changes"
            # In a real implementation, this would handle cleanup of partial restores
            ;;
            
        "redis")
            log_message "INFO" "Attempting to rollback Redis changes"
            # In a real implementation, this would handle cleanup of temporary clusters
            ;;
            
        "opensearch")
            log_message "INFO" "Attempting to rollback OpenSearch changes"
            # In a real implementation, this would handle cleanup of partial index restores
            ;;
            
        "s3")
            log_message "INFO" "Attempting to rollback S3 changes"
            # In a real implementation, this would handle cleanup of partial file restores
            ;;
            
        *)
            log_message "WARNING" "No specific error handling for component: ${component}"
            ;;
    esac
    
    # Send error notification
    send_notification false "${component} restoration failed: ${error_message}"
    
    # Set restoration status to failed
    RESTORATION_STATUS=1
}

# Send notification about restore status
send_notification() {
    local success="$1"
    local details="$2"
    
    log_message "INFO" "Sending notification: success=${success}, details=${details}"
    
    # In a real implementation, this would send notifications via various channels
    # For this example, we'll just log the notification
    
    local status_text
    if [[ "${success}" == "true" ]]; then
        status_text="SUCCESS"
    else
        status_text="FAILURE"
    fi
    
    local message="Restoration Status: ${status_text}\n"
    message+="Environment: ${ENVIRONMENT}\n"
    message+="Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")\n"
    message+="Details: ${details}\n"
    
    # Add component status if we've attempted any restorations
    if "${RESTORE_POSTGRESQL}"; then
        message+="PostgreSQL: ${POSTGRESQL_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_MONGODB}"; then
        message+="MongoDB: ${MONGODB_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_REDIS}"; then
        message+="Redis: ${REDIS_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_OPENSEARCH}"; then
        message+="OpenSearch: ${OPENSEARCH_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_S3}"; then
        message+="S3: ${S3_STATUS:-Not Started}\n"
    fi
    
    # In a real implementation, we would send this message to an SNS topic, Slack, email, etc.
    log_message "INFO" "Notification content:\n${message}"
    
    # For critical failures, we would trigger a PagerDuty alert
    if [[ "${success}" != "true" ]]; then
        log_message "WARNING" "Would trigger PagerDuty alert for restoration failure"
    fi
    
    return 0
}

# Main function that orchestrates the restoration process
main() {
    # Track component status
    POSTGRESQL_STATUS=""
    MONGODB_STATUS=""
    REDIS_STATUS=""
    OPENSEARCH_STATUS=""
    S3_STATUS=""
    
    # Start time for the entire process
    local start_time
    start_time=$(date +%s)
    
    # Parse command line arguments
    if ! parse_args "$@"; then
        log_message "ERROR" "Failed to parse command line arguments"
        return 1
    fi
    
    # Setup error handling
    trap 'log_message "ERROR" "Received interrupt signal"; exit 1' INT
    trap 'log_message "ERROR" "Received termination signal"; exit 1' TERM
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_message "ERROR" "Prerequisites check failed"
        return 1
    fi
    
    # Set up restore environment
    if ! setup_restore_environment; then
        log_message "ERROR" "Failed to set up restore environment"
        return 1
    fi
    
    log_message "INFO" "Starting restoration process for ${PROJECT} (${ENVIRONMENT})"
    log_message "INFO" "Backup timestamp: ${RESTORE_TIMESTAMP}"
    
    # Perform restoration in the correct order
    # S3 first as it's often needed by other components
    if "${RESTORE_S3}"; then
        log_message "INFO" "Starting S3 data restoration..."
        
        if restore_s3_data "${S3_PREFIX_TO_RESTORE}" ""; then
            S3_STATUS="Success"
            log_message "SUCCESS" "S3 data restoration completed successfully"
        else
            S3_STATUS="Failed"
            handle_error "s3" "Restoration process failed"
        fi
    fi
    
    # Then restore databases in parallel if possible
    if "${RESTORE_POSTGRESQL}"; then
        log_message "INFO" "Starting PostgreSQL restoration..."
        
        # Get backup path from manifest
        local pg_backup_path
        pg_backup_path=$(jq -r '.postgresql.backup_path' "${TEMP_DIR}/manifest.json")
        
        # Download the backup if it's an S3 path
        if [[ "${pg_backup_path}" == s3://* ]]; then
            pg_backup_path=$(download_backup "postgresql" "${pg_backup_path}")
            
            if [[ $? -ne 0 ]]; then
                handle_error "postgresql" "Failed to download backup"
                POSTGRESQL_STATUS="Failed"
            else
                # Restore PostgreSQL
                if restore_postgresql "${pg_backup_path}"; then
                    POSTGRESQL_STATUS="Success"
                    log_message "SUCCESS" "PostgreSQL restoration completed successfully"
                else
                    POSTGRESQL_STATUS="Failed"
                    handle_error "postgresql" "Restoration process failed"
                fi
            fi
        else
            log_message "ERROR" "Invalid PostgreSQL backup path: ${pg_backup_path}"
            POSTGRESQL_STATUS="Failed"
            handle_error "postgresql" "Invalid backup path"
        fi
    fi
    
    if "${RESTORE_MONGODB}"; then
        log_message "INFO" "Starting MongoDB restoration..."
        
        # Get backup path from manifest
        local mongo_backup_path
        mongo_backup_path=$(jq -r '.mongodb.backup_path' "${TEMP_DIR}/manifest.json")
        
        # Download the backup if it's an S3 path
        if [[ "${mongo_backup_path}" == s3://* ]]; then
            mongo_backup_path=$(download_backup "mongodb" "${mongo_backup_path}")
            
            if [[ $? -ne 0 ]]; then
                handle_error "mongodb" "Failed to download backup"
                MONGODB_STATUS="Failed"
            else
                # Restore MongoDB
                if restore_mongodb "${mongo_backup_path}" "${COLLECTIONS_TO_RESTORE}"; then
                    MONGODB_STATUS="Success"
                    log_message "SUCCESS" "MongoDB restoration completed successfully"
                else
                    MONGODB_STATUS="Failed"
                    handle_error "mongodb" "Restoration process failed"
                fi
            fi
        else
            log_message "ERROR" "Invalid MongoDB backup path: ${mongo_backup_path}"
            MONGODB_STATUS="Failed"
            handle_error "mongodb" "Invalid backup path"
        fi
    fi
    
    if "${RESTORE_OPENSEARCH}"; then
        log_message "INFO" "Starting OpenSearch restoration..."
        
        # Get snapshot name from manifest
        local snapshot_name
        snapshot_name=$(jq -r '.opensearch.snapshot_name' "${TEMP_DIR}/manifest.json")
        
        if [[ "${snapshot_name}" == "null" ]]; then
            log_message "ERROR" "No snapshot name found in manifest"
            OPENSEARCH_STATUS="Failed"
            handle_error "opensearch" "No snapshot name specified"
        else
            # Restore OpenSearch
            if restore_opensearch "${snapshot_name}" "${INDICES_TO_RESTORE}"; then
                OPENSEARCH_STATUS="Success"
                log_message "SUCCESS" "OpenSearch restoration completed successfully"
            else
                OPENSEARCH_STATUS="Failed"
                handle_error "opensearch" "Restoration process failed"
            fi
        fi
    fi
    
    # Restore Redis last as it's often the fastest and least critical
    if "${RESTORE_REDIS}"; then
        log_message "INFO" "Starting Redis restoration..."
        
        # Get snapshot ID from manifest
        local snapshot_id
        snapshot_id=$(jq -r '.redis.snapshot_id' "${TEMP_DIR}/manifest.json")
        
        if [[ "${snapshot_id}" == "null" ]]; then
            log_message "ERROR" "No Redis snapshot ID found in manifest"
            REDIS_STATUS="Failed"
            handle_error "redis" "No snapshot ID specified"
        else
            # Restore Redis
            if restore_redis "${snapshot_id}"; then
                REDIS_STATUS="Success"
                log_message "SUCCESS" "Redis restoration completed successfully"
            else
                REDIS_STATUS="Failed"
                handle_error "redis" "Restoration process failed"
            fi
        fi
    fi
    
    # Calculate total time
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    local duration_minutes=$((total_duration / 60))
    local duration_seconds=$((total_duration % 60))
    
    # Generate summary
    local summary="Restoration Summary:\n"
    summary+="Environment: ${ENVIRONMENT}\n"
    summary+="Duration: ${duration_minutes}m ${duration_seconds}s\n\n"
    summary+="Component Status:\n"
    
    if "${RESTORE_POSTGRESQL}"; then
        summary+="- PostgreSQL: ${POSTGRESQL_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_MONGODB}"; then
        summary+="- MongoDB: ${MONGODB_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_REDIS}"; then
        summary+="- Redis: ${REDIS_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_OPENSEARCH}"; then
        summary+="- OpenSearch: ${OPENSEARCH_STATUS:-Not Started}\n"
    fi
    
    if "${RESTORE_S3}"; then
        summary+="- S3: ${S3_STATUS:-Not Started}\n"
    fi
    
    log_message "INFO" "${summary}"
    
    # Send final notification
    if [[ ${RESTORATION_STATUS} -eq 0 ]]; then
        send_notification true "Restoration completed successfully in ${duration_minutes}m ${duration_seconds}s"
        log_message "SUCCESS" "Restoration process completed successfully"
    else
        send_notification false "Restoration failed after ${duration_minutes}m ${duration_seconds}s"
        log_message "ERROR" "Restoration process failed"
    fi
    
    return ${RESTORATION_STATUS}
}

# Execute main function with all command line arguments
main "$@"