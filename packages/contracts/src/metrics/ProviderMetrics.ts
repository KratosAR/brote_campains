import { Counter, Gauge, Histogram, register } from 'prom-client'

// ponytail: registrado en el `register` default de prom-client, el mismo que expone
// apps/api/src/routes/metrics.ts — un solo /metrics para toda la app.
export const providerHealthStatus = new Gauge({
  name: 'provider_health_status',
  help: 'Provider health status (1 = online, 0 = offline/degraded)',
  labelNames: ['provider', 'workspace'],
  registers: [register],
})

export const providerLatencyMs = new Histogram({
  name: 'provider_latency_ms',
  help: 'Provider send() latency in milliseconds',
  labelNames: ['provider'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
})

export const messagesSentTotal = new Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent per provider and outcome',
  labelNames: ['provider', 'status'],
  registers: [register],
})
