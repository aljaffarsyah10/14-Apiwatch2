#!/bin/sh
set -e

# ==============================================================================
# APIWatch Production Database Restore Script
# ==============================================================================
# Usage:
#   ./scripts/restore.sh /opt/apiwatch/backups/apiwatch_db_20261107_020000.sql.gz
# ==============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz> [--force]"
    exit 1
fi

BACKUP_FILE="$1"
FORCE="$2"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERROR] Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "========================================================================"
echo "⚠️  WARNING: You are about to restore the database from:"
echo "   $BACKUP_FILE"
echo "   This will overwrite existing tables and records in APIWatch."
echo "========================================================================"

if [ "$FORCE" != "--force" ]; then
    printf "Are you sure you want to proceed? (yes/no): "
    read -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore operation cancelled."
        exit 0
    fi
fi

POSTGRES_USER=$(docker compose exec -T postgres sh -c 'echo "$POSTGRES_USER"' | tr -d '\r')
POSTGRES_DB=$(docker compose exec -T postgres sh -c 'echo "$POSTGRES_DB"' | tr -d '\r')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "[ERROR] Failed to query database user/database from container."
    exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring database..."

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database restore completed successfully."
echo "Running Prisma migrations check..."
docker compose run --rm migration
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Migration verification passed."
