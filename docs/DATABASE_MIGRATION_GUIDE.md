# APIWatch Database Migration & Schema Evolution Guide

This guide establishes the production procedures for managing, migrating, and optimizing the **PostgreSQL** database used by APIWatch via **Prisma ORM**.

---

## 1. Development vs Production Workflow

| Operation | Development Environment | Production Environment |
| :--- | :--- | :--- |
| **Command** | `pnpm prisma migrate dev` | `pnpm prisma migrate deploy` |
| **Interactivity** | Prompts for migration name, creates SQL files | Completely non-interactive, fails on drift |
| **Shadow Database** | Automatically creates temporary shadow DB | Does **not** touch or create shadow DB |
| **Schema Drift Check**| Allowed; prompts to reset database if diverged | **Strictly forbidden**; aborts if uncommitted SQL found |

> [!WARNING]
> **Never run `prisma migrate dev` or `prisma db push` against a production database.** It will result in downtime or unintended data loss. Always use `pnpm prisma migrate deploy`.

---

## 2. Standard Production Migration Procedure

When rolling out changes that include database modifications:

### Step 1: Pre-Deployment Backup
Always execute an on-demand database backup before running any migrations:
```bash
cd /opt/apiwatch
./scripts/backup.sh
```

### Step 2: Deploy Pending Migrations
Run the deployment command:
```bash
pnpm prisma migrate deploy
```
Expected output:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "apiwatch", schema "public" at "postgres:5432"

1 migration found in prisma/migrations

Applying migration `20261110_add_performance_indexes`

The following migration has been applied:
- 20261110_add_performance_indexes

All migrations have been successfully applied.
```

### Step 3: Verify Migration Status
Verify all migrations are marked as applied in the Prisma migrations table:
```bash
pnpm prisma migrate status
```
Expected: `Database schema is up to date!`

---

## 3. Zero-Downtime Migration Patterns

Because APIWatch operates as a 24/7 monitoring engine, database migrations must not lock tables or break running web/worker processes. Follow the **Expand and Contract pattern**:

### Rule 1: Adding Columns
- **Always** provide a `@default(...)` or make new columns optional (`?`).
- **Never** add a `NOT NULL` column without a default value, as existing rows will cause migration failure.

### Rule 2: Renaming Columns
- Never rename a column directly with `ALTER TABLE RENAME COLUMN`.
- Phase 1 (Expand): Add the new column, write to both old and new columns.
- Phase 2 (Backfill): Backfill existing rows with data from the old column.
- Phase 3 (Contract): Update all readers to use the new column, then drop the old column in a subsequent release.

### Rule 3: Creating Indexes
- Heavy tables like `CheckResult` can contain millions of rows.
- Prisma applies standard `CREATE INDEX` during `migrate deploy`. On massive production tables (>10M rows), consider manually applying `CREATE INDEX CONCURRENTLY` in PostgreSQL to prevent read/write locks:
  ```sql
  CREATE INDEX CONCURRENTLY "idx_check_results_endpoint_checked" 
  ON "CheckResult" ("endpointId", "checkedAt" DESC);
  ```

---

## 4. Resolving Failed Migrations

If a migration fails halfway (e.g. network timeout or lock timeout):

1. **Check Status**:
   ```bash
   pnpm prisma migrate status
   ```
2. **Diagnose**:
   Inspect the PostgreSQL server logs to identify the failing SQL statement.
3. **Resolve**:
   - If the SQL was manually completed:
     ```bash
     pnpm prisma migrate resolve --applied "20261110_add_performance_indexes"
     ```
   - If the migration needs to be rolled back and retried:
     ```bash
     pnpm prisma migrate resolve --rolled-back "20261110_add_performance_indexes"
     ```

---

## 5. Connection Pooling & Resource Sizing

In `DATABASE_URL`, configure explicit connection limits to prevent PostgreSQL socket exhaustion:

```dotenv
DATABASE_URL="postgresql://user:pass@host:5432/apiwatch?schema=public&connection_limit=25&pool_timeout=10"
```

### Recommended Pool Allocation
- **Web App (Next.js)**: 15 pooled connections.
- **Background Worker (BullMQ)**: 10 pooled connections.
- **PostgreSQL `max_connections` setting**: Recommended minimum `100`.

---

## 6. Point-in-Time Recovery (PITR) & Restore Runbook

To restore the database from a compressed backup archive:

```bash
cd /opt/apiwatch
./scripts/restore.sh backups/apiwatch_db_20261110_020000.sql.gz
```

The restore script:
1. Prompts for manual confirmation before making any changes.
2. Terminates active database connections.
3. Drops and recreates the target database.
4. Streams the decompressed SQL dump directly into `psql`.
5. Verifies schema integrity via `prisma migrate status`.
