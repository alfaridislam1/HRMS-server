#!/bin/bash
# RDS PostgreSQL Backup Script
# Creates automated backups and verifies restore capability

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hrms_prod}"
DB_USER="${DB_USER:-hrms_user}"
S3_BUCKET="${S3_BUCKET:-hrms-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
AWS_REGION="${AWS_REGION:-ap-south-1}"

# Timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="rds_backup_${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_PATH="/tmp/${BACKUP_FILE}"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
S3_PATH="s3://${S3_BUCKET}/rds-backups/${COMPRESSED_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Install AWS CLI."
        exit 1
    fi
    
    if ! command -v gzip &> /dev/null; then
        error "gzip not found."
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    export PGPASSWORD="${DB_PASSWORD}"
    
    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --verbose \
        > "${BACKUP_PATH}" 2>&1
    
    if [ $? -ne 0 ]; then
        error "Backup creation failed"
        exit 1
    fi
    
    # Compress backup
    log "Compressing backup..."
    gzip -f "${BACKUP_PATH}"
    
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
    log "Backup created: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
}

# Upload backup to S3
upload_to_s3() {
    log "Uploading backup to S3..."
    
    aws s3 cp "${BACKUP_PATH}.gz" "${S3_PATH}" \
        --region "${AWS_REGION}" \
        --storage-class STANDARD_IA \
        --metadata "db-name=${DB_NAME},timestamp=${TIMESTAMP}"
    
    if [ $? -ne 0 ]; then
        error "S3 upload failed"
        exit 1
    fi
    
    log "Backup uploaded to ${S3_PATH}"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    # Download and decompress
    TEMP_DIR=$(mktemp -d)
    aws s3 cp "${S3_PATH}" "${TEMP_DIR}/${COMPRESSED_FILE}" --region "${AWS_REGION}"
    gunzip "${TEMP_DIR}/${COMPRESSED_FILE}"
    
    # Check if SQL file is valid
    if grep -q "PostgreSQL database dump" "${TEMP_DIR}/${BACKUP_FILE}"; then
        log "Backup integrity verified"
        rm -rf "${TEMP_DIR}"
        return 0
    else
        error "Backup integrity check failed"
        rm -rf "${TEMP_DIR}"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than ${BACKUP_RETENTION_DAYS} days)..."
    
    aws s3 ls "s3://${S3_BUCKET}/rds-backups/" --region "${AWS_REGION}" | \
        while read -r line; do
            BACKUP_DATE=$(echo "$line" | awk '{print $1" "$2}')
            BACKUP_NAME=$(echo "$line" | awk '{print $4}')
            
            if [ -n "$BACKUP_NAME" ]; then
                BACKUP_EPOCH=$(date -d "$BACKUP_DATE" +%s 2>/dev/null || echo 0)
                CURRENT_EPOCH=$(date +%s)
                AGE_DAYS=$(( (CURRENT_EPOCH - BACKUP_EPOCH) / 86400 ))
                
                if [ $AGE_DAYS -gt $BACKUP_RETENTION_DAYS ]; then
                    log "Deleting old backup: ${BACKUP_NAME}"
                    aws s3 rm "s3://${S3_BUCKET}/rds-backups/${BACKUP_NAME}" --region "${AWS_REGION}"
                fi
            fi
        done
    
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting RDS backup process..."
    
    check_prerequisites
    create_backup
    upload_to_s3
    
    if verify_backup; then
        log "Backup verification successful"
    else
        error "Backup verification failed - backup may be corrupted"
        exit 1
    fi
    
    cleanup_old_backups
    
    log "Backup process completed successfully"
    log "Backup location: ${S3_PATH}"
}

# Run main function
main "$@"
