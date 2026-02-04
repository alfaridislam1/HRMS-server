#!/bin/bash
# RDS PostgreSQL Restore Script
# Restores database from S3 backup with verification

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hrms_prod}"
DB_USER="${DB_USER:-hrms_user}"
S3_BUCKET="${S3_BUCKET:-hrms-backups}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
BACKUP_FILE="${1:-}"  # Pass backup filename as argument

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# List available backups
list_backups() {
    log "Available backups:"
    aws s3 ls "s3://${S3_BUCKET}/rds-backups/" --region "${AWS_REGION}" | \
        awk '{print $4}' | grep "\.sql\.gz$" | sort -r | head -10
}

# Download backup from S3
download_backup() {
    if [ -z "${BACKUP_FILE}" ]; then
        error "Backup filename required"
        echo "Usage: $0 <backup-filename.sql.gz>"
        echo ""
        list_backups
        exit 1
    fi
    
    S3_PATH="s3://${S3_BUCKET}/rds-backups/${BACKUP_FILE}"
    TEMP_DIR=$(mktemp -d)
    DOWNLOADED_FILE="${TEMP_DIR}/${BACKUP_FILE}"
    
    log "Downloading backup from S3..."
    aws s3 cp "${S3_PATH}" "${DOWNLOADED_FILE}" --region "${AWS_REGION}"
    
    if [ $? -ne 0 ]; then
        error "Failed to download backup"
        exit 1
    fi
    
    log "Backup downloaded"
    echo "${DOWNLOADED_FILE}"
}

# Restore database
restore_database() {
    local backup_file="$1"
    local temp_dir=$(dirname "${backup_file}")
    local sql_file="${temp_dir}/restore.sql"
    
    log "Decompressing backup..."
    gunzip -c "${backup_file}" > "${sql_file}"
    
    log "Restoring database..."
    warn "This will DROP and RECREATE the database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "${confirm}" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    export PGPASSWORD="${DB_PASSWORD}"
    
    # Drop and recreate database
    psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
        -c "CREATE DATABASE ${DB_NAME};"
    
    # Restore from backup
    psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${sql_file}" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log "Database restored successfully"
    else
        error "Database restore failed"
        exit 1
    fi
    
    # Cleanup
    rm -rf "${temp_dir}"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    export PGPASSWORD="${DB_PASSWORD}"
    
    # Check if database exists and has tables
    TABLE_COUNT=$(psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        2>/dev/null | tr -d ' ')
    
    if [ -n "${TABLE_COUNT}" ] && [ "${TABLE_COUNT}" -gt 0 ]; then
        log "Restore verification successful: ${TABLE_COUNT} tables found"
        return 0
    else
        error "Restore verification failed: No tables found"
        return 1
    fi
}

# Main execution
main() {
    log "Starting RDS restore process..."
    
    if [ -z "${BACKUP_FILE}" ]; then
        list_backups
        exit 0
    fi
    
    BACKUP_PATH=$(download_backup)
    restore_database "${BACKUP_PATH}"
    
    if verify_restore; then
        log "Restore process completed successfully"
    else
        error "Restore verification failed"
        exit 1
    fi
}

main "$@"
