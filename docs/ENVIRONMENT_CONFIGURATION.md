# APIWatch Environment Configuration Reference

This document provides a comprehensive reference of all environment variables supported by the APIWatch web application, background monitoring worker, and auxiliary maintenance scripts.

---

## Environment Variable Reference

| Variable Name | Required | Default (Dev) | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `development` | Runtime environment mode (`development`, `test`, `production`). |
| `APP_URL` | Yes | `http://localhost:3000` | Canonical public URL used for SEO canonical tags, Open Graph URLs, and webhook callbacks. |
| `PORT` | No | `3000` | Port on which the Next.js standalone Node server listens. |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string including credentials, database name, and pool parameters. |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL used by BullMQ worker, rate limiting, and memory cache layer. |
| `AUTH_SECRET` | Yes | — | 64-char hex key (32 bytes) used for signing HMAC-SHA256 session tokens. |
| `ENCRYPTION_KEY` | Yes | — | 64-char hex key (32 bytes) used for AES-256-GCM encryption of sensitive database fields. |
| `SESSION_COOKIE_NAME`| No | `apiwatch_session` | Name of the session cookie (`__Host-apiwatch_session` recommended in production). |
| `BILLING_SANDBOX_MODE`| No | `true` | When `true`, enables mock sandbox payments for subscription checkout and upgrades. |
| `BILLING_GATEWAY_WEBHOOK_SECRET` | No | — | Secret token used to verify inbound HMAC signatures from payment providers. |
| `EMAIL_FROM` | Yes | `alerts@example.com` | "From" sender address on outage notification emails. |
| `SMTP_HOST` | Yes | `localhost` | Outbound mail server hostname (e.g. `smtp.resend.com` or `smtp.sendgrid.net`). |
| `SMTP_PORT` | Yes | `587` | Outbound mail server port (`587` for STARTTLS, `465` for SSL). |
| `SMTP_USER` | Yes | — | Mail server username or API token. |
| `SMTP_PASSWORD` | Yes | — | Mail server password or API secret key. |
| `LOG_LEVEL` | No | `info` | Minimum log severity level (`debug`, `info`, `warn`, `error`). |
| `METRICS_ENABLED` | No | `true` | Enables Prometheus metrics exposition on `/api/metrics`. |
| `OPS_ALERT_WEBHOOK_URL`| No | — | Webhook URL (Slack/Discord) for automated dispatch of critical system alerts. |
| `BACKUP_DIR` | No | `./backups` | Filesystem directory where database backup `.sql.gz` archives are saved. |
| `BACKUP_RETENTION_DAYS`| No | `7` | Retention window for local backup files before automated cleanup. |
| `BACKUP_S3_BUCKET` | No | — | Optional Amazon S3 or Cloudflare R2 bucket name for off-site backup storage. |

---

## Security Best Practices

### Cryptographic Key Generation
Always generate `AUTH_SECRET` and `ENCRYPTION_KEY` using cryptographically secure random number generators:
```bash
# Generate AUTH_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### Production Permissions
On Linux servers, ensure your production `.env` file is only readable by the runtime user:
```bash
chmod 600 /opt/apiwatch/.env
chown deploy:deploy /opt/apiwatch/.env
```
