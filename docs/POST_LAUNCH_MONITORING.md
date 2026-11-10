# APIWatch Post-Launch Monitoring & Operational Observability

This guide details the observability strategy, SLI/SLO baselines, alert threshold configurations, and daily monitoring routines for APIWatch following production release.

---

## 1. Service Level Indicators (SLIs) & Objectives (SLOs)

| Metric | Target (SLO) | Measurement Method | Alert Threshold |
| :--- | :--- | :--- | :--- |
| **API Availability** | 99.9% Uptime | HTTP 2xx/3xx ratio on web endpoints | > 1% 5xx responses for 5m |
| **P95 Web Latency** | < 250 ms | `http_request_duration_seconds{quantile="0.95"}` | > 500 ms for 5m |
| **Probe Execution Delay** | < 5 seconds | BullMQ job latency against scheduled interval | Delayed jobs count > 50 |
| **Database Latency** | < 15 ms | `apiwatch_db_latency_seconds` | > 50 ms sustained for 3m |
| **Redis Connectivity** | 100% | Healthcheck ping via `/api/health?probe=ready` | Any connection timeout |

---

## 2. Post-Launch Cadence (Day 0 to Day 14)

### Day 0 (Launch Day: First 6 Hours)
- [ ] Monitor container resource utilization (`docker stats`) every 30 minutes.
- [ ] Verify SSL certificate auto-renewal status in Caddy logs.
- [ ] Execute smoke test script hourly:
  ```bash
  node scripts/smoke-test.mjs https://apiwatch.example.com
  ```
- [ ] Verify outbound SMTP email delivery on a test account outage alert.

### Days 1 to 3 (Initial Adoption)
- [ ] Inspect PostgreSQL connection pool usage:
  ```bash
  docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM pg_stat_activity;"
  ```
- [ ] Check Redis memory consumption and keyspace growth:
  ```bash
  docker compose exec redis redis-cli -a "$REDIS_PASSWORD" info memory
  ```
- [ ] Review error tracker breadcrumbs for unhandled client exceptions.

### Days 4 to 14 (Steady-State Operations)
- [ ] Verify daily backup creation in `backups/` and file size consistency.
- [ ] Review slow queries (> 50ms) in structured JSON logs.
- [ ] Audit user onboarding and subscription trial progression.

---

## 3. Prometheus Monitoring Configuration

Add APIWatch as a scrape target in your centralized `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "apiwatch-production"
    scrape_interval: 15s
    scrape_timeout: 5s
    scheme: https
    metrics_path: /api/metrics
    static_configs:
      - targets: ["apiwatch.example.com"]
```

### Recommended Alerting Rules (`alertmanager.rules.yml`)

```yaml
groups:
  - name: apiwatch-critical-alerts
    rules:
      - alert: APIWatchHighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.02
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "APIWatch web server error rate > 2%"

      - alert: APIWatchDatabasePingSlow
        expr: apiwatch_db_latency_seconds > 0.05
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL response latency elevated (> 50ms)"

      - alert: APIWatchQueueBacklog
        expr: bullmq_delayed_jobs_total > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API monitoring worker queue delay detected"
```

---

## 4. Structured JSON Log Auditing

APIWatch outputs RFC-compliant structured JSON logs. Filter and diagnose issues with standard Unix tools or jq:

### Find all critical errors:
```bash
docker compose logs web | grep '"level":"error"' | jq '{timestamp, message, error}'
```

### Trace errors by fingerprint:
```bash
docker compose logs web | grep '"fingerprint":"dc7efee2"' | jq .
```

### Monitor real-time system alerts:
```bash
docker compose logs web | grep 'System Alert'
```
