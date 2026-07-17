# BROTE Communication Platform (BCP)

Plataforma de comunicación empresarial omnicanal. Campañas masivas, contactos, templates y analíticas — con arquitectura desacoplada que permite cambiar de proveedor (Meta, Evolution, SMTP, Telegram) sin tocar el dominio.

## Documentación

- [`BCP-SPECIFICATION.md`](./BCP-SPECIFICATION.md) — especificación completa del producto: arquitectura, dominio, decisiones y SRS
- [`BCP-SPRINTS.md`](./BCP-SPRINTS.md) — plan de sprints con tareas y criterios de aceptación

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

**Detalles:** Ver [`BCP-SPRINTS.md#post-sprint-9`](./BCP-SPRINTS.md#post-sprint-9--stabilization--bug-fixes-investigación-de-2026-07-13)

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker y Docker Compose

## Instalación Inicial

```bash
# 1. Instalar dependencias (una sola vez)
pnpm install
```

## Levantar la Infraestructura (Docker)

La infraestructura (PostgreSQL, Redis, Prometheus, Grafana) corre en Docker.

```bash
# Desde la raíz del proyecto
docker compose -f docker/docker-compose.yml up -d

# O si estás en el directorio docker/
cd docker && docker compose up -d
```

**Servicios disponibles:**
- **PostgreSQL:** localhost:5433 (usuario: `bcp`, contraseña: `bcp_dev_password`)
- **Redis:** localhost:6379
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin)

Para detener los servicios:
```bash
docker compose -f docker/docker-compose.yml down
```

## Ejecutar Migraciones de Base de Datos

Necesario hacer UNA SOLA VEZ antes de levantar el backend:

```bash
pnpm db:migrate
```

## Iniciar el Backend

El backend es una API Express.js que corre en puerto **3000**.

```bash
# Desarrollo con hot-reload
pnpm dev

# O si quieres levantar solo el API (sin otros apps)
cd apps/api
pnpm dev
```

**Verificar que funciona:**
- API: http://localhost:3000
- Swagger API Docs: http://localhost:3000/api-docs

## Iniciar el Frontend

El frontend es una aplicación Next.js que corre en puerto **3002**.

```bash
# Desarrollo con hot-reload
cd apps/web
pnpm dev
```

**Verificar que funciona:**
- Frontend: http://localhost:3002

## Levantar Todo Junto (Recomendado para desarrollo)

### Opción 1: Usar Scripts (MÁS FÁCIL) ⭐

Desde la raíz del proyecto:

```bash
# Terminal 1: Docker + Migraciones + API (una sola vez)
pnpm dev:docker-api

# Terminal 2: Frontend (en otra terminal)
pnpm dev:web
```

O todo en una sola terminal (Docker y API en foreground):
```bash
pnpm dev:docker-api:watch
```

### Opción 2: Terminales Separadas (Manual)

Si prefieres control total:

```bash
# Terminal 1: Infraestructura (una sola vez)
pnpm dev:infra

# Terminal 2: Migraciones (una sola vez)
pnpm db:migrate

# Terminal 3: Backend
pnpm dev:api

# Terminal 4: Frontend
pnpm dev:web
```

### Opción 3: Todo en Paralelo

```bash
pnpm dev:all     # Backend + Frontend en paralelo (requiere Docker ya levantado)
```

## Scripts Disponibles en la Raíz

```bash
# Compilación
pnpm build              # Compilar todo el monorepo (backend + frontend)

# Desarrollo - Quick Start ⭐
pnpm dev:docker-api     # Levanta Docker + migraciones + API (recomendado)
pnpm dev:docker-api:watch # Docker + API en foreground (ver logs en tiempo real)
pnpm dev:infra          # Solo levanta Docker (PostgreSQL + Redis + Prometheus + Grafana)
pnpm dev:infra:down     # Detiene todos los contenedores Docker

# Desarrollo - Individual
pnpm dev                # Levantar solo el backend con hot-reload
pnpm dev:api            # Alias para dev (solo API)
pnpm dev:web            # Levantar solo el frontend
pnpm dev:all            # Levantar backend + frontend en paralelo (requiere Docker activo)

# Testing
pnpm test               # Correr todos los tests
pnpm test:watch        # Modo watch en tests

# Calidad de código
pnpm lint               # Lint de todo el monorepo
pnpm typecheck          # TypeScript check sin emitir archivos
pnpm format             # Formatear con Prettier

# Base de datos
pnpm db:migrate         # Correr migraciones de Prisma
pnpm db:generate        # Regenerar cliente de Prisma
pnpm db:studio          # Abrir Prisma Studio (UI para BD)
```

## Scripts en apps/api (Backend)

```bash
cd apps/api

pnpm dev                # Levantar API con hot-reload (ts-node-dev)
pnpm build              # Compilar a JavaScript
pnpm start              # Correr API compilada
pnpm test               # Correr tests
pnpm lint               # Lint del backend
pnpm typecheck          # TypeScript check
```

## Scripts en apps/web (Frontend)

```bash
cd apps/web

pnpm dev                # Levantar Next.js en puerto 3002
pnpm build              # Compilar para producción
pnpm start              # Correr compilada (requiere `pnpm build` primero)
pnpm lint               # Lint del frontend
pnpm typecheck          # TypeScript check
```

## Flujo de Desarrollo Recomendado

1. **Setup inicial (una sola vez):**
   ```bash
   pnpm install
   docker compose -f docker/docker-compose.yml up -d
   pnpm db:migrate
   ```

2. **Desarrollo diario:**
   - Terminal 1: `pnpm dev` (Backend)
   - Terminal 2: `cd apps/web && pnpm dev` (Frontend)
   - Abre http://localhost:3002

3. **Ver cambios en tiempo real:**
   - Backend: hot-reload automático con ts-node-dev
   - Frontend: hot-reload automático con Next.js

## Variables de Entorno

### Backend (apps/api/.env)
```
DATABASE_URL=postgresql://bcp:bcp_dev_password@localhost:5433/bcp
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Frontend (apps/web/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
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
