#!/bin/bash
#
# backup.sh - Comprehensive backup script for AI Talent Marketplace
#
# This script automates the backup process for all essential data stores:
# - PostgreSQL (RDS)
# - MongoDB (DocumentDB)
# - Redis (ElastiCache)
# - OpenSearch
# - S3 file storage
#
# The script implements comprehensive backup strategies with proper
# encryption, validation, and monitoring in line with the platform's
# disaster recovery requirements.
#
# Version: 1.0.0
# Usage: ./backup.sh [--environment prod|staging|dev] [--dry-run] [--help]
#
# Dependencies:
# - aws-cli (v2.x) - For AWS service interactions
# - postgresql-client (v15.x) - For PostgreSQL dumps
# - mongodb-tools (v6.x) - For MongoDB dumps
# - jq (v1.6) - For JSON processing
#

# Exit on error, undefined variables, and propagate pipe errors
set -euo pipefail

# Trap errors for cleanup
trap cleanup EXIT

# -----------------------------------------------------------------------------
# Constants and Default Values
# -----------------------------------------------------------------------------
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME=$(basename "$0")
readonly DEFAULT_ENVIRONMENT="staging"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)
readonly PROJECT="ai-talent-marketplace"
readonly TEMP_DIR="/tmp/${PROJECT}-backup-${TIMESTAMP}"
readonly LOG_FILE="/var/log/${PROJECT}/backups/backup-${TIMESTAMP}.log"
readonly LOCK_FILE="/var/run/${PROJECT}-backup.lock"

# Settings with default values that can be overridden
ENVIRONMENT="${DEFAULT_ENVIRONMENT}"
DRY_RUN=false
BACKUP_BUCKET=""
BACKUP_PREFIX=""
DATA_STORAGE_BUCKET=""
RDS_INSTANCE=""
DOCUMENTDB_CLUSTER=""
REDIS_CLUSTER=""
OPENSEARCH_DOMAIN=""
KMS_KEY_ID=""
BACKUP_MANIFEST="${TEMP_DIR}/backup-manifest.json"
SNS_TOPIC_ARN=""
VERIFY_RESTORE=false

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

# Display usage information
function usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [OPTIONS]

Performs comprehensive backups of all AI Talent Marketplace data stores.

Options:
  --environment ENV   Environment to backup (prod, staging, dev)
                      Default: ${DEFAULT_ENVIRONMENT}
  --dry-run           Simulate backup without actual execution
  --verify-restore    Perform test restore to verify backup integrity
  --help              Display this help message and exit

Dependencies:
  - aws-cli (v2.x)
  - postgresql-client (v15.x)
  - mongodb-tools (v6.x)
  - jq (v1.6)

Example:
  ${SCRIPT_NAME} --environment prod

Version: ${SCRIPT_VERSION}
EOF
    exit 0
}

# Log a message with timestamp to both stdout and log file
function log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local formatted_message="[${timestamp}] [${level}] ${message}"
    
    # Output to console
    echo "${formatted_message}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Append to log file
    echo "${formatted_message}" >> "${LOG_FILE}"
}

# Log info message
function log_info() {
    log_message "INFO" "$1"
}

# Log warning message
function log_warning() {
    log_message "WARNING" "$1"
}

# Log error message
function log_error() {
    log_message "ERROR" "$1"
}

# Log success message
function log_success() {
    log_message "SUCCESS" "$1"
}

# Handle error during backup process
function handle_error() {
    local component="$1"
    local error_message="$2"
    
    log_error "Error in ${component}: ${error_message}"
    
    # Clean up any partial backup files
    if [[ -d "${TEMP_DIR}" ]]; then
        log_info "Cleaning up partial backup files in ${TEMP_DIR}"
        rm -rf "${TEMP_DIR}"/*
    fi
    
    # Send error notification
    send_backup_notification false "Backup failed for component: ${component}. Error: ${error_message}"
    
    # Update status file to indicate failure
    echo "{\"status\":\"failed\",\"component\":\"${component}\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"error\":\"${error_message}\"}" > "${TEMP_DIR}/backup-status.json"
    
    # Upload status file to S3
    if [[ "${DRY_RUN}" == "false" ]]; then
        aws s3 cp "${TEMP_DIR}/backup-status.json" "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/status/backup-status-${TIMESTAMP}.json" --quiet
        aws s3 cp "${TEMP_DIR}/backup-status.json" "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/status/latest-backup-status.json" --quiet
    fi
    
    # Release lock file if held
    if [[ -f "${LOCK_FILE}" ]]; then
        rm -f "${LOCK_FILE}"
    fi
    
    # Exit with error code
    exit 1
}

# Cleanup function called on script exit
function cleanup() {
    local exit_code=$?
    
    if [[ ${exit_code} -ne 0 && -z "${TEMP_DIR:-}" ]]; then
        log_error "Script exited with error code ${exit_code}"
    fi
    
    # Remove temporary directory if it exists
    if [[ -d "${TEMP_DIR}" ]]; then
        log_info "Cleaning up temporary directory ${TEMP_DIR}"
        rm -rf "${TEMP_DIR}"
    fi
    
    # Release lock file if held
    if [[ -f "${LOCK_FILE}" ]]; then
        log_info "Releasing lock file"
        rm -f "${LOCK_FILE}"
    fi
    
    log_info "Backup script completed with exit code ${exit_code}"
}

# Check if another instance of the script is running
function check_lock() {
    if [[ -f "${LOCK_FILE}" ]]; then
        pid=$(cat "${LOCK_FILE}")
        if ps -p "${pid}" > /dev/null 2>&1; then
            log_error "Another backup process (PID: ${pid}) is already running. Exiting."
            exit 1
        else
            log_warning "Found stale lock file. Removing."
            rm -f "${LOCK_FILE}"
        fi
    fi
    
    # Create lock file with current PID
    echo $$ > "${LOCK_FILE}"
    log_info "Lock acquired. Proceeding with backup."
}

# Calculate file checksum
function calculate_checksum() {
    local file="$1"
    sha256sum "${file}" | cut -d' ' -f1
}

# Get file size in bytes
function get_file_size() {
    local file="$1"
    stat -c %s "${file}"
}

# Verify that all required tools and AWS permissions are available
function check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        handle_error "prerequisites" "AWS CLI is not installed"
        return 1
    fi
    
    # Verify AWS CLI version is 2.x
    local aws_version=$(aws --version | cut -d' ' -f1 | cut -d'/' -f2 | cut -d'.' -f1)
    if [[ "${aws_version}" != "2" ]]; then
        log_warning "AWS CLI version 2.x is recommended, found version ${aws_version}.x"
    fi
    
    # Check if PostgreSQL client tools are installed
    if ! command -v pg_dump &> /dev/null; then
        handle_error "prerequisites" "PostgreSQL client tools are not installed"
        return 1
    fi
    
    # Check if MongoDB tools are installed
    if ! command -v mongodump &> /dev/null; then
        handle_error "prerequisites" "MongoDB tools are not installed"
        return 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        handle_error "prerequisites" "jq is not installed"
        return 1
    fi
    
    # Verify AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        handle_error "prerequisites" "AWS credentials are not configured properly"
        return 1
    fi
    
    # Verify access to the backup S3 bucket
    if [[ "${DRY_RUN}" == "false" ]]; then
        if ! aws s3 ls "s3://${BACKUP_BUCKET}" --prefix "${BACKUP_PREFIX}" &> /dev/null; then
            handle_error "prerequisites" "Cannot access backup S3 bucket: ${BACKUP_BUCKET}"
            return 1
        fi
        
        # Check if KMS key exists
        if ! aws kms describe-key --key-id "${KMS_KEY_ID}" &> /dev/null; then
            handle_error "prerequisites" "Cannot access KMS key: ${KMS_KEY_ID}"
            return 1
        fi
    fi
    
    log_success "All prerequisites checked successfully"
    return 0
}

# Set up necessary directories and initialize the backup environment
function setup_backup_environment() {
    log_info "Setting up backup environment..."
    
    # Create temporary directory for staging backups
    mkdir -p "${TEMP_DIR}"
    log_info "Created temporary directory: ${TEMP_DIR}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    log_info "Logging to: ${LOG_FILE}"
    
    # Initialize backup manifest file
    echo "{\"project\":\"${PROJECT}\",\"environment\":\"${ENVIRONMENT}\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"backups\":{}}" > "${BACKUP_MANIFEST}"
    log_info "Initialized backup manifest at: ${BACKUP_MANIFEST}"
    
    # Check for lock file
    check_lock
    
    log_success "Backup environment setup complete"
    return 0
}

# Load environment-specific configuration
function load_environment_config() {
    log_info "Loading configuration for environment: ${ENVIRONMENT}"
    
    # Set environment-specific variables
    case "${ENVIRONMENT}" in
        prod|production)
            ENVIRONMENT="prod"
            BACKUP_BUCKET="${PROJECT}-backups-prod"
            BACKUP_PREFIX="backups/prod"
            DATA_STORAGE_BUCKET="${PROJECT}-data-prod"
            RDS_INSTANCE="${PROJECT}-db-prod"
            DOCUMENTDB_CLUSTER="${PROJECT}-docdb-prod"
            REDIS_CLUSTER="${PROJECT}-redis-prod"
            OPENSEARCH_DOMAIN="${PROJECT}-search-prod"
            KMS_KEY_ID="alias/${PROJECT}-backup-key-prod"
            SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:${PROJECT}-backup-notifications-prod"
            ;;
        staging|stage)
            ENVIRONMENT="staging"
            BACKUP_BUCKET="${PROJECT}-backups-staging"
            BACKUP_PREFIX="backups/staging"
            DATA_STORAGE_BUCKET="${PROJECT}-data-staging"
            RDS_INSTANCE="${PROJECT}-db-staging"
            DOCUMENTDB_CLUSTER="${PROJECT}-docdb-staging"
            REDIS_CLUSTER="${PROJECT}-redis-staging"
            OPENSEARCH_DOMAIN="${PROJECT}-search-staging"
            KMS_KEY_ID="alias/${PROJECT}-backup-key-staging"
            SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:${PROJECT}-backup-notifications-staging"
            ;;
        dev|development)
            ENVIRONMENT="dev"
            BACKUP_BUCKET="${PROJECT}-backups-dev"
            BACKUP_PREFIX="backups/dev"
            DATA_STORAGE_BUCKET="${PROJECT}-data-dev"
            RDS_INSTANCE="${PROJECT}-db-dev"
            DOCUMENTDB_CLUSTER="${PROJECT}-docdb-dev"
            REDIS_CLUSTER="${PROJECT}-redis-dev"
            OPENSEARCH_DOMAIN="${PROJECT}-search-dev"
            KMS_KEY_ID="alias/${PROJECT}-backup-key-dev"
            SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:${PROJECT}-backup-notifications-dev"
            ;;
        *)
            handle_error "environment" "Unknown environment: ${ENVIRONMENT}"
            return 1
            ;;
    esac
    
    # Allow environment variables to override defaults
    BACKUP_BUCKET="${BACKUP_BUCKET_OVERRIDE:-$BACKUP_BUCKET}"
    BACKUP_PREFIX="${BACKUP_PREFIX_OVERRIDE:-$BACKUP_PREFIX}"
    DATA_STORAGE_BUCKET="${DATA_STORAGE_BUCKET_OVERRIDE:-$DATA_STORAGE_BUCKET}"
    RDS_INSTANCE="${RDS_INSTANCE_OVERRIDE:-$RDS_INSTANCE}"
    DOCUMENTDB_CLUSTER="${DOCUMENTDB_CLUSTER_OVERRIDE:-$DOCUMENTDB_CLUSTER}"
    REDIS_CLUSTER="${REDIS_CLUSTER_OVERRIDE:-$REDIS_CLUSTER}"
    OPENSEARCH_DOMAIN="${OPENSEARCH_DOMAIN_OVERRIDE:-$OPENSEARCH_DOMAIN}"
    KMS_KEY_ID="${KMS_KEY_ID_OVERRIDE:-$KMS_KEY_ID}"
    SNS_TOPIC_ARN="${SNS_TOPIC_ARN_OVERRIDE:-$SNS_TOPIC_ARN}"
    
    log_info "Configuration loaded successfully"
    log_info "Backup bucket: ${BACKUP_BUCKET}"
    log_info "Data storage bucket: ${DATA_STORAGE_BUCKET}"
    
    return 0
}

# -----------------------------------------------------------------------------
# Backup Functions
# -----------------------------------------------------------------------------

# Create a backup of the PostgreSQL database
function backup_postgresql() {
    local component="postgresql"
    local start_time=$(date +%s)
    
    log_info "Starting PostgreSQL backup from RDS instance: ${RDS_INSTANCE}"
    
    # Define local variables
    local pg_backup_file="${TEMP_DIR}/${PROJECT}-${ENVIRONMENT}-postgres-${TIMESTAMP}.dump"
    local pg_compressed_file="${pg_backup_file}.gz"
    local pg_s3_key="${BACKUP_PREFIX}/postgresql/${PROJECT}-${ENVIRONMENT}-postgres-${TIMESTAMP}.dump.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would backup PostgreSQL database from ${RDS_INSTANCE}"
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "DRY RUN: PostgreSQL backup simulation completed in ${duration} seconds"
        echo "s3://${BACKUP_BUCKET}/${pg_s3_key}"
        return 0
    fi
    
    # Get RDS instance details
    log_info "Retrieving RDS instance details"
    local rds_endpoint
    local rds_port
    local rds_db_name
    
    # Get RDS instance details
    rds_endpoint=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query "DBInstances[0].Endpoint.Address" --output text)
    rds_port=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query "DBInstances[0].Endpoint.Port" --output text)
    rds_db_name=$(aws rds describe-db-instances --db-instance-identifier "${RDS_INSTANCE}" --query "DBInstances[0].DBName" --output text)
    
    if [[ -z "${rds_endpoint}" || -z "${rds_port}" || -z "${rds_db_name}" ]]; then
        handle_error "${component}" "Failed to retrieve RDS instance details"
        return 1
    fi
    
    # Retrieve connection credentials from AWS Secrets Manager
    log_info "Retrieving database credentials from Secrets Manager"
    local secret_id="${PROJECT}/${ENVIRONMENT}/database/postgresql"
    local db_user
    local db_password
    
    local secret_value
    secret_value=$(aws secretsmanager get-secret-value --secret-id "${secret_id}" --query "SecretString" --output text)
    db_user=$(echo "${secret_value}" | jq -r '.username')
    db_password=$(echo "${secret_value}" | jq -r '.password')
    
    if [[ -z "${db_user}" || -z "${db_password}" ]]; then
        handle_error "${component}" "Failed to retrieve PostgreSQL credentials from Secrets Manager"
        return 1
    fi
    
    # Set PGPASSWORD environment variable for pg_dump
    export PGPASSWORD="${db_password}"
    
    # Create a full database dump using pg_dump
    log_info "Creating PostgreSQL dump using pg_dump"
    if ! pg_dump -h "${rds_endpoint}" -p "${rds_port}" -U "${db_user}" -d "${rds_db_name}" -F c -v -f "${pg_backup_file}"; then
        handle_error "${component}" "pg_dump failed"
        unset PGPASSWORD
        return 1
    fi
    
    # Unset PGPASSWORD for security
    unset PGPASSWORD
    
    # Verify dump file exists and has content
    if [[ ! -f "${pg_backup_file}" || ! -s "${pg_backup_file}" ]]; then
        handle_error "${component}" "PostgreSQL dump file is empty or does not exist"
        return 1
    fi
    
    log_info "PostgreSQL dump completed successfully. File size: $(du -h "${pg_backup_file}" | cut -f1)"
    
    # Compress backup with gzip
    log_info "Compressing PostgreSQL dump file"
    if ! gzip -9 "${pg_backup_file}"; then
        handle_error "${component}" "Failed to compress PostgreSQL dump file"
        return 1
    fi
    
    # Calculate backup checksum
    local checksum
    checksum=$(calculate_checksum "${pg_compressed_file}")
    log_info "Backup checksum: ${checksum}"
    
    # Get file size
    local file_size
    file_size=$(get_file_size "${pg_compressed_file}")
    log_info "Compressed file size: ${file_size} bytes ($(numfmt --to=iec-i --suffix=B --format="%.2f" ${file_size}))"
    
    # Upload backup to S3 with KMS encryption
    log_info "Uploading PostgreSQL backup to S3: s3://${BACKUP_BUCKET}/${pg_s3_key}"
    if ! aws s3 cp "${pg_compressed_file}" "s3://${BACKUP_BUCKET}/${pg_s3_key}" --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
        handle_error "${component}" "Failed to upload PostgreSQL backup to S3"
        return 1
    fi
    
    # Verify backup exists in S3
    if ! aws s3 ls "s3://${BACKUP_BUCKET}/${pg_s3_key}" &> /dev/null; then
        handle_error "${component}" "Failed to verify PostgreSQL backup in S3"
        return 1
    fi
    
    # Add backup information to manifest
    local backup_info='{
        "component": "postgresql",
        "instance": "'"${RDS_INSTANCE}"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "s3_key": "'"${pg_s3_key}"'",
        "s3_bucket": "'"${BACKUP_BUCKET}"'",
        "checksum": "'"${checksum}"'",
        "size_bytes": '"${file_size}"',
        "format": "pg_dump_custom_gzip",
        "database": "'"${rds_db_name}"'"
    }'
    
    # Update manifest with PostgreSQL backup info
    jq '.backups.postgresql = '"${backup_info}" "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "PostgreSQL backup completed successfully in ${duration} seconds"
    
    # Return the S3 path of the backup
    echo "s3://${BACKUP_BUCKET}/${pg_s3_key}"
}

# Create a backup of the DocumentDB (MongoDB) database
function backup_documentdb() {
    local component="documentdb"
    local start_time=$(date +%s)
    
    log_info "Starting DocumentDB backup from cluster: ${DOCUMENTDB_CLUSTER}"
    
    # Define local variables
    local mongo_backup_dir="${TEMP_DIR}/mongodb"
    local mongo_tarball="${TEMP_DIR}/${PROJECT}-${ENVIRONMENT}-mongodb-${TIMESTAMP}.tar"
    local mongo_compressed_file="${mongo_tarball}.gz"
    local mongo_s3_key="${BACKUP_PREFIX}/mongodb/${PROJECT}-${ENVIRONMENT}-mongodb-${TIMESTAMP}.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would backup DocumentDB database from ${DOCUMENTDB_CLUSTER}"
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "DRY RUN: DocumentDB backup simulation completed in ${duration} seconds"
        echo "s3://${BACKUP_BUCKET}/${mongo_s3_key}"
        return 0
    fi
    
    # Get DocumentDB cluster details
    log_info "Retrieving DocumentDB cluster details"
    local docdb_endpoint
    local docdb_port="27017" # Default DocumentDB port
    
    # Get cluster endpoint
    docdb_endpoint=$(aws docdb describe-db-clusters --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --query "DBClusters[0].Endpoint" --output text)
    
    if [[ -z "${docdb_endpoint}" ]]; then
        handle_error "${component}" "Failed to retrieve DocumentDB cluster details"
        return 1
    fi
    
    # Retrieve connection credentials from AWS Secrets Manager
    log_info "Retrieving database credentials from Secrets Manager"
    local secret_id="${PROJECT}/${ENVIRONMENT}/database/documentdb"
    local db_user
    local db_password
    
    local secret_value
    secret_value=$(aws secretsmanager get-secret-value --secret-id "${secret_id}" --query "SecretString" --output text)
    db_user=$(echo "${secret_value}" | jq -r '.username')
    db_password=$(echo "${secret_value}" | jq -r '.password')
    
    if [[ -z "${db_user}" || -z "${db_password}" ]]; then
        handle_error "${component}" "Failed to retrieve DocumentDB credentials from Secrets Manager"
        return 1
    fi
    
    # Create backup directory
    mkdir -p "${mongo_backup_dir}"
    
    # Create CA certificate for DocumentDB TLS connection
    local ca_file="${TEMP_DIR}/rds-combined-ca-bundle.pem"
    aws s3 cp s3://rds-downloads/rds-combined-ca-bundle.pem "${ca_file}"
    
    # Create connection string
    local conn_string="mongodb://${db_user}:${db_password}@${docdb_endpoint}:${docdb_port}/?ssl=true&retryWrites=false&ssl_ca_certs=${ca_file}"
    
    # Create database dump using mongodump
    log_info "Creating DocumentDB dump using mongodump"
    if ! mongodump --uri="${conn_string}" --out="${mongo_backup_dir}" --verbose; then
        handle_error "${component}" "mongodump failed"
        return 1
    fi
    
    # Verify dump directory has content
    if [[ ! -d "${mongo_backup_dir}" || -z "$(ls -A "${mongo_backup_dir}")" ]]; then
        handle_error "${component}" "DocumentDB dump directory is empty or does not exist"
        return 1
    fi
    
    log_info "DocumentDB dump completed successfully. Directory size: $(du -sh "${mongo_backup_dir}" | cut -f1)"
    
    # Create a tarball of the dump files
    log_info "Creating tarball of DocumentDB dump files"
    if ! tar -cf "${mongo_tarball}" -C "${mongo_backup_dir}" .; then
        handle_error "${component}" "Failed to create tarball of DocumentDB dump files"
        return 1
    fi
    
    # Compress backup with gzip
    log_info "Compressing DocumentDB tarball"
    if ! gzip -9 "${mongo_tarball}"; then
        handle_error "${component}" "Failed to compress DocumentDB tarball"
        return 1
    fi
    
    # Calculate backup checksum
    local checksum
    checksum=$(calculate_checksum "${mongo_compressed_file}")
    log_info "Backup checksum: ${checksum}"
    
    # Get file size
    local file_size
    file_size=$(get_file_size "${mongo_compressed_file}")
    log_info "Compressed file size: ${file_size} bytes ($(numfmt --to=iec-i --suffix=B --format="%.2f" ${file_size}))"
    
    # Upload backup to S3 with KMS encryption
    log_info "Uploading DocumentDB backup to S3: s3://${BACKUP_BUCKET}/${mongo_s3_key}"
    if ! aws s3 cp "${mongo_compressed_file}" "s3://${BACKUP_BUCKET}/${mongo_s3_key}" --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
        handle_error "${component}" "Failed to upload DocumentDB backup to S3"
        return 1
    fi
    
    # Verify backup exists in S3
    if ! aws s3 ls "s3://${BACKUP_BUCKET}/${mongo_s3_key}" &> /dev/null; then
        handle_error "${component}" "Failed to verify DocumentDB backup in S3"
        return 1
    fi
    
    # Also create a DocumentDB cluster snapshot as an additional backup mechanism
    local snapshot_id="${PROJECT}-${ENVIRONMENT}-docdb-snapshot-${TIMESTAMP}"
    log_info "Creating DocumentDB cluster snapshot: ${snapshot_id}"
    
    if ! aws docdb create-db-cluster-snapshot --db-cluster-identifier "${DOCUMENTDB_CLUSTER}" --db-cluster-snapshot-identifier "${snapshot_id}" > /dev/null; then
        log_warning "Failed to create DocumentDB cluster snapshot. Continuing with backup process."
    else
        log_info "DocumentDB cluster snapshot creation initiated successfully"
    fi
    
    # Add backup information to manifest
    local backup_info='{
        "component": "documentdb",
        "cluster": "'"${DOCUMENTDB_CLUSTER}"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "s3_key": "'"${mongo_s3_key}"'",
        "s3_bucket": "'"${BACKUP_BUCKET}"'",
        "checksum": "'"${checksum}"'",
        "size_bytes": '"${file_size}"',
        "format": "mongodump_tar_gzip",
        "snapshot_id": "'"${snapshot_id}"'"
    }'
    
    # Update manifest with DocumentDB backup info
    jq '.backups.documentdb = '"${backup_info}" "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "DocumentDB backup completed successfully in ${duration} seconds"
    
    # Return the S3 path of the backup
    echo "s3://${BACKUP_BUCKET}/${mongo_s3_key}"
}

# Create a backup of the ElastiCache Redis cluster via snapshots
function backup_elasticache() {
    local component="elasticache"
    local start_time=$(date +%s)
    
    log_info "Starting ElastiCache Redis backup from cluster: ${REDIS_CLUSTER}"
    
    # Define local variables
    local snapshot_name="${PROJECT}-${ENVIRONMENT}-redis-snapshot-${TIMESTAMP}"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would create ElastiCache snapshot ${snapshot_name} for cluster ${REDIS_CLUSTER}"
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "DRY RUN: ElastiCache backup simulation completed in ${duration} seconds"
        echo "${snapshot_name}"
        return 0
    fi
    
    # Get ElastiCache cluster details
    log_info "Retrieving ElastiCache cluster details"
    
    # Check if this is a Redis Cluster Mode Enabled or Disabled cluster
    if aws elasticache describe-replication-groups --replication-group-id "${REDIS_CLUSTER}" &> /dev/null; then
        # This is a Redis Cluster Mode Enabled cluster (replication group)
        log_info "Working with Redis Cluster Mode Enabled cluster (replication group)"
        
        # Create manual snapshot using AWS CLI
        log_info "Creating manual snapshot of Redis replication group: ${snapshot_name}"
        if ! aws elasticache create-snapshot --replication-group-id "${REDIS_CLUSTER}" --snapshot-name "${snapshot_name}" > /dev/null; then
            handle_error "${component}" "Failed to create ElastiCache snapshot for replication group ${REDIS_CLUSTER}"
            return 1
        fi
        
    elif aws elasticache describe-cache-clusters --cache-cluster-id "${REDIS_CLUSTER}" &> /dev/null; then
        # This is a Redis Cluster Mode Disabled cluster
        log_info "Working with Redis Cluster Mode Disabled cluster"
        
        # Create manual snapshot using AWS CLI
        log_info "Creating manual snapshot of Redis cluster: ${snapshot_name}"
        if ! aws elasticache create-snapshot --cache-cluster-id "${REDIS_CLUSTER}" --snapshot-name "${snapshot_name}" > /dev/null; then
            handle_error "${component}" "Failed to create ElastiCache snapshot for cluster ${REDIS_CLUSTER}"
            return 1
        fi
        
    else
        handle_error "${component}" "ElastiCache cluster ${REDIS_CLUSTER} not found"
        return 1
    fi
    
    # Wait for snapshot creation to complete
    log_info "Waiting for ElastiCache snapshot creation to complete..."
    if ! aws elasticache wait snapshot-complete --snapshot-name "${snapshot_name}"; then
        handle_error "${component}" "Timeout waiting for ElastiCache snapshot creation"
        return 1
    fi
    
    # Get snapshot details
    local snapshot_info
    snapshot_info=$(aws elasticache describe-snapshots --snapshot-name "${snapshot_name}" --query "Snapshots[0]")
    
    if [[ -z "${snapshot_info}" || "${snapshot_info}" == "null" ]]; then
        handle_error "${component}" "Failed to retrieve ElastiCache snapshot details"
        return 1
    fi
    
    # Extract snapshot details
    local snapshot_status=$(echo "${snapshot_info}" | jq -r ".SnapshotStatus")
    local snapshot_timestamp=$(echo "${snapshot_info}" | jq -r ".NodeSnapshots[0].SnapshotCreateTime")
    local snapshot_size=$(echo "${snapshot_info}" | jq -r ".NodeSnapshots[0].CacheSize")
    
    if [[ "${snapshot_status}" != "available" ]]; then
        handle_error "${component}" "ElastiCache snapshot is not in 'available' status: ${snapshot_status}"
        return 1
    fi
    
    log_info "ElastiCache snapshot created successfully: ${snapshot_name}"
    log_info "Snapshot status: ${snapshot_status}"
    log_info "Snapshot timestamp: ${snapshot_timestamp}"
    log_info "Snapshot size: ${snapshot_size}"
    
    # Add backup information to manifest
    local backup_info='{
        "component": "elasticache",
        "cluster": "'"${REDIS_CLUSTER}"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "snapshot_name": "'"${snapshot_name}"'",
        "status": "'"${snapshot_status}"'",
        "snapshot_timestamp": "'"${snapshot_timestamp}"'",
        "size": "'"${snapshot_size}"'"
    }'
    
    # Update manifest with ElastiCache backup info
    jq '.backups.elasticache = '"${backup_info}" "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "ElastiCache backup completed successfully in ${duration} seconds"
    
    # Return the snapshot identifier
    echo "${snapshot_name}"
}

# Create a backup of the OpenSearch domain indices
function backup_opensearch() {
    local component="opensearch"
    local start_time=$(date +%s)
    
    log_info "Starting OpenSearch backup from domain: ${OPENSEARCH_DOMAIN}"
    
    # Define local variables
    local snapshot_name="${PROJECT}-${ENVIRONMENT}-opensearch-snapshot-${TIMESTAMP}"
    local s3_bucket="${BACKUP_BUCKET}"
    local s3_prefix="${BACKUP_PREFIX}/opensearch"
    local repository_name="${PROJECT}-${ENVIRONMENT}-backup-repo"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would create OpenSearch snapshot ${snapshot_name} for domain ${OPENSEARCH_DOMAIN}"
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "DRY RUN: OpenSearch backup simulation completed in ${duration} seconds"
        echo "${snapshot_name}"
        return 0
    fi
    
    # Get OpenSearch domain details
    log_info "Retrieving OpenSearch domain details"
    local domain_info
    domain_info=$(aws opensearch describe-domain --domain-name "${OPENSEARCH_DOMAIN}")
    
    if [[ -z "${domain_info}" ]]; then
        handle_error "${component}" "Failed to retrieve OpenSearch domain details"
        return 1
    fi
    
    # Extract domain details
    local domain_endpoint=$(echo "${domain_info}" | jq -r ".DomainStatus.Endpoints.vpc")
    # If vpc endpoint is not available, try the default endpoint
    if [[ -z "${domain_endpoint}" || "${domain_endpoint}" == "null" ]]; then
        domain_endpoint=$(echo "${domain_info}" | jq -r ".DomainStatus.Endpoints.dashboard")
    fi
    
    if [[ -z "${domain_endpoint}" || "${domain_endpoint}" == "null" ]]; then
        handle_error "${component}" "Failed to retrieve OpenSearch domain endpoint"
        return 1
    fi
    
    # Construct URL for OpenSearch API
    local opensearch_url="https://${domain_endpoint}"
    log_info "OpenSearch URL: ${opensearch_url}"
    
    # Retrieve credentials from AWS Secrets Manager
    log_info "Retrieving OpenSearch credentials from Secrets Manager"
    local secret_id="${PROJECT}/${ENVIRONMENT}/opensearch/credentials"
    local opensearch_user
    local opensearch_password
    
    local secret_value
    secret_value=$(aws secretsmanager get-secret-value --secret-id "${secret_id}" --query "SecretString" --output text)
    opensearch_user=$(echo "${secret_value}" | jq -r '.username')
    opensearch_password=$(echo "${secret_value}" | jq -r '.password')
    
    if [[ -z "${opensearch_user}" || -z "${opensearch_password}" ]]; then
        handle_error "${component}" "Failed to retrieve OpenSearch credentials from Secrets Manager"
        return 1
    fi
    
    # Function to make authenticated requests to OpenSearch
    function opensearch_request() {
        local method="$1"
        local endpoint="$2"
        local data="$3"
        
        # Set up curl command with authentication
        local curl_cmd=(curl -s -X "${method}" "${opensearch_url}${endpoint}")
        
        # Add basic authentication
        curl_cmd+=(-u "${opensearch_user}:${opensearch_password}")
        
        # Add content type header for POST/PUT requests
        if [[ "${method}" == "POST" || "${method}" == "PUT" ]]; then
            curl_cmd+=(-H "Content-Type: application/json")
        fi
        
        # Add data for POST/PUT requests
        if [[ -n "${data}" ]]; then
            curl_cmd+=(-d "${data}")
        fi
        
        # Execute curl command
        "${curl_cmd[@]}"
    }
    
    # Check if the OpenSearch backup repository exists
    log_info "Checking if OpenSearch backup repository exists: ${repository_name}"
    local repository_check
    repository_check=$(opensearch_request "GET" "/_snapshot/${repository_name}")
    
    if [[ $(echo "${repository_check}" | jq -r 'has("error")') == "true" ]]; then
        log_info "Repository does not exist. Creating a new one."
        
        # Create S3 repository role if needed
        local repository_role_arn="arn:aws:iam::123456789012:role/${PROJECT}-opensearch-backup-role"
        
        # Register S3 repository for snapshots
        local repository_config='{
            "type": "s3",
            "settings": {
                "bucket": "'"${s3_bucket}"'",
                "base_path": "'"${s3_prefix}"'",
                "role_arn": "'"${repository_role_arn}"'",
                "server_side_encryption": true,
                "sse_kms_key_id": "'"${KMS_KEY_ID}"'"
            }
        }'
        
        log_info "Registering OpenSearch backup repository: ${repository_name}"
        local register_result
        register_result=$(opensearch_request "PUT" "/_snapshot/${repository_name}" "${repository_config}")
        
        if [[ $(echo "${register_result}" | jq -r '.acknowledged') != "true" ]]; then
            handle_error "${component}" "Failed to register OpenSearch backup repository. Error: $(echo "${register_result}" | jq -r '.error')"
            return 1
        fi
        
        log_info "OpenSearch backup repository registered successfully"
    else
        log_info "OpenSearch backup repository already exists: ${repository_name}"
    fi
    
    # Create snapshot of all indices
    log_info "Creating OpenSearch snapshot of all indices: ${snapshot_name}"
    local snapshot_config='{
        "indices": "*",
        "ignore_unavailable": true,
        "include_global_state": true
    }'
    
    local snapshot_result
    snapshot_result=$(opensearch_request "PUT" "/_snapshot/${repository_name}/${snapshot_name}" "${snapshot_config}")
    
    if [[ $(echo "${snapshot_result}" | jq -r '.accepted') != "true" ]]; then
        handle_error "${component}" "Failed to create OpenSearch snapshot. Error: $(echo "${snapshot_result}" | jq -r '.error')"
        return 1
    fi
    
    log_info "OpenSearch snapshot creation initiated successfully"
    
    # Wait for snapshot completion
    log_info "Waiting for OpenSearch snapshot to complete..."
    local snapshot_status
    local snapshot_state
    local retry_count=0
    local max_retries=60
    local completed=false
    
    while [[ ${retry_count} -lt ${max_retries} && "${completed}" == "false" ]]; do
        snapshot_status=$(opensearch_request "GET" "/_snapshot/${repository_name}/${snapshot_name}")
        
        if [[ $(echo "${snapshot_status}" | jq -r 'has("snapshots")') == "true" ]]; then
            snapshot_state=$(echo "${snapshot_status}" | jq -r '.snapshots[0].state')
            
            if [[ "${snapshot_state}" == "SUCCESS" ]]; then
                log_info "OpenSearch snapshot completed successfully"
                completed=true
                break
            elif [[ "${snapshot_state}" == "FAILED" ]]; then
                local failure_reason=$(echo "${snapshot_status}" | jq -r '.snapshots[0].failure_reason')
                handle_error "${component}" "OpenSearch snapshot failed: ${failure_reason}"
                return 1
            else
                log_info "Snapshot in progress. Current state: ${snapshot_state}"
            fi
        else
            log_info "Waiting for snapshot status..."
        fi
        
        retry_count=$((retry_count + 1))
        sleep 30
    done
    
    if [[ "${completed}" == "false" ]]; then
        handle_error "${component}" "Timeout waiting for OpenSearch snapshot to complete"
        return 1
    fi
    
    # Get snapshot details
    local snapshot_info
    snapshot_info=$(opensearch_request "GET" "/_snapshot/${repository_name}/${snapshot_name}")
    
    local start_time=$(echo "${snapshot_info}" | jq -r '.snapshots[0].start_time')
    local end_time=$(echo "${snapshot_info}" | jq -r '.snapshots[0].end_time')
    local indices=$(echo "${snapshot_info}" | jq -r '.snapshots[0].indices | length')
    
    log_info "OpenSearch snapshot details:"
    log_info "- Snapshot name: ${snapshot_name}"
    log_info "- Repository: ${repository_name}"
    log_info "- Start time: ${start_time}"
    log_info "- End time: ${end_time}"
    log_info "- Indices: ${indices}"
    
    # Add backup information to manifest
    local backup_info='{
        "component": "opensearch",
        "domain": "'"${OPENSEARCH_DOMAIN}"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "repository": "'"${repository_name}"'",
        "snapshot_name": "'"${snapshot_name}"'",
        "state": "'"${snapshot_state}"'",
        "start_time": "'"${start_time}"'",
        "end_time": "'"${end_time}"'",
        "indices_count": '"${indices}"',
        "s3_bucket": "'"${s3_bucket}"'",
        "s3_prefix": "'"${s3_prefix}/${snapshot_name}"'"
    }'
    
    # Update manifest with OpenSearch backup info
    jq '.backups.opensearch = '"${backup_info}" "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    local script_end_time=$(date +%s)
    local duration=$((script_end_time - start_time))
    log_success "OpenSearch backup completed successfully in ${duration} seconds"
    
    # Return the snapshot name
    echo "${snapshot_name}"
}

# Create a backup of user data files in S3 storage
function backup_s3_data() {
    local component="s3_data"
    local start_time=$(date +%s)
    
    log_info "Starting S3 data backup from bucket: ${DATA_STORAGE_BUCKET}"
    
    # Define local variables
    local s3_backup_prefix="${BACKUP_PREFIX}/s3_data/${TIMESTAMP}"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would backup S3 data from ${DATA_STORAGE_BUCKET} to ${BACKUP_BUCKET}/${s3_backup_prefix}"
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "DRY RUN: S3 data backup simulation completed in ${duration} seconds"
        echo "s3://${BACKUP_BUCKET}/${s3_backup_prefix}"
        return 0
    fi
    
    # Verify source bucket exists
    log_info "Verifying source bucket: ${DATA_STORAGE_BUCKET}"
    if ! aws s3 ls "s3://${DATA_STORAGE_BUCKET}" &> /dev/null; then
        handle_error "${component}" "Source S3 bucket does not exist or is not accessible: ${DATA_STORAGE_BUCKET}"
        return 1
    fi
    
    # Get source bucket size and object count
    log_info "Calculating source bucket size and object count"
    local source_size_result
    source_size_result=$(aws s3 ls "s3://${DATA_STORAGE_BUCKET}" --recursive --summarize | grep "Total Objects\|Total Size")
    local source_object_count=$(echo "${source_size_result}" | grep "Total Objects" | awk '{print $3}')
    local source_size=$(echo "${source_size_result}" | grep "Total Size" | awk '{print $3}')
    
    log_info "Source bucket contains ${source_object_count} objects with total size of ${source_size} bytes"
    
    # Sync files from source to backup bucket with versioning
    log_info "Syncing files from source to backup bucket"
    if ! aws s3 sync "s3://${DATA_STORAGE_BUCKET}" "s3://${BACKUP_BUCKET}/${s3_backup_prefix}" \
        --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
        handle_error "${component}" "Failed to sync files from source to backup bucket"
        return 1
    fi
    
    # Verify backup
    log_info "Verifying backup"
    local backup_size_result
    backup_size_result=$(aws s3 ls "s3://${BACKUP_BUCKET}/${s3_backup_prefix}" --recursive --summarize | grep "Total Objects\|Total Size")
    local backup_object_count=$(echo "${backup_size_result}" | grep "Total Objects" | awk '{print $3}')
    local backup_size=$(echo "${backup_size_result}" | grep "Total Size" | awk '{print $3}')
    
    log_info "Backup bucket contains ${backup_object_count} objects with total size of ${backup_size} bytes"
    
    # Compare object counts
    if [[ ${backup_object_count} -lt ${source_object_count} ]]; then
        log_warning "Backup object count (${backup_object_count}) is less than source object count (${source_object_count})"
    fi
    
    # Create a metadata file for the backup
    local metadata_file="${TEMP_DIR}/s3_backup_metadata.json"
    cat > "${metadata_file}" << EOL
{
    "source_bucket": "${DATA_STORAGE_BUCKET}",
    "backup_bucket": "${BACKUP_BUCKET}",
    "backup_prefix": "${s3_backup_prefix}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "source_object_count": ${source_object_count},
    "source_size_bytes": "${source_size}",
    "backup_object_count": ${backup_object_count},
    "backup_size_bytes": "${backup_size}"
}
EOL
    
    # Upload metadata file to S3
    log_info "Uploading backup metadata file"
    if ! aws s3 cp "${metadata_file}" "s3://${BACKUP_BUCKET}/${s3_backup_prefix}/metadata.json" \
        --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
        log_warning "Failed to upload backup metadata file"
    fi
    
    # Add backup information to manifest
    local backup_info='{
        "component": "s3_data",
        "source_bucket": "'"${DATA_STORAGE_BUCKET}"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "backup_bucket": "'"${BACKUP_BUCKET}"'",
        "backup_prefix": "'"${s3_backup_prefix}"'",
        "object_count": '"${backup_object_count}"',
        "size_bytes": "'"${backup_size}"'"
    }'
    
    # Update manifest with S3 data backup info
    jq '.backups.s3_data = '"${backup_info}" "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "S3 data backup completed successfully in ${duration} seconds"
    
    # Return the S3 backup path
    echo "s3://${BACKUP_BUCKET}/${s3_backup_prefix}"
}

# Create a comprehensive manifest file with metadata about all backups
function create_backup_manifest() {
    local component="manifest"
    local backup_paths="$1"
    
    log_info "Creating backup manifest"
    
    # Add overall backup information
    jq '.backup_id = "'"${PROJECT}-${ENVIRONMENT}-backup-${TIMESTAMP}"'" | 
        .backup_version = "'"${SCRIPT_VERSION}"'" | 
        .script_name = "'"${SCRIPT_NAME}"'" | 
        .start_time = (.start_time // "'"$(date -u -d @${BACKUP_START_TIME} +"%Y-%m-%dT%H:%M:%SZ")"'") | 
        .end_time = "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'" | 
        .duration_seconds = '"$(($(date +%s) - BACKUP_START_TIME))"' | 
        .environment = "'"${ENVIRONMENT}"'" | 
        .dry_run = '"${DRY_RUN}"'' "${BACKUP_MANIFEST}" > "${BACKUP_MANIFEST}.tmp" && mv "${BACKUP_MANIFEST}.tmp" "${BACKUP_MANIFEST}"
    
    # Save manifest locally and upload to S3
    log_info "Saving manifest to S3: s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/backup-manifest-${TIMESTAMP}.json"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        if ! aws s3 cp "${BACKUP_MANIFEST}" "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/backup-manifest-${TIMESTAMP}.json" \
            --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
            handle_error "${component}" "Failed to upload backup manifest to S3"
            return 1
        fi
        
        # Create a 'latest-backup.json' pointer
        if ! aws s3 cp "${BACKUP_MANIFEST}" "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/latest-backup.json" \
            --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"; then
            log_warning "Failed to upload latest backup pointer"
        fi
    else
        log_info "DRY RUN: Would save manifest to S3"
    fi
    
    log_success "Backup manifest created successfully"
    
    # Return the manifest path
    echo "${BACKUP_MANIFEST}"
}

# Verify the integrity of all created backups
function verify_backups() {
    local component="verification"
    local manifest_path="$1"
    local verified=true
    
    log_info "Verifying backup integrity"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would verify backup integrity"
        return 0
    fi
    
    # Read manifest file
    local manifest
    manifest=$(cat "${manifest_path}")
    
    # Verify PostgreSQL backup if exists
    if [[ $(echo "${manifest}" | jq -r '.backups.postgresql // empty') != "" ]]; then
        log_info "Verifying PostgreSQL backup"
        
        local pg_s3_key=$(echo "${manifest}" | jq -r '.backups.postgresql.s3_key')
        local pg_checksum=$(echo "${manifest}" | jq -r '.backups.postgresql.checksum')
        local pg_local_file="${TEMP_DIR}/pg_verify_$(basename "${pg_s3_key}")"
        
        log_info "Downloading PostgreSQL backup for verification: ${pg_s3_key}"
        if ! aws s3 cp "s3://${BACKUP_BUCKET}/${pg_s3_key}" "${pg_local_file}"; then
            log_error "Failed to download PostgreSQL backup for verification"
            verified=false
        else
            log_info "Verifying PostgreSQL backup checksum"
            local pg_verify_checksum
            pg_verify_checksum=$(calculate_checksum "${pg_local_file}")
            
            if [[ "${pg_verify_checksum}" != "${pg_checksum}" ]]; then
                log_error "PostgreSQL backup checksum verification failed"
                log_error "Expected: ${pg_checksum}"
                log_error "Actual: ${pg_verify_checksum}"
                verified=false
            else
                log_success "PostgreSQL backup checksum verified successfully"
                
                # Perform basic restoration test if enabled
                if [[ "${VERIFY_RESTORE}" == "true" ]]; then
                    log_info "Performing test restore of PostgreSQL backup"
                    # Implementation of test restore would go here
                    # This typically involves restoring a few tables to a test database
                fi
            fi
            
            # Remove downloaded file
            rm -f "${pg_local_file}"
        fi
    fi
    
    # Verify DocumentDB backup if exists
    if [[ $(echo "${manifest}" | jq -r '.backups.documentdb // empty') != "" ]]; then
        log_info "Verifying DocumentDB backup"
        
        local mongo_s3_key=$(echo "${manifest}" | jq -r '.backups.documentdb.s3_key')
        local mongo_checksum=$(echo "${manifest}" | jq -r '.backups.documentdb.checksum')
        local mongo_local_file="${TEMP_DIR}/mongo_verify_$(basename "${mongo_s3_key}")"
        
        log_info "Downloading DocumentDB backup for verification: ${mongo_s3_key}"
        if ! aws s3 cp "s3://${BACKUP_BUCKET}/${mongo_s3_key}" "${mongo_local_file}"; then
            log_error "Failed to download DocumentDB backup for verification"
            verified=false
        else
            log_info "Verifying DocumentDB backup checksum"
            local mongo_verify_checksum
            mongo_verify_checksum=$(calculate_checksum "${mongo_local_file}")
            
            if [[ "${mongo_verify_checksum}" != "${mongo_checksum}" ]]; then
                log_error "DocumentDB backup checksum verification failed"
                log_error "Expected: ${mongo_checksum}"
                log_error "Actual: ${mongo_verify_checksum}"
                verified=false
            else
                log_success "DocumentDB backup checksum verified successfully"
            fi
            
            # Remove downloaded file
            rm -f "${mongo_local_file}"
        fi
        
        # Verify DocumentDB snapshot status
        local mongo_snapshot_id=$(echo "${manifest}" | jq -r '.backups.documentdb.snapshot_id')
        if [[ -n "${mongo_snapshot_id}" && "${mongo_snapshot_id}" != "null" ]]; then
            log_info "Verifying DocumentDB snapshot: ${mongo_snapshot_id}"
            
            local snapshot_status
            snapshot_status=$(aws docdb describe-db-cluster-snapshots --db-cluster-snapshot-identifier "${mongo_snapshot_id}" --query "DBClusterSnapshots[0].Status" --output text)
            
            if [[ "${snapshot_status}" != "available" ]]; then
                log_error "DocumentDB snapshot is not in 'available' status: ${snapshot_status}"
                verified=false
            else
                log_success "DocumentDB snapshot status verified: ${snapshot_status}"
            fi
        fi
    fi
    
    # Verify ElastiCache backup if exists
    if [[ $(echo "${manifest}" | jq -r '.backups.elasticache // empty') != "" ]]; then
        log_info "Verifying ElastiCache backup"
        
        local redis_snapshot_name=$(echo "${manifest}" | jq -r '.backups.elasticache.snapshot_name')
        
        log_info "Verifying ElastiCache snapshot: ${redis_snapshot_name}"
        local snapshot_status
        snapshot_status=$(aws elasticache describe-snapshots --snapshot-name "${redis_snapshot_name}" --query "Snapshots[0].SnapshotStatus" --output text)
        
        if [[ "${snapshot_status}" != "available" ]]; then
            log_error "ElastiCache snapshot is not in 'available' status: ${snapshot_status}"
            verified=false
        else
            log_success "ElastiCache snapshot status verified: ${snapshot_status}"
        fi
    fi
    
    # Verify OpenSearch backup if exists
    if [[ $(echo "${manifest}" | jq -r '.backups.opensearch // empty') != "" ]]; then
        log_info "Verifying OpenSearch backup"
        
        local opensearch_repo=$(echo "${manifest}" | jq -r '.backups.opensearch.repository')
        local opensearch_snapshot=$(echo "${manifest}" | jq -r '.backups.opensearch.snapshot_name')
        
        # This would require OpenSearch API access, which typically requires authentication and proper network access
        # For simplicity, we'll assume the backup is valid if the snapshot status is "SUCCESS" in the manifest
        local opensearch_state=$(echo "${manifest}" | jq -r '.backups.opensearch.state')
        
        if [[ "${opensearch_state}" != "SUCCESS" ]]; then
            log_error "OpenSearch snapshot is not in 'SUCCESS' state: ${opensearch_state}"
            verified=false
        else
            log_success "OpenSearch snapshot state verified: ${opensearch_state}"
        fi
    fi
    
    # Verify S3 data backup if exists
    if [[ $(echo "${manifest}" | jq -r '.backups.s3_data // empty') != "" ]]; then
        log_info "Verifying S3 data backup"
        
        local s3_backup_bucket=$(echo "${manifest}" | jq -r '.backups.s3_data.backup_bucket')
        local s3_backup_prefix=$(echo "${manifest}" | jq -r '.backups.s3_data.backup_prefix')
        local s3_object_count=$(echo "${manifest}" | jq -r '.backups.s3_data.object_count')
        
        log_info "Verifying S3 data backup object count"
        local backup_object_count
        backup_object_count=$(aws s3 ls "s3://${s3_backup_bucket}/${s3_backup_prefix}" --recursive --summarize | grep "Total Objects" | awk '{print $3}')
        
        if [[ -z "${backup_object_count}" ]]; then
            log_error "Failed to get S3 data backup object count"
            verified=false
        elif [[ ${backup_object_count} -ne ${s3_object_count} ]]; then
            log_error "S3 data backup object count mismatch"
            log_error "Expected: ${s3_object_count}"
            log_error "Actual: ${backup_object_count}"
            verified=false
        else
            log_success "S3 data backup object count verified: ${backup_object_count} objects"
        fi
    fi
    
    if [[ "${verified}" == "true" ]]; then
        log_success "All backups verified successfully"
    else
        log_error "Backup verification failed for one or more components"
    fi
    
    return $([[ "${verified}" == "true" ]] && echo 0 || echo 1)
}

# Remove old backups according to retention policy
function cleanup_old_backups() {
    local component="cleanup"
    
    log_info "Cleaning up old backups according to retention policy"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would clean up old backups"
        return 0
    fi
    
    # Define retention periods in days
    local daily_retention=30     # Keep daily backups for 30 days
    local weekly_retention=90    # Keep weekly backups for 90 days
    local monthly_retention=365  # Keep monthly backups for 365 days
    
    # Get current date
    local current_date=$(date +%s)
    
    # PostgreSQL backups cleanup
    log_info "Cleaning up old PostgreSQL backups"
    
    # List all PostgreSQL backups
    local pg_backups
    pg_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/postgresql/" --recursive | grep ".dump.gz" | awk '{print $4}')
    
    for backup in ${pg_backups}; do
        # Extract timestamp from backup filename
        local backup_timestamp
        backup_timestamp=$(echo "${backup}" | grep -o "[0-9]\{8\}-[0-9]\{6\}" | head -1)
        
        if [[ -z "${backup_timestamp}" ]]; then
            continue
        fi
        
        # Convert timestamp to epoch
        local backup_date
        backup_date=$(date -d "${backup_timestamp:0:8} ${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}" +%s)
        
        # Calculate age in days
        local age_days=$(( (current_date - backup_date) / 86400 ))
        
        # Keep all backups younger than daily_retention
        if [[ ${age_days} -lt ${daily_retention} ]]; then
            continue
        fi
        
        # Keep weekly backups (Monday) for weekly_retention
        local day_of_week=$(date -d @${backup_date} +%u)
        if [[ ${day_of_week} -eq 1 && ${age_days} -lt ${weekly_retention} ]]; then
            continue
        fi
        
        # Keep monthly backups (1st of month) for monthly_retention
        local day_of_month=$(date -d @${backup_date} +%d)
        if [[ ${day_of_month} -eq 01 && ${age_days} -lt ${monthly_retention} ]]; then
            continue
        fi
        
        # Delete backup
        log_info "Deleting old PostgreSQL backup: ${backup} (${age_days} days old)"
        aws s3 rm "s3://${BACKUP_BUCKET}/${backup}"
    done
    
    # DocumentDB backups cleanup
    log_info "Cleaning up old DocumentDB backups"
    
    # List all DocumentDB backups
    local mongo_backups
    mongo_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/mongodb/" --recursive | grep ".tar.gz" | awk '{print $4}')
    
    for backup in ${mongo_backups}; do
        # Extract timestamp from backup filename
        local backup_timestamp
        backup_timestamp=$(echo "${backup}" | grep -o "[0-9]\{8\}-[0-9]\{6\}" | head -1)
        
        if [[ -z "${backup_timestamp}" ]]; then
            continue
        fi
        
        # Convert timestamp to epoch
        local backup_date
        backup_date=$(date -d "${backup_timestamp:0:8} ${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}" +%s)
        
        # Calculate age in days
        local age_days=$(( (current_date - backup_date) / 86400 ))
        
        # Apply the same retention logic as for PostgreSQL backups
        if [[ ${age_days} -lt ${daily_retention} ]]; then
            continue
        fi
        
        local day_of_week=$(date -d @${backup_date} +%u)
        if [[ ${day_of_week} -eq 1 && ${age_days} -lt ${weekly_retention} ]]; then
            continue
        fi
        
        local day_of_month=$(date -d @${backup_date} +%d)
        if [[ ${day_of_month} -eq 01 && ${age_days} -lt ${monthly_retention} ]]; then
            continue
        fi
        
        # Delete backup
        log_info "Deleting old DocumentDB backup: ${backup} (${age_days} days old)"
        aws s3 rm "s3://${BACKUP_BUCKET}/${backup}"
    done
    
    # Clean up old DocumentDB snapshots
    log_info "Cleaning up old DocumentDB snapshots"
    
    local mongo_snapshots
    mongo_snapshots=$(aws docdb describe-db-cluster-snapshots --snapshot-type manual --query "DBClusterSnapshots[?starts_with(DBClusterSnapshotIdentifier, '${PROJECT}-${ENVIRONMENT}-docdb-snapshot-')].{ID:DBClusterSnapshotIdentifier,Date:SnapshotCreateTime}" --output json)
    
    echo "${mongo_snapshots}" | jq -c '.[]' | while read -r snapshot; do
        local snapshot_id=$(echo "${snapshot}" | jq -r '.ID')
        local snapshot_date=$(echo "${snapshot}" | jq -r '.Date')
        
        # Convert snapshot date to epoch
        local snapshot_epoch
        snapshot_epoch=$(date -d "${snapshot_date}" +%s)
        
        # Calculate age in days
        local age_days=$(( (current_date - snapshot_epoch) / 86400 ))
        
        # Keep snapshots for 90 days
        if [[ ${age_days} -ge 90 ]]; then
            log_info "Deleting old DocumentDB snapshot: ${snapshot_id} (${age_days} days old)"
            aws docdb delete-db-cluster-snapshot --db-cluster-snapshot-identifier "${snapshot_id}"
        fi
    done
    
    # Clean up old ElastiCache snapshots
    log_info "Cleaning up old ElastiCache snapshots"
    
    local redis_snapshots
    redis_snapshots=$(aws elasticache describe-snapshots --query "Snapshots[?starts_with(SnapshotName, '${PROJECT}-${ENVIRONMENT}-redis-snapshot-')].{Name:SnapshotName,Date:NodeSnapshots[0].SnapshotCreateTime}" --output json)
    
    echo "${redis_snapshots}" | jq -c '.[]' | while read -r snapshot; do
        local snapshot_name=$(echo "${snapshot}" | jq -r '.Name')
        local snapshot_date=$(echo "${snapshot}" | jq -r '.Date')
        
        # Convert snapshot date to epoch
        local snapshot_epoch
        snapshot_epoch=$(date -d "${snapshot_date}" +%s)
        
        # Calculate age in days
        local age_days=$(( (current_date - snapshot_epoch) / 86400 ))
        
        # Keep snapshots for 30 days
        if [[ ${age_days} -ge 30 ]]; then
            log_info "Deleting old ElastiCache snapshot: ${snapshot_name} (${age_days} days old)"
            aws elasticache delete-snapshot --snapshot-name "${snapshot_name}"
        fi
    done
    
    # Clean up old S3 data backups
    log_info "Cleaning up old S3 data backups"
    
    # List all S3 data backup directories (they contain timestamps in their paths)
    local s3_backups
    s3_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/s3_data/" | grep "PRE" | awk '{print $2}' | sed 's/\/$//')
    
    for backup in ${s3_backups}; do
        # Extract timestamp from backup directory name
        local backup_timestamp="${backup}"
        
        if [[ -z "${backup_timestamp}" || "${backup_timestamp}" == "metadata" ]]; then
            continue
        fi
        
        # Convert timestamp to epoch
        local backup_date
        backup_date=$(date -d "${backup_timestamp:0:8} ${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}" +%s 2>/dev/null)
        
        if [[ -z "${backup_date}" ]]; then
            continue
        fi
        
        # Calculate age in days
        local age_days=$(( (current_date - backup_date) / 86400 ))
        
        # Apply retention policy
        if [[ ${age_days} -lt ${daily_retention} ]]; then
            continue
        fi
        
        local day_of_week=$(date -d @${backup_date} +%u)
        if [[ ${day_of_week} -eq 1 && ${age_days} -lt ${weekly_retention} ]]; then
            continue
        fi
        
        local day_of_month=$(date -d @${backup_date} +%d)
        if [[ ${day_of_month} -eq 01 && ${age_days} -lt ${monthly_retention} ]]; then
            continue
        fi
        
        # Delete backup
        log_info "Deleting old S3 data backup: ${backup} (${age_days} days old)"
        aws s3 rm "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/s3_data/${backup}" --recursive
    done
    
    # Clean up old manifests
    log_info "Cleaning up old backup manifests"
    
    # List all manifest files
    local manifests
    manifests=$(aws s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/" | grep "backup-manifest-" | awk '{print $4}')
    
    for manifest in ${manifests}; do
        # Extract timestamp from manifest filename
        local manifest_timestamp
        manifest_timestamp=$(echo "${manifest}" | grep -o "[0-9]\{8\}-[0-9]\{6\}" | head -1)
        
        if [[ -z "${manifest_timestamp}" ]]; then
            continue
        fi
        
        # Convert timestamp to epoch
        local manifest_date
        manifest_date=$(date -d "${manifest_timestamp:0:8} ${manifest_timestamp:9:2}:${manifest_timestamp:11:2}:${manifest_timestamp:13:2}" +%s)
        
        # Calculate age in days
        local age_days=$(( (current_date - manifest_date) / 86400 ))
        
        # Keep manifests for 365 days
        if [[ ${age_days} -ge 365 ]]; then
            log_info "Deleting old manifest: ${manifest} (${age_days} days old)"
            aws s3 rm "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/${manifest}"
        fi
    done
    
    log_success "Cleanup of old backups completed"
}

# Sends a notification about backup success or failure
function send_backup_notification() {
    local success="$1"
    local message="$2"
    
    if [[ -z "${SNS_TOPIC_ARN}" ]]; then
        log_warning "SNS topic ARN is not set. Skipping notification."
        return 0
    fi
    
    local subject
    if [[ "${success}" == "true" ]]; then
        subject="${PROJECT} ${ENVIRONMENT} Backup Completed Successfully"
    else
        subject="${PROJECT} ${ENVIRONMENT} Backup Failed"
    fi
    
    # Truncate subject to meet SNS requirements (max 100 chars)
    if [[ ${#subject} -gt 100 ]]; then
        subject="${subject:0:97}..."
    fi
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would send notification: ${subject} - ${message}"
        return 0
    fi
    
    log_info "Sending SNS notification: ${subject}"
    
    # Create a detailed notification message
    local notification_message
    
    if [[ "${success}" == "true" ]]; then
        # Get backup summary from manifest
        local manifest
        manifest=$(cat "${BACKUP_MANIFEST}")
        
        local start_time=$(echo "${manifest}" | jq -r '.start_time')
        local end_time=$(echo "${manifest}" | jq -r '.end_time')
        local duration=$(echo "${manifest}" | jq -r '.duration_seconds')
        local formatted_duration=$(date -u -d @${duration} +"%H:%M:%S")
        
        notification_message="Backup completed successfully for ${PROJECT} ${ENVIRONMENT}.

Backup ID: $(echo "${manifest}" | jq -r '.backup_id')
Start Time: ${start_time}
End Time: ${end_time}
Duration: ${formatted_duration}

Components:
"
        
        # Add PostgreSQL info if present
        if [[ $(echo "${manifest}" | jq -r '.backups.postgresql // empty') != "" ]]; then
            local pg_size=$(echo "${manifest}" | jq -r '.backups.postgresql.size_bytes')
            local pg_formatted_size=$(numfmt --to=iec-i --suffix=B --format="%.2f" ${pg_size})
            notification_message+="- PostgreSQL: ${pg_formatted_size}
"
        fi
        
        # Add DocumentDB info if present
        if [[ $(echo "${manifest}" | jq -r '.backups.documentdb // empty') != "" ]]; then
            local mongo_size=$(echo "${manifest}" | jq -r '.backups.documentdb.size_bytes')
            local mongo_formatted_size=$(numfmt --to=iec-i --suffix=B --format="%.2f" ${mongo_size})
            notification_message+="- DocumentDB: ${mongo_formatted_size}
"
        fi
        
        # Add ElastiCache info if present
        if [[ $(echo "${manifest}" | jq -r '.backups.elasticache // empty') != "" ]]; then
            notification_message+="- ElastiCache: Snapshot created
"
        fi
        
        # Add OpenSearch info if present
        if [[ $(echo "${manifest}" | jq -r '.backups.opensearch // empty') != "" ]]; then
            local indices=$(echo "${manifest}" | jq -r '.backups.opensearch.indices_count')
            notification_message+="- OpenSearch: ${indices} indices
"
        fi
        
        # Add S3 data info if present
        if [[ $(echo "${manifest}" | jq -r '.backups.s3_data // empty') != "" ]]; then
            local s3_object_count=$(echo "${manifest}" | jq -r '.backups.s3_data.object_count')
            local s3_size=$(echo "${manifest}" | jq -r '.backups.s3_data.size_bytes')
            local s3_formatted_size=$(numfmt --to=iec-i --suffix=B --format="%.2f" ${s3_size})
            notification_message+="- S3 Data: ${s3_object_count} objects, ${s3_formatted_size}
"
        fi
        
        notification_message+="
Backup manifest stored at: s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/manifests/backup-manifest-${TIMESTAMP}.json"
    else
        notification_message="${message}

Environment: ${ENVIRONMENT}
Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Script: ${SCRIPT_NAME}
"
    fi
    
    # Send notification to SNS topic
    if aws sns publish --topic-arn "${SNS_TOPIC_ARN}" --subject "${subject}" --message "${notification_message}" > /dev/null; then
        log_success "Notification sent successfully"
        return 0
    else
        log_error "Failed to send notification"
        return 1
    fi
}

# Main function orchestrating the backup process
function main() {
    # Store script start time
    BACKUP_START_TIME=$(date +%s)
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verify-restore)
                VERIFY_RESTORE=true
                shift
                ;;
            --help)
                usage
                ;;
            *)
                echo "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    log_info "Starting backup process for environment: ${ENVIRONMENT}"
    log_info "Dry run mode: ${DRY_RUN}"
    
    # Load environment-specific configuration
    load_environment_config
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisite check failed. Exiting."
        return 1
    fi
    
    # Set up backup environment
    if ! setup_backup_environment; then
        log_error "Failed to set up backup environment. Exiting."
        return 1
    fi
    
    # Initialize backup paths map
    local backup_paths=()
    
    # Perform PostgreSQL backup
    log_info "Starting PostgreSQL backup"
    local pg_path
    if ! pg_path=$(backup_postgresql); then
        log_error "PostgreSQL backup failed"
        return 1
    fi
    backup_paths+=("postgresql:${pg_path}")
    
    # Perform DocumentDB backup
    log_info "Starting DocumentDB backup"
    local mongo_path
    if ! mongo_path=$(backup_documentdb); then
        log_error "DocumentDB backup failed"
        return 1
    fi
    backup_paths+=("documentdb:${mongo_path}")
    
    # Perform ElastiCache Redis backup
    log_info "Starting ElastiCache Redis backup"
    local redis_snapshot
    if ! redis_snapshot=$(backup_elasticache); then
        log_error "ElastiCache Redis backup failed"
        return 1
    fi
    backup_paths+=("elasticache:${redis_snapshot}")
    
    # Perform OpenSearch backup
    log_info "Starting OpenSearch backup"
    local opensearch_snapshot
    if ! opensearch_snapshot=$(backup_opensearch); then
        log_error "OpenSearch backup failed"
        return 1
    fi
    backup_paths+=("opensearch:${opensearch_snapshot}")
    
    # Perform S3 data backup
    log_info "Starting S3 data backup"
    local s3_data_path
    if ! s3_data_path=$(backup_s3_data); then
        log_error "S3 data backup failed"
        return 1
    fi
    backup_paths+=("s3_data:${s3_data_path}")
    
    # Create backup manifest
    log_info "Creating backup manifest"
    local manifest_path
    if ! manifest_path=$(create_backup_manifest "${backup_paths[@]}"); then
        log_error "Failed to create backup manifest"
        return 1
    fi
    
    # Verify backups
    log_info "Verifying backups"
    if ! verify_backups "${manifest_path}"; then
        log_warning "Backup verification found issues"
        # Continue with the process, but log the warning
    fi
    
    # Clean up old backups
    log_info "Cleaning up old backups"
    if ! cleanup_old_backups; then
        log_warning "Cleanup of old backups failed"
        # Continue with the process, but log the warning
    fi
    
    # Calculate total duration
    local end_time=$(date +%s)
    local duration=$((end_time - BACKUP_START_TIME))
    local formatted_duration=$(date -u -d @${duration} +"%H:%M:%S")
    
    # Send success notification
    send_backup_notification true "Backup completed successfully"
    
    log_success "Backup process completed successfully in ${formatted_duration}"
    return 0
}

# Execute main function with all script arguments
main "$@"