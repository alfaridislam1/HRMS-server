#!/bin/bash
# S3 Backup Verification Script
# Verifies S3 bucket backups and tests restore capability

set -euo pipefail

# Configuration
S3_BUCKET="${S3_BUCKET:-hrms-documents-prod}"
BACKUP_BUCKET="${BACKUP_BUCKET:-hrms-backups}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
VERIFY_INTEGRITY="${VERIFY_INTEGRITY:-true}"

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

# Create S3 backup
backup_s3_bucket() {
    log "Creating S3 bucket backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PREFIX="s3-backups/${S3_BUCKET}/${TIMESTAMP}/"
    
    # Sync bucket contents
    aws s3 sync \
        "s3://${S3_BUCKET}/" \
        "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}" \
        --region "${AWS_REGION}" \
        --storage-class STANDARD_IA \
        --delete
    
    if [ $? -eq 0 ]; then
        log "S3 backup created: ${BACKUP_PREFIX}"
        echo "${BACKUP_PREFIX}"
    else
        error "S3 backup failed"
        exit 1
    fi
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_prefix="$1"
    
    log "Verifying backup integrity..."
    
    # Get list of objects in source bucket
    SOURCE_OBJECTS=$(aws s3 ls "s3://${S3_BUCKET}/" --recursive --region "${AWS_REGION}" | awk '{print $4}')
    BACKUP_OBJECTS=$(aws s3 ls "s3://${BACKUP_BUCKET}/${backup_prefix}" --recursive --region "${AWS_REGION}" | awk '{print $4}' | sed "s|^${backup_prefix}||")
    
    SOURCE_COUNT=$(echo "${SOURCE_OBJECTS}" | wc -l)
    BACKUP_COUNT=$(echo "${BACKUP_OBJECTS}" | wc -l)
    
    if [ "${SOURCE_COUNT}" -eq "${BACKUP_COUNT}" ]; then
        log "Object count matches: ${SOURCE_COUNT} objects"
    else
        error "Object count mismatch: source=${SOURCE_COUNT}, backup=${BACKUP_COUNT}"
        return 1
    fi
    
    # Verify checksums for critical files
    if [ "${VERIFY_INTEGRITY}" = "true" ]; then
        log "Verifying file checksums..."
        VERIFIED=0
        FAILED=0
        
        while IFS= read -r object; do
            if [ -n "${object}" ]; then
                SOURCE_ETAG=$(aws s3api head-object \
                    --bucket "${S3_BUCKET}" \
                    --key "${object}" \
                    --region "${AWS_REGION}" \
                    --query 'ETag' \
                    --output text 2>/dev/null)
                
                BACKUP_ETAG=$(aws s3api head-object \
                    --bucket "${BACKUP_BUCKET}" \
                    --key "${backup_prefix}${object}" \
                    --region "${AWS_REGION}" \
                    --query 'ETag' \
                    --output text 2>/dev/null)
                
                if [ "${SOURCE_ETAG}" = "${BACKUP_ETAG}" ]; then
                    VERIFIED=$((VERIFIED + 1))
                else
                    FAILED=$((FAILED + 1))
                    warn "Checksum mismatch for: ${object}"
                fi
            fi
        done <<< "${SOURCE_OBJECTS}"
        
        log "Checksum verification: ${VERIFIED} verified, ${FAILED} failed"
        
        if [ "${FAILED}" -gt 0 ]; then
            error "Backup integrity check failed"
            return 1
        fi
    fi
    
    log "Backup integrity verified"
    return 0
}

# Test restore capability
test_restore() {
    local backup_prefix="$1"
    local test_prefix="restore-test/$(date +%Y%m%d_%H%M%S)/"
    
    log "Testing restore capability..."
    
    # Restore a sample file to test location
    SAMPLE_FILE=$(aws s3 ls "s3://${BACKUP_BUCKET}/${backup_prefix}" --recursive --region "${AWS_REGION}" | head -1 | awk '{print $4}' | sed "s|^${backup_prefix}||")
    
    if [ -z "${SAMPLE_FILE}" ]; then
        warn "No files found in backup to test restore"
        return 0
    fi
    
    aws s3 cp \
        "s3://${BACKUP_BUCKET}/${backup_prefix}${SAMPLE_FILE}" \
        "s3://${BACKUP_BUCKET}/${test_prefix}${SAMPLE_FILE}" \
        --region "${AWS_REGION}"
    
    if [ $? -eq 0 ]; then
        log "Restore test successful"
        
        # Cleanup test restore
        aws s3 rm "s3://${BACKUP_BUCKET}/${test_prefix}" --recursive --region "${AWS_REGION}"
        return 0
    else
        error "Restore test failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    RETENTION_DAYS=30
    CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d 2>/dev/null || echo "")
    
    if [ -z "${CUTOFF_DATE}" ]; then
        warn "Could not calculate cutoff date, skipping cleanup"
        return
    fi
    
    aws s3 ls "s3://${BACKUP_BUCKET}/s3-backups/${S3_BUCKET}/" --region "${AWS_REGION}" | \
        while read -r line; do
            BACKUP_DATE=$(echo "$line" | awk '{print $1}' | tr -d '/')
            BACKUP_NAME=$(echo "$line" | awk '{print $2}' | tr -d '/')
            
            if [ -n "${BACKUP_NAME}" ] && [ "${BACKUP_DATE}" \< "${CUTOFF_DATE}" ]; then
                log "Deleting old backup: ${BACKUP_NAME}"
                aws s3 rm "s3://${BACKUP_BUCKET}/s3-backups/${S3_BUCKET}/${BACKUP_NAME}" --recursive --region "${AWS_REGION}"
            fi
        done
    
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting S3 backup verification process..."
    
    BACKUP_PREFIX=$(backup_s3_bucket)
    
    if verify_backup_integrity "${BACKUP_PREFIX}"; then
        if test_restore "${BACKUP_PREFIX}"; then
            log "S3 backup verification successful"
        else
            error "Restore test failed"
            exit 1
        fi
    else
        error "Backup integrity check failed"
        exit 1
    fi
    
    cleanup_old_backups
    
    log "S3 backup process completed successfully"
    log "Backup location: s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}"
}

main "$@"
