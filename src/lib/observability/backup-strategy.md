# APIWatch Database Backup & Disaster Recovery Strategy

## 1. Objectives & SLAs
- **Recovery Point Objective (RPO)**: $\le 24$ hours for cold daily dumps; $\le 1$ hour when continuous WAL archiving is active.
- **Recovery Time Objective (RTO)**: $\le 30$ minutes to spin up a replacement PostgreSQL instance and restore full dataset.

## 2. Automated Backup Schedule
- **Daily Full Backup**: Runs at `02:00 UTC` daily using `scripts/backup-db.sh`.
- **Retention Schedule**:
  - Daily: Stored for 7 days
  - Weekly: Stored for 4 weeks (every Sunday)
  - Monthly: Stored for 12 months (first day of month)

## 3. Security & Integrity Verification
1. **Compression**: Backups are compressed with gzip (`-9` maximum compression).
2. **Checksum**: Every archive produces a companion `.sha256` checksum file to guarantee data integrity before restoration.
3. **Offsite Replication**: For production, sync backup files to S3-compatible cold storage:
   ```bash
   aws s3 sync /var/backups/apiwatch s3://apiwatch-cold-backups/db/ --sse AES256
   ```

## 4. Disaster Recovery & Restoration Runbook
To restore a backup into a new or recovered database:

```bash
# 1. Verify file checksum
sha256sum -c apiwatch_db_backup_20261110_020000.sql.gz.sha256

# 2. Decompress and restore schema & data
gunzip -c apiwatch_db_backup_20261110_020000.sql.gz | psql -h localhost -U postgres -d apiwatch_db

# 3. Re-index and vacuum analyze
psql -h localhost -U postgres -d apiwatch_db -c "VACUUM ANALYZE;"

# 4. Run application healthcheck
curl http://localhost:3000/api/health
```
