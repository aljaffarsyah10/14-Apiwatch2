# APIWatch Production Deployment Checklist

Before going live with APIWatch in a production environment, complete and verify each item in this checklist.

---

## Pre-Flight Verification Matrix

| Category | Item | Verification Command / Target | Status |
| :--- | :--- | :--- | :--- |
| **Code & Build** | All unit & integration tests pass | `pnpm test` (Zero regressions) | [ ] |
| **Code & Build** | Zero ESLint errors or warnings | `pnpm run lint` | [ ] |
| **Code & Build** | Production build compiles cleanly | `pnpm run build` | [ ] |
| **Security** | Strong 32-byte hex `AUTH_SECRET` | `openssl rand -hex 32` | [ ] |
| **Security** | Strong 32-byte hex `ENCRYPTION_KEY` | `openssl rand -hex 32` | [ ] |
| **Security** | DB & Redis passwords rotated | Generated 24+ char hex passwords | [ ] |
| **Security** | Host firewall denies internal DB/Redis ports | `sudo ufw status` (Only 22, 80, 443 allowed) | [ ] |
| **Security** | HTTPS / TLS 1.3 automated via Caddy | `curl -I https://yourdomain.com` (HSTS active) | [ ] |
| **Database** | Migrations executed in order | `pnpm prisma migrate deploy` | [ ] |
| **Database** | Composite performance indexes present | Verified in `schema.prisma` | [ ] |
| **Background Worker** | BullMQ worker container running | `docker compose logs worker` | [ ] |
| **Backups** | Automated daily backup cron configured | `crontab -l` includes `scripts/backup.sh` | [ ] |
| **Backups** | Test database restore drill executed | `scripts/restore.sh` verified on staging | [ ] |
| **Observability** | Deep readiness probe operational | `curl -s https://yourdomain.com/api/health?probe=ready` | [ ] |
| **Observability** | Prometheus metrics endpoint scrapable | `curl -s https://yourdomain.com/api/metrics` | [ ] |
| **Observability** | Outage webhook alerts tested | Trigger test alert in Settings tab | [ ] |
| **SEO & Public** | `sitemap.xml` and `robots.txt` live | `curl -s https://yourdomain.com/robots.txt` | [ ] |
| **SEO & Public** | Open Graph image renders | `curl -I https://yourdomain.com/opengraph-image` | [ ] |

---

## 1. Secrets & Environment Configuration

- [ ] Ensure `.env` has permissions `600` (`chmod 600 .env`) and is owned by the deployment user.
- [ ] Confirm `NODE_ENV=production` is set.
- [ ] Verify `AUTH_SECRET` and `ENCRYPTION_KEY` are distinct, cryptographically random 64-character hex strings:
  ```bash
  # Check length (must be 64 characters)
  echo -n $AUTH_SECRET | wc -c
  echo -n $ENCRYPTION_KEY | wc -c
  ```
- [ ] Set `SESSION_COOKIE_NAME="__Host-apiwatch_session"` for production cookie prefix security.
- [ ] Ensure `APP_URL` uses `https://` and matches the canonical production domain.

---

## 2. Infrastructure & Network Isolation

- [ ] **Docker Bridge Network**: Verify `docker-compose.yml` isolates `postgres` and `redis` inside `apiwatch_internal` without exposing port bindings `5432:5432` or `6379:6379` to the host.
- [ ] **Firewall**: Ensure UFW only allows ports `22` (SSH), `80` (HTTP), and `443` (HTTPS):
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] **DNS Records**: Verify root domain `@` or subdomain `A` record points to the public IPv4 address with TTL 300s during deployment.

---

## 3. Database Migration & Schema Integrity

- [ ] Execute production migrations without prompts:
  ```bash
  pnpm prisma migrate deploy
  ```
- [ ] Check migration status:
  ```bash
  pnpm prisma migrate status
  ```
- [ ] Verify composite query indexes are applied for fast SLA queries:
  - `idx_check_results_endpoint_checked` on `CheckResult(endpointId, checkedAt)`
  - `idx_incidents_workspace_status` on `Incident(workspaceId, status)`
  - `idx_endpoints_workspace_paused` on `Endpoint(workspaceId, isPaused)`

---

## 4. Background Worker & Queue Concurrency

- [ ] Verify Redis is active with authentication enabled:
  ```bash
  docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
  # Expected: PONG
  ```
- [ ] Verify the monitoring worker boots and joins the BullMQ cluster:
  ```bash
  docker compose logs worker --tail=50
  # Expected: "Monitoring worker started with concurrency: 10"
  ```
- [ ] Ensure worker container has restart policy `restart: always` or `unless-stopped`.

---

## 5. Automated Backups & Disaster Recovery

- [ ] Verify `scripts/backup.sh` exists and is executable (`chmod +x scripts/backup.sh`).
- [ ] Run a manual backup to confirm archive creation:
  ```bash
  ./scripts/backup.sh
  ls -lh backups/
  ```
- [ ] Configure daily cronjob at 02:00 AM:
  ```cron
  0 2 * * * cd /opt/apiwatch && ./scripts/backup.sh >> /var/log/apiwatch-backup.log 2>&1
  ```
- [ ] If using cloud storage, configure AWS S3 / Cloudflare R2 credentials in `.env` to automatically synchronize dumps off-site.

---

## 6. Observability, Health Checks & Alerting

- [ ] **Deep Readiness Check**:
  ```bash
  curl -s https://yourdomain.com/api/health?probe=ready | jq .
  ```
  Ensure `services.database` and `services.redis` return `"connected"`.
- [ ] **Prometheus Metrics**:
  ```bash
  curl -s https://yourdomain.com/api/metrics | head -n 20
  ```
- [ ] **SRE Webhook Alerts**:
  Send a test webhook alert from `/settings` to verify your Discord/Slack integration is receiving notifications.

---

## 7. Post-Deployment Smoke Test (5-Minute Run)

1. Access the web interface at `https://yourdomain.com/`. Verify clean SSL certificate and zero mixed content warnings.
2. Sign up with an initial admin account at `https://yourdomain.com/register`.
3. Create a test HTTP monitoring endpoint (e.g. `https://httpbin.org/status/200`).
4. Click **Check Now**; verify immediate latency, status code 200, and green status pill.
5. Check `/reports` and verify SLA uptime calculation updates in real time.
6. Open `/status` in an incognito window; verify public availability without requiring login.
7. Verify `/sitemap.xml` and `/robots.txt` are served correctly with proper caching headers.
