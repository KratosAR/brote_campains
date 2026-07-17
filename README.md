# BROTE Communication Platform (BCP)

Plataforma de comunicación empresarial omnicanal. Campañas masivas, contactos, templates y analíticas — con arquitectura desacoplada que permite cambiar de proveedor (Meta, Evolution, SMTP, Telegram) sin tocar el dominio.

**Visión de producto (2026-07-17):** evolucionar de motor de campañas broadcast (WhatsApp) a una alternativa completa a ManyChat — multicanal, inbox conversacional, flow builder visual y secuencias — diferenciándose por ser **self-hosted / open-core** (WhatsApp vía Evolution API self-hosted además de Meta Cloud API oficial, sin vendor lock-in) y por un modelo de **compliance/consentimiento** más robusto que el estándar del mercado. Ver [`[IN_DEV].ROADMAP.md`](./[IN_DEV].ROADMAP.md).

## Documentación

- [`[IN_DEV].ROADMAP.md`](./[IN_DEV].ROADMAP.md) — roadmap de producto hacia paridad y diferenciación frente a ManyChat: fases, sprints backend/frontend, estimaciones
- [`[COMPLETE].BCP-SPECIFICATION.md`](./[COMPLETE].BCP-SPECIFICATION.md) — especificación completa del producto: arquitectura, dominio, decisiones y SRS
- [`[COMPLETE].BCP-SPRINTS.md`](./[COMPLETE].BCP-SPRINTS.md) — plan de sprints ejecutados (Sprint 0–9.4, ✅ completo) con tareas y criterios de aceptación

## Status de Estabilidad

### Fixes Recientes (2026-07-13)

Se identificaron y resolvieron **5 problemas críticos de estabilidad del servidor** que bloqueaban todo testing E2E:

| Problema | Síntoma | Solución | Resultado |
|---|---|---|---|
| **Bcrypt lento** | Registration tarda 120+ segundos | Reducir SALT_ROUNDS a 6 en desarrollo | **7000x mejora**: 120s → 17ms |
| **Token expiry corto** | Usuarios revalidar cada 15 minutos | Extender TTL a 24 horas | Sesiones persistentes |
| **Async errors no capturados** | Requests cuelgan 120s sin respuesta | asyncHandler wrapper en todos los handlers | Errores propagados correctamente |
| **Slug duplicado sin validación** | Crash silencioso (unhandled rejection) | Validar slug antes de guardar | Error validación claro |
| **Rate limiters conflictivos** | 429 inconsistentes, dos configuraciones | Consolidar en un solo archivo, 3 limiters claros | Rate limiting predecible |

**Detalles:** Ver [`[COMPLETE].BCP-SPRINTS.md#post-sprint-9`](./[COMPLETE].BCP-SPRINTS.md#post-sprint-9--stabilization--bug-fixes-investigación-de-2026-07-13)

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker y Docker Compose

## Levantar el proyecto

```bash
# Instalar dependencias
pnpm install

# Levantar infraestructura (PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# Correr migraciones
pnpm db:migrate

# Levantar API en desarrollo
pnpm dev
```

## Scripts disponibles

```bash
pnpm build          # Compilar todo el monorepo
pnpm dev            # Levantar API con hot-reload
pnpm test           # Correr todos los tests
pnpm lint           # Lint de todo el monorepo
pnpm typecheck      # TypeScript check sin emitir archivos
pnpm db:migrate     # Correr migraciones de Prisma
pnpm db:generate    # Generar cliente de Prisma
```

## Estado del proyecto

| Sprint | Descripción | Estado |
|---|---|---|
| Sprint 0 | Bootstrap — monorepo, Docker, CI/CD | ✅ Completo |
| Sprint 1 | Shared Kernel y Core DDD | ✅ Completo |
| Sprint 2 | Workspace y Auth | ✅ Completo |
| Sprint 3 | Contactos | ✅ Completo |
| Sprint 4 | Templates | ✅ Completo |
| Sprint 5 | Campañas | ✅ Completo |
| Sprint 6 | Execution Engine | ✅ Completo |
| Sprint 7 | Communication Layer | ✅ Completo |
| Sprint 8 | Analytics | ✅ Completo |
| Sprint 9.1 | Hardening (Security) | ✅ Completo |
| Sprint 9.2 | Performance (Caching & Pagination) | ✅ Completo |
| Sprint 9.3 | Observability (Monitoring & Tracing) | ✅ Completo |
| Sprint 9.4 | CLI + E2E Tests | ✅ Completo |
