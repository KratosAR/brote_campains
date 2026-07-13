# BROTE Communication Platform (BCP)

Plataforma de comunicación empresarial omnicanal. Campañas masivas, contactos, templates y analíticas — con arquitectura desacoplada que permite cambiar de proveedor (Meta, Evolution, SMTP, Telegram) sin tocar el dominio.

## Documentación

- [`BCP-SPECIFICATION.md`](./BCP-SPECIFICATION.md) — especificación completa del producto: arquitectura, dominio, decisiones y SRS
- [`BCP-SPRINTS.md`](./BCP-SPRINTS.md) — plan de sprints con tareas y criterios de aceptación

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
| Sprint 9 | Hardening | 🔄 En progreso |
