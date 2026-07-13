# BROTE Communication Platform — Guía de Operaciones

## Arrancar el sistema

### Prerrequisitos
- Node.js 20+
- pnpm 9+
- Docker y Docker Compose
- PostgreSQL 15+, Redis 7+

### Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar infraestructura
docker compose up -d

# 3. Correr migraciones
pnpm db:migrate

# 4. Levantar API en dev
pnpm dev:api

# 5. Levantar Scheduler (en otra terminal)
pnpm dev:scheduler

# 6. Levantar Worker (en otra terminal)
pnpm dev:worker

# 7. Levantar Webhook (en otra terminal)
pnpm dev:webhook
```

**Endpoints:**
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

### Producción

```bash
# Build
pnpm build

# Docker image
docker build -f Dockerfile -t brote-api:1.0 .

# Run
docker run -e NODE_ENV=production -e DATABASE_URL=... -e REDIS_URL=... -p 3000:3000 brote-api:1.0
```

**Variables de entorno requeridas:**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/brote
REDIS_URL=redis://localhost:6379
JWT_SECRET=<32+ caracteres aleatorios>
JWT_REFRESH_SECRET=<32+ caracteres aleatorios>
ENCRYPTION_KEY=<32+ caracteres aleatorios para credenciales>
```

## Monitoreo

### Health checks
```bash
# API health
curl http://localhost:3000/health

# Métricas Prometheus
curl http://localhost:3000/metrics
```

### Alertas en Grafana
- Queue size > 10,000 jobs → Crítica
- Provider offline > 5 minutos → Crítica
- Error rate > 5% en 10 min → Alta
- Delivery failed rate > 10% → Alta

Ver dashboards en http://localhost:3001:
- Platform Overview
- Campaign Execution
- Provider Health

## Escalar

### Workers
```bash
# Lanzar múltiples workers con load balancing
for i in {1..4}; do
  pnpm start:worker &
done
```

### Scheduler
El scheduler es un único proceso que poll la BD. No necesita escalarse horizontalmente (usa locks de DB para concurrencia).

### API
```bash
# Con nginx/load balancer
docker-compose scale api=3
```

## Backup y restauración

### Backup de PostgreSQL
```bash
# Exportar
pg_dump $DATABASE_URL > backup.sql

# Comprimir
gzip backup.sql
```

### Restauración
```bash
# Desde backup
psql $DATABASE_URL < backup.sql

# Correr migraciones después
pnpm db:migrate
```

## Agregar un nuevo Provider

Ver [`docs/PROVIDERS.md`](./PROVIDERS.md) para documentación completa.

Pasos rápidos:
1. Crear `providers/{provider-name}/src/{Provider}Provider.ts` implementando `MessagingProvider`
2. Registrar en `apps/api/src/container.ts`
3. Agregar credenciales en `ChannelConnection`
4. Testar con `/workspaces/:id/channels/connect`

## Troubleshooting

### Campaña no se envía
1. Verificar que el Provider está conectado: `GET /workspaces/:id/channels`
2. Revisar logs del Worker: `docker logs <worker-container>`
3. Verificar que los contactos no están en opt-out: `GET /workspaces/:id/contacts/:id`

### Rate limiting
- Global: 100 req/min por IP
- Auth: 5 intentos/min por IP
- API por workspace: 30 req/min

Aumentar en `apps/api/src/middleware/rateLimiter.ts`

### Performance
- Postgres: Verificar índices con `EXPLAIN ANALYZE`
- Redis: Monitorear memoria con `redis-cli INFO memory`
- BullMQ: Ver queue size en Bull Board: http://localhost:3000/admin/queues

## Logs

```bash
# Todos los logs (docker compose)
docker compose logs -f

# Solo API
docker compose logs -f api

# Nivel debug
export LOG_LEVEL=debug
pnpm dev:api
```

## Seguridad

- Secrets en variables de entorno, nunca en código
- JWT y credenciales encriptadas en DB (AES-256)
- Rate limiting activo en todos los endpoints
- CORS restringido según `CORS_ORIGINS` env
- Helmet headers de seguridad activos

Revisar `docs/SECURITY.md` para política de seguridad completa.
