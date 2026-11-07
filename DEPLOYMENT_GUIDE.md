# APIWatch Production Deployment & Operations Guide

This guide describes the complete procedure for deploying, configuring, securing, and maintaining **APIWatch (API Monitoring SaaS)** in a production environment using Docker Compose on an Ubuntu LTS VPS.

---

## 1. Architecture Overview

APIWatch uses a **modular monolith** web application architecture with decoupled background workers:

```
[ Public Internet ]
        │
        ▼ (Port 80 / 443)
┌────────────────────────────────────────────────────────┐
│  Reverse Proxy (Caddy 2)                               │
│  - Automatic TLS / Let's Encrypt Certificates          │
│  - Security Headers (HSTS, CSP, Sniff protection)      │
│  - HTTP -> HTTPS redirection                           │
└──────────────────────────┬─────────────────────────────┘
                           │ (Internal Docker Bridge Network)
         ┌─────────────────┴─────────────────┐
         ▼ (Port 3000)                       ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Next.js Web App (Node20)│       │ Monitoring Worker (Bull)│
│ - Dashboard & REST APIs │       │ - HTTP Check Executor   │
│ - Stateless Auth (HMAC) │       │ - SSRF Sandbox Guard    │
│ - Public Status Pages   │       │ - Alert Dispatcher      │
└───────────┬─────────────┘       └───────────┬─────────────┘
            │                                 │
     ┌──────┴──────────────┐   ┌──────────────┴──────┐
     ▼                     ▼   ▼                     ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ PostgreSQL 16 Alpine    │     │ Redis 7 Alpine          │
│ - Internal Network Only │     │ - BullMQ Queue Storage  │
│ - Persistent Volume     │     │ - Password Protected    │
└─────────────────────────┘     └─────────────────────────┘
```

> [!IMPORTANT]
> **Strict Network Isolation**: PostgreSQL (port 5432) and Redis (port 6379) are strictly bound to the internal Docker network `apiwatch_internal` and **never exposed to the public internet** or host ports.

---

## 2. Server Sizing & Hardware Recommendations

For an MVP deployment supporting up to 50 active users and ~500 monitored endpoints:

| Resource | Minimum | Recommended |
| :--- | :--- | :--- |
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS |
| **vCPU** | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB (+ 2GB Swap) | 4 GB |
| **Disk** | 25 GB SSD | 50 GB NVMe SSD |
| **Bandwidth** | 1 Gbps outbound | 1 Gbps outbound |

---

## 3. Domain & DNS Configuration

1. Choose your domain name (e.g., `apiwatch.example.com`).
2. Add an **A Record** pointing to your VPS public IPv4 address:
   ```
   Type: A
   Host: apiwatch (or @ for root domain)
   Value: <YOUR_VPS_PUBLIC_IP>
   TTL: 300 (or Automatic)
   ```
3. *(Optional)* If your VPS has IPv6 enabled:
   ```
   Type: AAAA
   Host: apiwatch
   Value: <YOUR_VPS_PUBLIC_IPV6>
   ```

---

## 4. Host Preparation & Firewall Setup

Log in to your Ubuntu VPS via SSH and run:

```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Install essential packages
sudo apt install -y curl wget git ufw gzip

# 3. Configure UFW Firewall (Deny all incoming except SSH, HTTP, HTTPS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Caddy ACME challenge & HTTPS redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### Install Docker Engine & Docker Compose Plugin

```bash
# Add Docker's official GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## 5. Repository Deployment & Configuration

Clone the repository to `/opt/apiwatch`:

```bash
sudo mkdir -p /opt/apiwatch
sudo chown -R $USER:$USER /opt/apiwatch
git clone https://github.com/your-org/apiwatch.git /opt/apiwatch
cd /opt/apiwatch
```

### Generating Production Secrets

Run the following commands to generate cryptographically strong 32-byte hex keys:

```bash
# Generate AUTH_SECRET (for HMAC session cookie signing)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (for AES-256-GCM database secret encryption)
openssl rand -hex 32

# Generate strong database and redis passwords
openssl rand -hex 24
openssl rand -hex 24
```

### Create `.env`

Copy the production template and fill in the generated values:

```bash
cp .env.production.example .env
nano .env
```

Ensure the following variables are configured:
```dotenv
NODE_ENV=production
DOMAIN=apiwatch.example.com
APP_URL=https://apiwatch.example.com

POSTGRES_DB=apiwatch
POSTGRES_USER=apiwatch_user
POSTGRES_PASSWORD=<GENERATED_POSTGRES_PASSWORD>

REDIS_PASSWORD=<GENERATED_REDIS_PASSWORD>

AUTH_SECRET=<GENERATED_AUTH_SECRET>
ENCRYPTION_KEY=<GENERATED_ENCRYPTION_KEY>

EMAIL_FROM="APIWatch Alerts <alerts@apiwatch.example.com>"
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=<YOUR_SMTP_API_KEY>
```

---

## 6. Launching Services & Database Migrations

### Step 1: Build Docker Images

```bash
docker compose build --no-cache
```

### Step 2: Start Infrastructure & Run Migrations

Start the stack in detached mode:

```bash
docker compose up -d
```

The `migration` service will automatically run `prisma migrate deploy` before the `web` and `worker` containers boot up.

### Step 3: Verify Container Health

```bash
docker compose ps
```

Expected output:
```
NAME                 IMAGE               COMMAND                  SERVICE      STATUS                    PORTS
apiwatch-postgres    postgres:16-alpine  "docker-entrypoint.s…"   postgres     Up (healthy)              
apiwatch-redis       redis:7-alpine      "docker-entrypoint.s…"   redis        Up (healthy)              
apiwatch-migration   apiwatch-worker     "npx prisma migrate …"   migration    Exited (0)                
apiwatch-web         apiwatch-web        "node server.js"         web          Up (healthy)              
apiwatch-worker      apiwatch-worker     "npx tsx worker/src/…"   worker       Up                        
apiwatch-proxy       caddy:2-alpine      "caddy run --config …"   proxy        Up                        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Step 4: Check Logs

```bash
# Follow web logs
docker compose logs -f web

# Follow worker logs
docker compose logs -f worker

# Follow Caddy reverse proxy logs (TLS certificate status)
docker compose logs -f proxy
```

---

## 7. Production Smoke Testing Checklist

Run through these verification checks once containers are healthy:

1. **HTTPS & Certificate Verification**:
   ```bash
   curl -I https://apiwatch.example.com
   # Verify HTTP 200/307, valid Let's Encrypt TLS certificate, and Strict-Transport-Security header
   ```
2. **Application Health Check Endpoint**:
   ```bash
   curl -s https://apiwatch.example.com/api/health | jq .
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "services": {
       "database": "connected",
       "redis": "connected"
     }
   }
   ```
3. **User Authentication Flow**:
   - Navigate to `https://apiwatch.example.com/register` and create the initial administrator account.
   - Verify session cookie is set with `HttpOnly; Secure; SameSite=Lax`.
4. **Endpoint Creation & Immediate Check**:
   - Add a test endpoint: `https://httpbin.org/status/200`.
   - Click "Check Now" and verify immediate response time and status 200 in the dashboard.
5. **Worker Daemon & Scheduler**:
   - Check worker logs (`docker compose logs worker`) to verify repeatable BullMQ job execution.
6. **Public Status Page**:
   - Navigate to `https://apiwatch.example.com/status` to confirm public availability without login.

---

## 8. Backup & Disaster Recovery Procedures

### Automated Daily Backup

Make the backup script executable:

```bash
chmod +x /opt/apiwatch/scripts/backup.sh
chmod +x /opt/apiwatch/scripts/restore.sh
```

Add a root cron job to run daily backups at 02:00 AM UTC:

```bash
sudo crontab -e
```
Add line:
```cron
0 2 * * * cd /opt/apiwatch && ./scripts/backup.sh >> /var/log/apiwatch-backup.log 2>&1
```

### Manual Backup On-Demand

```bash
cd /opt/apiwatch
./scripts/backup.sh
```

Backups are saved in `/opt/apiwatch/backups/apiwatch_db_YYYYMMDD_HHMMSS.sql.gz` with permissions `600`.

### Database Restore Procedure

To restore from a backup file:

```bash
cd /opt/apiwatch
./scripts/restore.sh /opt/apiwatch/backups/apiwatch_db_20261107_020000.sql.gz
```

The script decompresses the SQL stream directly into the PostgreSQL container and verifies schema integrity with Prisma.

---

## 9. Zero-Downtime Updates & Rollback

### Deploying New Code (Rolling Update)

```bash
cd /opt/apiwatch
git pull origin main

# Rebuild images without taking down the running stack
docker compose build web worker

# Recreate containers with zero or near-zero downtime
docker compose up -d --no-deps web worker
```

### Rollback Procedure

If a deployed version experiences issues:

```bash
# 1. Rollback code to previous git commit
git checkout <PREVIOUS_STABLE_COMMIT_HASH>

# 2. Rebuild and restart containers
docker compose build web worker
docker compose up -d --no-deps web worker

# 3. If database migration needs to be rolled back:
# Restore the pre-deployment database backup using restore.sh
```

---

## 10. Operational Monitoring & Troubleshooting

| Symptom | Probable Cause | Diagnostic Command |
| :--- | :--- | :--- |
| **502 Bad Gateway from Caddy** | Web container is crashing or starting up | `docker compose logs --tail=100 web` |
| **Worker not processing checks** | Redis connection lost or queue stalled | `docker compose logs --tail=100 worker` |
| **Disk filling up** | Unpruned Docker images or old logs | `docker system df` then `docker image prune -f` |
| **TLS Certificate Error** | DNS A record not yet propagated to Caddy | `dig +short apiwatch.example.com` |
| **High Latency in checks** | VPS network throttling or DNS latency | Inspect DNS servers in `/etc/resolv.conf` |
