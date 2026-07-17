# BROTE Observability — Sprint 9 Phase 3

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Guía vigente de observabilidad.


## Monitoring & Alerting

### Grafana Alerting Rules

Four critical alert rules defined in `monitoring/grafana/provisioning/alerting/rules.yml`:

**Critical Alerts (page on-call):**
- **Queue size > 10,000 jobs**: Job processing backlog detected. Check worker pod status and scale horizontally if needed.
- **Provider offline > 5 minutes**: Communication channel unreachable. Verify provider credentials and network connectivity.

**High Alerts (investigate within 1 hour):**
- **Error rate > 5% (10-min window)**: API errors elevated. Check recent deployments and error logs.
- **Delivery failed rate > 10%**: Message failures increasing. Verify contact list quality and provider health.

### Prometheus Metrics

Core metrics exposed on `GET /metrics`:

```
# HTTP request handling
http_requests_total{method, status, path}
http_request_duration_seconds{method, path}

# Job queue
bullmq_queue_size{workspace_id}
bullmq_job_duration_seconds{job_name}

# Delivery tracking
deliveries_total{status}
deliveries_failed_rate

# Provider health
provider_health_status{provider, workspace_id}
provider_latency_ms{provider}
messages_sent_total{provider, status}
```

## Audit Logging

### AuditLogger Service

Tracks all significant user actions in the `audit_logs` table:

```typescript
const auditLogger = new AuditLogger(prisma, logger)

await auditLogger.log({
  userId: 'user-123',
  workspaceId: 'workspace-456',
  event: 'campaign_created',
  payload: {
    campaignId: 'c-789',
    campaignName: 'Q3 Marketing Push',
    audienceSize: 1250,
  },
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: ctx.correlationId,
})
```

### Audit Events

Logged for all user actions:
- **Authentication**: `user_registered`, `user_logged_in`, `session_revoked`
- **Contacts**: `contact_created`, `contact_imported`, `contact_opted_out`
- **Templates**: `template_created`, `template_version_released`
- **Campaigns**: `campaign_created`, `campaign_scheduled`, `campaign_executed`, `campaign_cancelled`
- **Channels**: `provider_connected`, `provider_disconnected`, `provider_health_check`
- **Workspace**: `workspace_created`, `member_invited`, `settings_updated`

### Querying Audit Logs

```typescript
// Get all workspace events (last 100)
const logs = await auditLogger.getWorkspaceAuditLog(
  workspaceId,
  limit = 100,
  offset = 0
)

// Get specific user's actions
const userLogs = await auditLogger.getUserAuditLog(
  userId,
  workspaceId,
  limit = 50
)
```

## Distributed Tracing (OpenTelemetry)

### Architecture

For MVP, tracing is stubbed pending OpenTelemetry dependency availability. When implementing:

1. **Auto-instrumentation**: Use `@opentelemetry/auto-instrumentations-node` to capture:
   - Express middleware (HTTP spans)
   - PostgreSQL queries (DB spans)
   - Redis calls (cache spans)
   - BullMQ jobs (queue spans)

2. **Span propagation**: Traces flow through:
   ```
   API request → DB query (span)
                → Redis cache (span)
                → Worker job (span)
                   → Provider API call (span)
   ```

3. **Exporters**: Configure based on your APM platform:
   - **Jaeger**: `@opentelemetry/exporter-trace-jaeger-compact`
   - **Datadog**: `@opentelemetry/exporter-trace-otlp-http`
   - **Honeycomb**: `@opentelemetry/exporter-trace-otlp-http`

### Implementation Path

```typescript
// In apps/api/src/app.ts (before middleware)
if (process.env.OTEL_ENABLED === 'true') {
  initializeTracing('bcp-api')
}
```

**Enable with environment variables:**
```bash
OTEL_ENABLED=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

## Dashboards

### Platform Overview Dashboard
- Requests per second (by endpoint)
- Latency P50/P95/P99
- Error rate by status code
- Active sessions
- Queue size

### Campaign Execution Dashboard
- Jobs processed per minute (by job type)
- Job duration percentiles
- Delivery rate by provider (real-time)
- Failed message count
- Retry attempts

### Provider Health Dashboard
- Provider status (online/offline)
- Latency histogram by provider
- Message quota usage
- Rate limit headroom
- Error rate by provider

## Logging Strategy

### Log Levels

- **Error** (CRITICAL): API crashes, database connection failures, provider auth errors
- **Warn** (HIGH): Rate limit exceeded, provider timeout, retry exhausted
- **Info** (NORMAL): User action start/completion, deployment events
- **Debug** (LOW): Query execution, cache hit/miss, request details

All logs include:
- `correlationId` — trace requests across services
- `userId` — audit trail for user actions
- `workspaceId` — data isolation verification
- `timestamp` — event ordering
- `duration` — performance tracking

### Log Destinations

- **Development**: Stdout (pretty-printed by Pino)
- **Production**: JSON to stdout (consumed by log aggregator like ELK, Datadog, etc.)

## Monitoring Checklist

- [x] Grafana alert rules (4 thresholds: queue, provider, error rate, delivery failed)
- [x] Audit logging for all user actions
- [x] AuditLogger service with query methods
- [ ] OpenTelemetry tracing (blocked on @opentelemetry dependency availability)
- [ ] Jaeger deployment (infrastructure addition)
- [ ] Log aggregation setup (customer-specific configuration)
- [ ] On-call runbook and escalation procedures

## Future Improvements

1. **Span-based SLI tracking**: Calculate availability/latency SLIs from trace spans
2. **Anomaly detection**: Alert on sudden changes in error rate, latency distribution
3. **Custom metrics**: Business-level KPIs (delivery success rate, cost per message)
4. **Log retention policies**: Archive old audit logs to S3 for compliance
5. **Alert routing**: Route severity-based alerts to different Slack channels/PagerDuty

## Reference

- Alerting rules: `monitoring/grafana/provisioning/alerting/rules.yml`
- Audit logger: `packages/infrastructure/src/audit/AuditLogger.ts`
- Tracing init: `packages/infrastructure/src/tracing/initializeTracing.ts`
