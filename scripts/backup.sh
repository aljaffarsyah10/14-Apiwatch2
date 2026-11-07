#!/bin/sh
set -e

# ==============================================================================
# APIWatch Production Automated Database Backup Script
# ==============================================================================
# Recommended Cron Schedule (daily at 02:00 AM UTC):
# 0 2 * * * /opt/apiwatch/scripts/backup.sh >> /var/log/apiwatch-backup.log 2>&1
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/opt/apiwatch/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/apiwatch_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting APIWatch database backup..."

# Extract credentials safely from Docker Compose environment
POSTGRES_USER=$(docker compose exec -T postgres sh -c 'echo "$POSTGRES_USER"' | tr -d '\r')
POSTGRES_DB=$(docker compose exec -T postgres sh -c 'echo "$POSTGRES_DB"' | tr -d '\r')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "[ERROR] Failed to query database user/database from container."
    exit 1
fi

# Run pg_dump securely via Docker socket and pipe directly through gzip
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip -9 > "$BACKUP_FILE"

# Restrict file permissions
chmod 600 "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Prune old backups older than RETENTION_DAYS
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "apiwatch_db_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup workflow complete."
