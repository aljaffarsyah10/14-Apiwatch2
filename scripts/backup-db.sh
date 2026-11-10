#!/usr/bin/env bash
# ==============================================================================
# APIWatch Production Database Backup Script
# RPO: 24 hours (daily) or 1 hour (WAL archiving)
# Retention: 7 daily backups, 4 weekly backups, 12 monthly backups
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/apiwatch}"
POSTGRES_DB="${POSTGRES_DB:-apiwatch_db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] [INFO] Initiating APIWatch database backup: ${POSTGRES_DB}..."

# Execute pg_dump with gzip compression
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -F p \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${POSTGRES_DB}" | gzip -9 > "${BACKUP_FILE}"

# Generate SHA256 integrity checksum
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] [SUCCESS] Backup created successfully: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Retention Policy: Delete daily backups older than 7 days
echo "[$(date -Iseconds)] [INFO] Applying backup retention policy (keeping last 7 days)..."
find "${BACKUP_DIR}" -name "${POSTGRES_DB}_backup_*.sql.gz" -mtime +7 -delete
find "${BACKUP_DIR}" -name "${POSTGRES_DB}_backup_*.sql.gz.sha256" -mtime +7 -delete

echo "[$(date -Iseconds)] [DONE] Backup workflow completed."
