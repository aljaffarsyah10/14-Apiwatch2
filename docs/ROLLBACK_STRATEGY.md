# APIWatch Production Rollback & Disaster Recovery Strategy

This document establishes the official standard operating procedure (SOP) for executing rollbacks and emergency disaster recovery for the **APIWatch Platform**.

---

## 1. Rollback Decision Matrix

Execute an emergency rollback immediately if any of the following critical triggers occur within **15 minutes** of deployment:

| Severity | Trigger Condition | Diagnostic Indicator | Action |
| :--- | :--- | :--- | :--- |
| **P0 - Catastrophic** | Web service 502/503 for > 3 consecutive minutes | `/api/health?probe=ready` returns 503 | Full Application Rollback |
| **P0 - Security** | SSRF sandbox bypass or token leakage detected | Alert Manager or Auth log flags | Immediate Container Teardown |
| **P1 - Data Loss** | DB migration fails or locks active query transactions | PostgreSQL `pg_stat_activity` lock spike | Migration Rollback / Restore |
| **P1 - Functional** | HTTP probe checks failing across all monitored endpoints | BullMQ worker stalled / Redis down | Worker Container Rollback |

---

## 2. Emergency Rollback Playbooks

### Playbook A: Application-Only Fast Rollback (< 2 Minutes)
Use this procedure when a new code release contains an unhandled exception or memory leak, but the database schema is intact.

```bash
# 1. SSH into the production server
ssh deploy@apiwatch.example.com
cd /opt/apiwatch

# 2. Identify the previous stable release commit or git tag
git log --oneline -n 5

# 3. Checkout previous stable commit (e.g., tag v1.9.0 or commit hash)
git checkout v1.9.0

# 4. Rebuild and restart web and worker containers with zero database downtime
docker compose build web worker
docker compose up -d --no-deps web worker

# 5. Run smoke test suite to verify restoration of health
node scripts/smoke-test.mjs https://apiwatch.example.com
```

---

### Playbook B: Database Schema Rollback (< 5 Minutes)
Use this procedure when a database migration fails or introduces breaking schema inconsistencies.

```bash
cd /opt/apiwatch

# 1. Inspect the migration status
pnpm prisma migrate status

# 2. If a migration is marked as failed or diverged:
pnpm prisma migrate resolve --rolled-back "<FAILED_MIGRATION_NAME>"

# 3. If tables or columns require physical reconstruction, restore from pre-deploy backup:
./scripts/restore.sh backups/pre_deploy_backup.sql.gz --force

# 4. Re-verify schema consistency
pnpm prisma migrate status
```

---

### Playbook C: Full Disaster Recovery (Catastrophic Data Loss)
Use this procedure if the PostgreSQL volume is corrupted or host storage is compromised.

```bash
cd /opt/apiwatch

# 1. Stop web and worker traffic to prevent dirty writes
docker compose stop web worker

# 2. Identify the latest validated backup archive
LATEST_BACKUP=$(ls -t backups/apiwatch_db_*.sql.gz | head -1)
echo "Restoring from: $LATEST_BACKUP"

# 3. Execute automated database restoration
./scripts/restore.sh "$LATEST_BACKUP" --force

# 4. Flush Redis queue stale jobs to avoid processing stale probe cycles
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" flushdb

# 5. Restart full stack
docker compose up -d

# 6. Verify health probes
curl -s http://localhost:3000/api/health?probe=ready | jq .
```

---

## 3. Maintenance Mode / Circuit Breaker (Caddy)

If the web containers need extended downtime for recovery, Caddy can immediately serve an offline maintenance notice:

1. Edit `/etc/caddy/Caddyfile` or pass maintenance rewrite:
   ```caddy
   {$DOMAIN:localhost} {
       respond "APIWatch is undergoing scheduled maintenance. Services will resume shortly." 503
   }
   ```
2. Reload Caddy configuration instantly without dropping connections:
   ```bash
   docker compose exec proxy caddy reload --config /etc/caddy/Caddyfile
   ```

---

## 4. Post-Rollback Procedure & Root Cause Analysis (RCA)

Following any production rollback:
1. **Preserve Logs**: Export all container logs before restarting:
   ```bash
   docker compose logs web > /tmp/incident_web_$(date +%s).log
   docker compose logs worker > /tmp/incident_worker_$(date +%s).log
   ```
2. **Post-Mortem**: Document the incident within 24 hours:
   - Root cause description
   - Detection time (MTTD) and Recovery time (MTTR)
   - Preventative actions and unit/integration tests to be added
