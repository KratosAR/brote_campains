# BROTE Communication Platform — Plan de Sprints

**Versión:** 1.0  
**Estado:** Definitivo  
**Fecha:** 2026-07-02  
**Equipo:** 2 desarrolladores (Gonzalo + Claude)

Este documento es el plan de trabajo concreto. Cada sprint tiene tareas, criterios de aceptación técnicos y resultado esperado. Lee la `BCP-SPECIFICATION.md` para entender el *por qué* de cada decisión.

---

## Índice

- [Sprint 0 — Bootstrap](#sprint-0--bootstrap-1-semana)
- [Sprint 1 — Shared Kernel](#sprint-1--shared-kernel-y-core-ddd-2-semanas)
- [Sprint 2 — Workspace y Auth](#sprint-2--workspace-y-auth-2-semanas)
- [Sprint 3 — Contactos](#sprint-3--contactos-3-semanas)
- [Sprint 4 — Templates](#sprint-4--templates-1-semana)
- [Sprint 5 — Campañas (sin envío)](#sprint-5--campañas-sin-envío-3-semanas)
- [Sprint 6 — Execution Engine](#sprint-6--execution-engine-3-semanas)
- [Sprint 7 — Communication Layer](#sprint-7--communication-layer-3-semanas)
- [Sprint 8 — Analytics](#sprint-8--analytics-2-semanas)
- [Sprint 9 — Hardening](#sprint-9--hardening-2-semanas)

---

## Sprint 0 — Bootstrap (1 semana)

**Objetivo:** Proyecto vacío pero completamente operativo. Compilando, con CI, con observabilidad base y con Docker listo para levantar todo con un comando.

### Tareas

#### Monorepo
- [ ] Inicializar monorepo con Turborepo + pnpm workspaces
- [ ] Crear estructura de carpetas: `apps/`, `packages/`, `providers/`, `prisma/`, `docs/`, `docker/`, `scripts/`, `monitoring/`
- [ ] Configurar `turbo.json` con pipelines: `build`, `test`, `lint`, `typecheck`
- [ ] Crear apps vacías: `api`, `worker`, `scheduler`, `webhook`, `cli`
- [ ] Crear packages vacíos: `domain`, `application`, `infrastructure`, `contracts`, `common`, `testing`, `sdk`
- [ ] Crear providers vacíos: `meta`, `evolution`, `fake`

#### TypeScript
- [ ] `tsconfig.base.json` en raíz con paths configurados
- [ ] Cada app y package extiende la base con su propio `tsconfig.json`
- [ ] Paths configurados: `@bcp/domain`, `@bcp/application`, `@bcp/infrastructure`, `@bcp/contracts`, `@bcp/common`, `@bcp/testing`

#### Calidad de código
- [ ] ESLint con reglas compartidas (`packages/common/eslint-config`)
- [ ] Prettier con configuración compartida
- [ ] Husky: pre-commit corre lint y typecheck
- [ ] Commitlint: enforce conventional commits (`feat:`, `fix:`, `chore:`, etc.)

#### Base de datos
- [ ] PostgreSQL en Docker Compose
- [ ] Prisma inicializado en `prisma/`
- [ ] Schema vacío con solo el modelo `Workspace` de placeholder
- [ ] `prisma migrate dev` funcionando
- [ ] `prisma generate` corriendo en el pipeline de build

#### Cache y colas
- [ ] Redis en Docker Compose
- [ ] BullMQ instalado en `packages/infrastructure`
- [ ] Dashboard de BullMQ (Bull-Board) accesible en desarrollo

#### HTTP
- [ ] Express configurado en `apps/api`
- [ ] Endpoint `GET /health` que retorna `{ status: "ok", timestamp: ... }`
- [ ] Middleware de correlationId: genera ULID por request y lo agrega al contexto
- [ ] Middleware de logging: loguea método, path, status y duración de cada request

#### Logging
- [ ] Pino configurado en `packages/infrastructure/logger`
- [ ] Logs en JSON en producción, pretty en desarrollo
- [ ] Niveles: `error`, `warn`, `info`, `debug`
- [ ] Siempre incluye `correlationId` en cada log

#### Variables de entorno
- [ ] `.env.example` documentado con todas las variables requeridas
- [ ] `.env` en `.gitignore`
- [ ] Validación de variables al arrancar (si falta una requerida, el proceso falla con mensaje claro)
- [ ] Separación: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_PORT`, `NODE_ENV`

#### Observabilidad
- [ ] Prometheus corriendo en Docker Compose
- [ ] Grafana corriendo en Docker Compose con Prometheus como datasource
- [ ] Endpoint `GET /metrics` en la API expone métricas en formato Prometheus
- [ ] Métricas base: `http_requests_total`, `http_request_duration_seconds`, `process_cpu_seconds_total`, `process_resident_memory_bytes`

#### OpenAPI
- [ ] Swagger UI disponible en `GET /docs` (solo en desarrollo)
- [ ] Archivo `docs/openapi/openapi.yaml` base con info del proyecto y solo el endpoint `/health`

#### CI/CD
- [ ] GitHub Actions: workflow `ci.yml` que corre en cada push y PR
- [ ] Pipeline: `lint → typecheck → test → build`
- [ ] Caché de dependencias pnpm en GitHub Actions
- [ ] Build falla si cualquier paso falla

#### Docker
- [ ] `docker-compose.yml` que levanta: PostgreSQL, Redis, Prometheus, Grafana
- [ ] `Dockerfile` para `apps/api` (multi-stage: build + runtime)
- [ ] `docker-compose.dev.yml` para desarrollo local con hot-reload

### Criterios de aceptación

- `pnpm install` desde raíz instala todo sin errores
- `pnpm build` desde raíz compila todos los packages y apps sin errores de TypeScript
- `pnpm lint` pasa sin errores
- `docker compose up` levanta PostgreSQL, Redis, Prometheus y Grafana
- `pnpm dev` en `apps/api` levanta el servidor en puerto 3000
- `GET http://localhost:3000/health` retorna `200 { status: "ok" }`
- `GET http://localhost:3000/metrics` retorna métricas en formato Prometheus
- `GET http://localhost:3000/docs` muestra Swagger UI
- Un commit con mensaje inválido (ej: `"arreglé cosas"`) es rechazado por commitlint
- El pipeline de CI corre completo en GitHub Actions y pasa

---

## Sprint 1 — Shared Kernel y Core DDD (2 semanas)

**Objetivo:** Infraestructura DDD lista. Sin lógica de negocio todavía. Todo el código de dominio que se escriba en sprints futuros hereda de lo que se construye acá.

**Dependencia:** Sprint 0 completado.

### Tareas

#### `packages/domain/shared/` — Primitivos

- [ ] `UniqueId` — wrapper sobre ULID. Métodos: `generate()`, `from(string)`, `equals(other)`, `toString()`
- [ ] `Clock` — interfaz `IClock` con `now(): Date`. Implementación `SystemClock`. Implementación `FixedClock(date)` para tests.
- [ ] `ValueObject<T>` — clase base abstracta. Dos VOs son iguales si sus propiedades son iguales. Método `equals(other)`.
- [ ] `Entity<T>` — clase base abstracta con `id: UniqueId`. Dos entidades son iguales si sus IDs son iguales.
- [ ] `AggregateRoot<T>` — extiende `Entity`. Agrega: lista interna de `DomainEvent[]`, método `addDomainEvent(event)`, método `clearDomainEvents(): DomainEvent[]`, `version: number`, `createdAt: Date`, `updatedAt: Date`.
- [ ] `DomainEvent` — clase base abstracta. Campos: `eventId: UniqueId`, `occurredAt: Date`, `correlationId: string`, `aggregateId: UniqueId`, `aggregateType: string`, `eventType: string`.

#### `packages/domain/shared/` — Result Pattern

- [ ] `Result<T, E>` — clase con dos estados: `ok` y `fail`
  - `Result.ok<T>(value: T): Result<T, never>`
  - `Result.fail<E>(error: E): Result<never, E>`
  - `.isOk(): boolean`
  - `.isFail(): boolean`
  - `.getValue(): T` (lanza si es fail)
  - `.getError(): E` (lanza si es ok)
  - `.map<U>(fn: (value: T) => U): Result<U, E>`
  - `.flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>`
- [ ] Tests unitarios completos de `Result`

#### `packages/domain/shared/` — Value Objects base

- [ ] `Email` — valida formato RFC 5321. `Email.create(value: string): Result<Email, ValidationError>`. Normaliza a minúsculas.
- [ ] `PhoneNumber` — acepta múltiples formatos, normaliza a E.164. `PhoneNumber.create(value: string): Result<PhoneNumber, ValidationError>`. Métodos: `toE164()`, `toInternational()`.
- [ ] Tests unitarios: `PhoneNumber.create("3511234567")`, `PhoneNumber.create("+54 351 1234567")`, `PhoneNumber.create("03511234567")` deben producir el mismo E.164.

#### `packages/domain/shared/` — Errores de dominio

- [ ] `DomainError` — clase base abstracta. Campos: `code: string`, `message: string`.
- [ ] `ValidationError extends DomainError`
- [ ] `NotFoundError extends DomainError`
- [ ] `BusinessRuleViolationError extends DomainError`
- [ ] `UnauthorizedError extends DomainError`

#### `packages/contracts/` — Interfaces de infraestructura

- [ ] `IRepository<T, ID>` — `findById(id: ID): Promise<Result<T, NotFoundError>>`, `save(entity: T): Promise<Result<void, DomainError>>`, `delete(id: ID): Promise<Result<void, DomainError>>`
- [ ] `IClock` — `now(): Date`
- [ ] `ILogger` — `info(message, context?)`, `warn(message, context?)`, `error(message, error?, context?)`, `debug(message, context?)`
- [ ] `IEventBus` — `publish(events: DomainEvent[]): Promise<void>`, `subscribe(eventType: string, handler: EventHandler): void`
- [ ] `IQueue` — `add(jobName: string, data: unknown, options?: JobOptions): Promise<void>`
- [ ] `ICache` — `get<T>(key: string): Promise<T | null>`, `set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>`, `delete(key: string): Promise<void>`
- [ ] `ISecretManager` — `get(key: string): Promise<string>`

#### `packages/infrastructure/` — Implementaciones

- [ ] `PinoLogger implements ILogger` — wrappea Pino, siempre incluye `correlationId` del contexto actual
- [ ] `InMemoryEventBus implements IEventBus` — para tests y desarrollo
- [ ] `BullMQQueue implements IQueue` — adaptador sobre BullMQ
- [ ] `RedisCache implements ICache` — adaptador sobre ioredis
- [ ] `EnvSecretManager implements ISecretManager` — lee de `process.env`

#### DI Container

- [ ] Elegir e instalar contenedor de DI (recomendado: `tsyringe` o `awilix`)
- [ ] Configurar el container en `apps/api/src/container.ts`
- [ ] Registrar todas las implementaciones de `packages/infrastructure`
- [ ] Exportar función `resolve<T>(token): T`

#### Contexto de request (AsyncLocalStorage)

- [ ] `RequestContext` — usa `AsyncLocalStorage` para propagar `correlationId` y `userId` sin pasarlos explícitamente
- [ ] Middleware Express que inicializa el contexto en cada request
- [ ] `RequestContext.getCorrelationId(): string`
- [ ] `RequestContext.getUserId(): string | null`

#### Specification Pattern

- [ ] `Specification<T>` — interfaz con `isSatisfiedBy(candidate: T): boolean`
- [ ] `AndSpecification<T>` — combina dos specs con AND
- [ ] `OrSpecification<T>` — combina dos specs con OR
- [ ] `NotSpecification<T>` — niega una spec

### Criterios de aceptación

- `packages/domain` no tiene ningún `import` que referencie Express, Prisma, Redis, BullMQ, Axios ni Node built-ins (excepto tipos)
- `PhoneNumber.create("3511234567").getValue().toE164()` === `PhoneNumber.create("+54 351 1234567").getValue().toE164()`
- `Result.ok(42).map(n => n * 2).getValue()` === `84`
- `Result.fail(new ValidationError("bad")).isFail()` === `true`
- Cobertura de tests en `packages/domain/shared` ≥ 95%
- El DI container resuelve `ILogger` sin errores al arrancar la API

---

## Sprint 2 — Workspace y Auth (2 semanas)

**Objetivo:** Plataforma multiusuario y multiempresa operativa. Se puede crear un Workspace, invitar usuarios, hacer login y obtener un JWT.

**Dependencia:** Sprint 1 completado.

### Tareas

#### Domain — Workspace Aggregate

- [ ] `WorkspaceId extends UniqueId`
- [ ] `WorkspaceStatus` enum: `Creating`, `Active`, `Suspended`, `Archived`
- [ ] `WorkspaceSettings` Value Object: `timezone: string`, `locale: string`, `maxContacts: number`, `maxCampaigns: number`
- [ ] `Workspace` Aggregate Root:
  - Campos: `id`, `name`, `slug`, `status`, `settings`, `createdAt`, `updatedAt`
  - `Workspace.create(name, settings): Result<Workspace, DomainError>` — emite `WorkspaceCreated`
  - `workspace.suspend(reason): Result<void, DomainError>` — solo desde `Active`. Emite `WorkspaceSuspended`
  - `workspace.archive(): Result<void, DomainError>` — solo desde `Suspended`. Emite `WorkspaceArchived`. Estado terminal.
  - `workspace.activate(): Result<void, DomainError>` — solo desde `Creating`
  - Invariante: `Archived` no puede pasar a `Active`. Lanza `BusinessRuleViolationError`.
- [ ] Tests unitarios de todas las transiciones de estado

#### Domain — User y Roles

- [ ] `UserId extends UniqueId`
- [ ] `UserRole` enum: `Owner`, `Admin`, `Operator`, `Viewer`
- [ ] `Permission` enum (granular): `campaign:create`, `campaign:update`, `campaign:delete`, `campaign:execute`, `campaign:pause`, `campaign:resume`, `campaign:view`, `contact:import`, `contact:export`, `workspace:transfer`, `billing:view`
- [ ] `RolePermissions` — mapa estático de `UserRole` → `Permission[]`
- [ ] `WorkspaceUser` Value Object: `userId`, `workspaceId`, `role`, `invitedAt`, `joinedAt?`
- [ ] `can(user: WorkspaceUser, permission: Permission): boolean` — función pura en domain

#### Domain — Events de Workspace/Auth

- [ ] `WorkspaceCreated { workspaceId, name, ownerId }`
- [ ] `WorkspaceSuspended { workspaceId, reason }`
- [ ] `WorkspaceArchived { workspaceId }`
- [ ] `UserInvited { workspaceId, userId, email, role }`
- [ ] `UserJoined { workspaceId, userId }`
- [ ] `UserRoleChanged { workspaceId, userId, oldRole, newRole }`
- [ ] `UserRemoved { workspaceId, userId }`

#### Infrastructure — Prisma Schema

- [ ] Modelo `Workspace`: `id`, `name`, `slug`, `status`, `timezone`, `locale`, `maxContacts`, `maxCampaigns`, `createdAt`, `updatedAt`
- [ ] Modelo `User`: `id`, `email`, `passwordHash`, `name`, `createdAt`, `updatedAt`
- [ ] Modelo `WorkspaceUser`: `workspaceId`, `userId`, `role`, `invitedAt`, `joinedAt`, PK compuesta
- [ ] Modelo `RefreshToken`: `id`, `userId`, `token` (hash), `expiresAt`, `revokedAt`, `createdAt`
- [ ] Modelo `AuditLog`: `id`, `workspaceId`, `userId`, `event`, `payload` (JSON), `ip`, `userAgent`, `correlationId`, `createdAt`
- [ ] `prisma migrate dev` crea las tablas correctamente
- [ ] Índices: `workspace(slug)` unique, `user(email)` unique, `refreshToken(token)` unique

#### Infrastructure — Repositories

- [ ] `IWorkspaceRepository extends IRepository<Workspace, WorkspaceId>` — métodos adicionales: `findBySlug(slug): Promise<Result<Workspace, NotFoundError>>`, `existsBySlug(slug): Promise<boolean>`
- [ ] `PrismaWorkspaceRepository implements IWorkspaceRepository` con `WorkspaceMapper`
- [ ] `WorkspaceMapper` — convierte entre Prisma model y Workspace aggregate (sin lógica de negocio)
- [ ] `IUserRepository` — `findByEmail(email): Promise<Result<User, NotFoundError>>`, `findById(id): Promise<...>`
- [ ] `PrismaUserRepository implements IUserRepository`
- [ ] Tests de integración de ambos repositories contra DB real (test database)

#### Application — Auth Use Cases

- [ ] `RegisterWorkspaceCommand { ownerName, ownerEmail, ownerPassword, workspaceName, timezone }` → crea Workspace + User Owner en una sola transacción
- [ ] `LoginCommand { email, password }` → valida credenciales, retorna `{ accessToken, refreshToken }`
- [ ] `RefreshTokenCommand { refreshToken }` → invalida el token actual, emite par nuevo (rotación)
- [ ] `RevokeSessionCommand { userId, refreshToken }` → invalida el refresh token específico
- [ ] `InviteUserCommand { workspaceId, email, role, invitedByUserId }` → crea invitación, emite `UserInvited`
- [ ] `AcceptInvitationCommand { token, name, password }` → activa el usuario, emite `UserJoined`

#### Application — Auth: seguridad

- [ ] Hash de passwords con `bcrypt` (cost factor 12)
- [ ] JWT: `accessToken` expira en 15 minutos, firmado con `JWT_SECRET`
- [ ] JWT payload: `{ sub: userId, workspaceId, role, permissions[] }`
- [ ] `refreshToken`: string aleatorio (32 bytes, hex), se guarda el hash en DB, expira en 30 días
- [ ] Rotación: cada uso de refresh token invalida el anterior y emite uno nuevo

#### Presentation — HTTP

- [ ] `POST /auth/register` — `RegisterWorkspaceCommand`
- [ ] `POST /auth/login` — `LoginCommand`. Respuesta: `{ accessToken, refreshToken, expiresIn }`
- [ ] `POST /auth/refresh` — `RefreshTokenCommand`
- [ ] `POST /auth/logout` — `RevokeSessionCommand`
- [ ] `POST /workspaces/:id/users/invite` — `InviteUserCommand`
- [ ] `POST /invitations/:token/accept` — `AcceptInvitationCommand`
- [ ] `GET /workspaces/:id` — datos del workspace (requiere auth)
- [ ] Middleware `authenticate` — valida JWT, inyecta `user` en el request
- [ ] Middleware `authorize(permission)` — verifica que el usuario tenga el permiso requerido

#### OpenAPI

- [ ] Documentar todos los endpoints de auth en `openapi.yaml`
- [ ] Schemas: `RegisterRequest`, `LoginRequest`, `LoginResponse`, `InviteUserRequest`

### Criterios de aceptación

- `POST /auth/register` crea Workspace + User Owner en DB y retorna tokens válidos
- El accessToken expira en 15 minutos (verificable con `jwt.decode`)
- `POST /auth/refresh` con un refresh token usado dos veces retorna error en el segundo intento (rotación activa)
- `POST /auth/login` con password incorrecto retorna `401` (sin mensaje que indique si el email existe)
- Un request a `GET /workspaces/:id` sin JWT retorna `401`
- Un request con JWT de `Viewer` a un endpoint que requiere `campaign:execute` retorna `403`
- Un Workspace archivado no puede volver a `Active` (verificado con test de dominio)
- Tests de integración de repositories pasan contra base real
- `pnpm build` pasa sin errores de TypeScript

---

## Sprint 3 — Contactos (3 semanas)

**Objetivo:** Base de contactos completa con importación, grupos, etiquetas, opt-out y búsqueda. No hay campaña todavía, pero la audiencia está lista.

**Dependencia:** Sprint 2 completado.

### Tareas

#### Domain — Contact Aggregate

- [ ] `ContactId extends UniqueId`
- [ ] `ContactStatus` enum: `Active`, `Archived`, `Deleted`
- [ ] `ChannelType` enum: `WhatsApp`, `Email`, `SMS`, `Telegram`
- [ ] `ContactChannel` Value Object: `type: ChannelType`, `value: string`, `verified: boolean`, `isPrimary: boolean`
  - Validación según tipo: WhatsApp → PhoneNumber válido; Email → Email válido
- [ ] `ContactIdentity` Value Object: `firstName`, `lastName?`, `company?`, `externalId?`, `notes?`
- [ ] `ContactPreferences` Value Object: `acceptsCampaigns: 'yes' | 'no' | 'unknown'`, `consentSource?: string`, `consentDate?: Date`, `optedOutAt?: Date`, `preferredChannel?: ChannelType`
- [ ] `Contact` Aggregate Root:
  - `Contact.create(workspaceId, identity, channels): Result<Contact, DomainError>` — al menos un channel válido. Emite `ContactCreated`
  - `contact.addChannel(channel): Result<void, DomainError>`
  - `contact.removeChannel(type): Result<void, DomainError>` — no puede quedar sin channels
  - `contact.updateIdentity(identity): Result<void, DomainError>`
  - `contact.optOut(): Result<void, DomainError>` — emite `ContactOptedOut`. Irreversible salvo acción explícita del usuario.
  - `contact.optIn(): Result<void, DomainError>` — solo si fue opt-out previamente
  - `contact.archive(): Result<void, DomainError>` — emite `ContactArchived`
  - `contact.addTag(tag): void`
  - `contact.removeTag(tag): void`
  - `contact.isOptedOut(): boolean` — usado en BR-003
- [ ] Tests unitarios completos: transiciones de estado, validaciones de channel, opt-out

#### Domain — Events de Contactos

- [ ] `ContactCreated { contactId, workspaceId, channels }`
- [ ] `ContactUpdated { contactId, workspaceId, changes }`
- [ ] `ContactOptedOut { contactId, workspaceId, optedOutAt }`
- [ ] `ContactOptedIn { contactId, workspaceId }`
- [ ] `ContactArchived { contactId, workspaceId }`
- [ ] `ContactsImported { workspaceId, total, successful, failed, errors[] }`

#### Domain — Contact Group

- [ ] `GroupId extends UniqueId`
- [ ] `ContactGroup` Entity: `id`, `workspaceId`, `name`, `description?`, `contactCount`
- [ ] `ContactGroup.create(workspaceId, name): Result<ContactGroup, DomainError>`

#### Infrastructure — Prisma Schema

- [ ] Modelo `Contact`: `id`, `workspaceId`, `firstName`, `lastName`, `company`, `externalId`, `notes`, `status`, `acceptsCampaigns`, `consentSource`, `consentDate`, `optedOutAt`, `preferredChannel`, `createdAt`, `updatedAt`
- [ ] Modelo `ContactChannel`: `id`, `contactId`, `workspaceId`, `type`, `value`, `verified`, `isPrimary`, `createdAt`
- [ ] Modelo `ContactTag`: `contactId`, `workspaceId`, `tag` — PK compuesta
- [ ] Modelo `Group`: `id`, `workspaceId`, `name`, `description`, `createdAt`, `updatedAt`
- [ ] Modelo `ContactGroup`: `contactId`, `groupId`, `workspaceId`, `addedAt` — PK compuesta
- [ ] Índices: `(workspaceId, status)`, `(workspaceId, externalId)`, `contact_channel(workspaceId, type, value)` unique
- [ ] `prisma migrate dev`

#### Infrastructure — Repositories

- [ ] `IContactRepository`:
  - `findById(id, workspaceId)`
  - `findByChannel(type, value, workspaceId)`
  - `findByExternalId(externalId, workspaceId)`
  - `search(workspaceId, filters, pagination): Promise<Page<Contact>>`
  - `findByGroup(groupId, workspaceId, pagination)`
  - `countByWorkspace(workspaceId): Promise<number>`
- [ ] `PrismaContactRepository` con `ContactMapper`
- [ ] `IGroupRepository` básico (CRUD)
- [ ] Tests de integración

#### Application — Contact Use Cases

- [ ] `CreateContactCommand { workspaceId, identity, channels, tags?, groupIds? }`
- [ ] `UpdateContactCommand { contactId, workspaceId, identity?, channels?, tags? }`
- [ ] `ArchiveContactCommand { contactId, workspaceId }`
- [ ] `OptOutContactCommand { contactId, workspaceId }`
- [ ] `AddContactToGroupCommand { contactId, groupId, workspaceId }`
- [ ] `RemoveContactFromGroupCommand { contactId, groupId, workspaceId }`
- [ ] `CreateGroupCommand { workspaceId, name, description? }`
- [ ] `SearchContactsQuery { workspaceId, q?, tags?, groupId?, status?, acceptsCampaigns?, page, limit }`
- [ ] `GetContactQuery { contactId, workspaceId }`

#### Application — Importador CSV/Excel

El importador es un proceso en varias etapas que puede tardar minutos. Se ejecuta como un Worker Job.

- [ ] `ImportContactsCommand { workspaceId, fileKey, columnMapping, options }` — dispara un job, retorna `jobId` inmediatamente
- [ ] Worker job `import-contacts`:
  1. Leer archivo desde storage (S3 o disco local en dev)
  2. Parsear CSV/Excel fila por fila (streaming, sin cargar todo en memoria)
  3. Por cada fila: validar campos mapeados, crear `Contact` via dominio
  4. Acumular errores con número de fila y motivo
  5. Persistir en lotes de 100 usando transacción
  6. Al finalizar: emitir `ContactsImported` con resumen
- [ ] `GetImportStatusQuery { jobId, workspaceId }` — retorna progreso y errores parciales
- [ ] Detección de duplicados: si ya existe un Contact con el mismo `(workspaceId, channelType, channelValue)`, actualizar en lugar de crear
- [ ] Soporte para mapeo de columnas flexible (el nombre de columna en el CSV puede ser cualquier cosa)

#### Presentation — HTTP

- [ ] `POST /workspaces/:id/contacts` — crear contacto
- [ ] `GET /workspaces/:id/contacts` — buscar con filtros y paginación
- [ ] `GET /workspaces/:id/contacts/:contactId` — detalle
- [ ] `PATCH /workspaces/:id/contacts/:contactId` — actualizar
- [ ] `DELETE /workspaces/:id/contacts/:contactId` — archivar (no elimina físicamente)
- [ ] `POST /workspaces/:id/contacts/:contactId/opt-out`
- [ ] `POST /workspaces/:id/contacts/import` — retorna `{ jobId }`
- [ ] `GET /workspaces/:id/contacts/import/:jobId` — estado del import
- [ ] `POST /workspaces/:id/groups` — crear grupo
- [ ] `GET /workspaces/:id/groups` — listar grupos
- [ ] `POST /workspaces/:id/groups/:groupId/contacts/:contactId` — agregar contacto a grupo

#### OpenAPI

- [ ] Documentar todos los endpoints de contactos y grupos

### Criterios de aceptación

- `POST /contacts` con número `"3511234567"` y `"5493511234567"` en dos requests devuelve error en el segundo por duplicado (mismo número normalizado)
- Importación de CSV de 5.000 filas completa sin timeout en la API (proceso asincrónico)
- `GET /contacts?q=Juan&tags=premium&groupId=xxx` retorna paginado correctamente
- Un contacto con `optedOutAt` no puede recibir campañas (validado en domain, no en application)
- Un contacto sin channels válidos no puede crearse
- Tests de dominio cubren: crear con channel inválido, opt-out y opt-in, archivar con channels
- Tests de integración del repository pasan

---

## Sprint 4 — Templates (1 semana)

**Objetivo:** Sistema de templates con variables, versionado y vista previa. Usado por Campañas en sprint 5.

**Dependencia:** Sprint 3 completado.

### Tareas

#### Domain — Template

- [ ] `TemplateId extends UniqueId`
- [ ] `TemplateVariable` Value Object: `name: string`, `required: boolean`, `defaultValue?: string`
- [ ] `TemplateContent` Value Object: `body: string`, `variables: TemplateVariable[]`
  - Validación: detecta variables con formato `{{nombre}}`. Verifica que estén balanceadas.
  - `extractVariables(): string[]` — extrae los nombres únicos
  - `render(values: Record<string, string>): Result<string, ValidationError>` — reemplaza variables. Falla si falta alguna requerida.
- [ ] `TemplateVersion` Entity: `version: number`, `content: TemplateContent`, `createdAt`, `createdBy`
- [ ] `Template` Aggregate Root:
  - Campos: `id`, `workspaceId`, `name`, `description?`, `channel: ChannelType`, `versions: TemplateVersion[]`, `activeVersion: number`, `status`
  - `Template.create(workspaceId, name, channel, content): Result<Template, DomainError>`
  - `template.createVersion(content): Result<TemplateVersion, DomainError>` — incrementa versión, no modifica las anteriores
  - `template.activateVersion(version): Result<void, DomainError>`
  - `template.archive(): Result<void, DomainError>`
  - `template.getActiveContent(): TemplateContent`
- [ ] Tests: crear template, agregar versión, render con variables, render con variable faltante

#### Domain — Variable Engine

- [ ] `VariableResolver` Domain Service:
  - `resolve(template: TemplateContent, contact: Contact, campaign: Campaign, custom: Record<string, string>): Result<string, ValidationError>`
  - Variables soportadas: `{{contact.firstName}}`, `{{contact.lastName}}`, `{{contact.company}}`, `{{campaign.name}}`, `{{workspace.name}}`, `{{today}}`, `{{now}}`, `custom.*`
  - Variables no encontradas: retorna `Result.fail` con lista de variables faltantes

#### Infrastructure — Prisma Schema

- [ ] Modelo `Template`: `id`, `workspaceId`, `name`, `description`, `channel`, `activeVersion`, `status`, `createdAt`, `updatedAt`
- [ ] Modelo `TemplateVersion`: `id`, `templateId`, `workspaceId`, `version`, `body`, `variables` (JSON), `createdAt`, `createdBy`

#### Application — Template Use Cases

- [ ] `CreateTemplateCommand { workspaceId, name, channel, body, description? }`
- [ ] `UpdateTemplateCommand { templateId, workspaceId }` — crea nueva versión (no modifica la activa)
- [ ] `ArchiveTemplateCommand { templateId, workspaceId }`
- [ ] `PreviewTemplateQuery { templateId, version?, sampleValues: Record<string, string> }` — retorna el body con variables resueltas usando los valores de ejemplo
- [ ] `GetTemplateQuery { templateId, workspaceId }`
- [ ] `ListTemplatesQuery { workspaceId, channel?, status?, page, limit }`

#### Presentation — HTTP

- [ ] `POST /workspaces/:id/templates`
- [ ] `GET /workspaces/:id/templates`
- [ ] `GET /workspaces/:id/templates/:templateId`
- [ ] `POST /workspaces/:id/templates/:templateId/versions` — nueva versión
- [ ] `POST /workspaces/:id/templates/:templateId/preview` — preview con valores de ejemplo
- [ ] `DELETE /workspaces/:id/templates/:templateId` — archiva

### Criterios de aceptación

- `TemplateContent.render({ nombre: "Gonzalo" })` sobre `"Hola {{nombre}}, tu pedido está listo"` retorna `"Hola Gonzalo, tu pedido está listo"`
- `TemplateContent.render({})` sobre un template con variable requerida retorna `Result.fail` con el nombre de la variable faltante
- Crear versión 2 de un template no modifica la versión 1 (inmutabilidad)
- `POST /templates/:id/preview` con `sampleValues` retorna el texto renderizado
- Variables mal cerradas (`{{nombre`) son detectadas en la validación del body

---

## Sprint 5 — Campañas (sin envío) (3 semanas)

**Objetivo:** El flujo completo de creación, programación y gestión de campañas funciona en el panel. Sin enviar mensajes todavía — eso es Sprint 6+7. Al final de este sprint se puede crear una campaña, programarla, pausarla y cancelarla, y ver su timeline.

**Dependencia:** Sprint 4 completado.

### Tareas

#### Domain — Campaign Aggregate

Este es el aggregate más complejo del sistema. No apresurarse.

- [ ] `CampaignId extends UniqueId`
- [ ] `CampaignStatus` enum: `Draft`, `Scheduled`, `Running`, `Paused`, `Completed`, `Cancelled`, `Archived`
- [ ] `CampaignAudience` Value Object:
  - `type: 'all' | 'group' | 'segment' | 'manual'`
  - `groupIds?: GroupId[]`
  - `contactIds?: ContactId[]`
  - `segmentRules?: SegmentRule[]` (para Sprint futuro)
  - `estimatedCount?: number`
- [ ] `CampaignSchedule` Value Object: `sendAt: Date`, `timezone: string`, `sendNow: boolean`
  - Validación: si `sendNow` es false, `sendAt` no puede ser en el pasado
- [ ] `DeliveryPolicy` Value Object: `maxRetries: number`, `retryDelays: number[]`, `skipOptOut: boolean` (siempre false, BR-003)
- [ ] `CampaignStatistics` Value Object: `total`, `pending`, `queued`, `sending`, `sent`, `delivered`, `read`, `failed`, `cancelled` — todos `number`
- [ ] `CampaignTimelineEntry` Value Object: `event: string`, `occurredAt: Date`, `metadata?: Record<string, unknown>`
- [ ] `Campaign` Aggregate Root:
  - `Campaign.createDraft(workspaceId, name, channel, audience, templateId, schedule?, deliveryPolicy?): Result<Campaign, DomainError>` — emite `CampaignCreated`
  - `campaign.schedule(schedule: CampaignSchedule): Result<void, DomainError>` — solo desde Draft. Emite `CampaignScheduled`
  - `campaign.start(): Result<void, DomainError>` — solo desde Scheduled. Emite `CampaignStarted`
  - `campaign.pause(reason?): Result<void, DomainError>` — solo desde Running. Emite `CampaignPaused`
  - `campaign.resume(): Result<void, DomainError>` — solo desde Paused. Emite `CampaignResumed`
  - `campaign.cancel(reason?): Result<void, DomainError>` — desde Draft, Scheduled, Running o Paused. Emite `CampaignCancelled`
  - `campaign.complete(): Result<void, DomainError>` — solo desde Running. Emite `CampaignCompleted`
  - `campaign.archive(): Result<void, DomainError>` — solo desde Completed o Cancelled. Emite `CampaignArchived`
  - `campaign.updateStatistics(delta: Partial<CampaignStatistics>): void`
  - `campaign.addTimelineEntry(entry): void`
  - `campaign.canStart(): Result<void, DomainError>` — verifica BR-001 (provider conectado), BR-008 (tiene destinatarios)
- [ ] Transiciones prohibidas explícitas: `Draft → Completed`, `Cancelled → Running`, `Archived → *`
- [ ] Tests unitarios: todas las transiciones válidas e inválidas, invariantes, estadísticas

#### Domain — Events de Campaign

- [ ] `CampaignCreated { campaignId, workspaceId, name, channel }`
- [ ] `CampaignScheduled { campaignId, workspaceId, scheduledAt }`
- [ ] `CampaignStarted { campaignId, workspaceId, startedAt }`
- [ ] `CampaignPaused { campaignId, workspaceId, reason? }`
- [ ] `CampaignResumed { campaignId, workspaceId }`
- [ ] `CampaignCancelled { campaignId, workspaceId, reason? }`
- [ ] `CampaignCompleted { campaignId, workspaceId, statistics }`
- [ ] `CampaignArchived { campaignId, workspaceId }`

#### Domain — Specifications de Campaign

- [ ] `CampaignHasAudience` — verifica que `estimatedCount > 0`
- [ ] `CampaignHasValidSchedule` — verifica que `sendAt` no sea pasado
- [ ] `CampaignCanStart` — AND de: `CampaignHasAudience`, `WorkspaceIsActive`

#### Infrastructure — Prisma Schema

- [ ] Modelo `Campaign`: `id`, `workspaceId`, `name`, `slug`, `status`, `channel`, `templateId`, `audienceType`, `audienceGroupIds` (JSON), `audienceContactIds` (JSON), `scheduledAt`, `timezone`, `sendNow`, `maxRetries`, `statistics` (JSON), `timeline` (JSON), `startedAt`, `completedAt`, `cancelledAt`, `createdAt`, `updatedAt`, `createdBy`
- [ ] Índices: `(workspaceId, status)`, `(workspaceId, scheduledAt)`, `(workspaceId, createdAt)`

#### Infrastructure — Repository

- [ ] `ICampaignRepository`:
  - `findById(id, workspaceId)`
  - `findByStatus(workspaceId, statuses: CampaignStatus[], pagination)`
  - `findScheduledBefore(date: Date): Promise<Campaign[]>` — usado por Scheduler
  - `findRunning(workspaceId)`
  - `schedule(campaign)` — persiste estado Scheduled
  - `start(campaign)` — persiste estado Running
  - `pause(campaign)` / `resume(campaign)` / `cancel(campaign)` / `complete(campaign)`
  - `updateStatistics(campaignId, delta)`
- [ ] `PrismaCampaignRepository` con `CampaignMapper`
- [ ] Tests de integración

#### Application — Campaign Use Cases

- [ ] `CreateCampaignCommand { workspaceId, name, channel, audienceType, audienceGroupIds?, audienceContactIds?, templateId, scheduledAt?, timezone?, sendNow?, deliveryPolicy?, userId }`
- [ ] `ScheduleCampaignCommand { campaignId, workspaceId, scheduledAt, timezone, userId }`
- [ ] `PauseCampaignCommand { campaignId, workspaceId, reason?, userId }`
- [ ] `ResumeCampaignCommand { campaignId, workspaceId, userId }`
- [ ] `CancelCampaignCommand { campaignId, workspaceId, reason?, userId }`
- [ ] `ArchiveCampaignCommand { campaignId, workspaceId, userId }`
- [ ] `DuplicateCampaignCommand { campaignId, workspaceId, userId }` — crea Draft con los mismos datos
- [ ] `GetCampaignQuery { campaignId, workspaceId }`
- [ ] `ListCampaignsQuery { workspaceId, status?, page, limit }`
- [ ] `GetCampaignTimelineQuery { campaignId, workspaceId }`

#### Presentation — HTTP

- [ ] `POST /workspaces/:id/campaigns`
- [ ] `GET /workspaces/:id/campaigns` — con filtro por status
- [ ] `GET /workspaces/:id/campaigns/:campaignId`
- [ ] `PATCH /workspaces/:id/campaigns/:campaignId/schedule`
- [ ] `POST /workspaces/:id/campaigns/:campaignId/pause`
- [ ] `POST /workspaces/:id/campaigns/:campaignId/resume`
- [ ] `POST /workspaces/:id/campaigns/:campaignId/cancel`
- [ ] `POST /workspaces/:id/campaigns/:campaignId/archive`
- [ ] `POST /workspaces/:id/campaigns/:campaignId/duplicate`
- [ ] `GET /workspaces/:id/campaigns/:campaignId/timeline`

### Criterios de aceptación

- `campaign.start()` en una campaña `Draft` retorna `Result.fail(BusinessRuleViolationError)` — debe pasar por `schedule` primero
- `campaign.cancel()` en una campaña `Completed` retorna error
- `campaign.archive()` en una campaña `Running` retorna error
- `POST /campaigns` seguido de `POST /campaigns/:id/schedule` seguido de `POST /campaigns/:id/cancel` — la campaña queda en `Cancelled` en DB
- `GET /campaigns?status=Running` retorna solo campañas en ejecución
- El Timeline de la campaña refleja cada cambio de estado con timestamp
- Tests de dominio cubren todas las transiciones válidas e inválidas

---

## Sprint 6 — Execution Engine (3 semanas)

**Objetivo:** Motor de ejecución completo. Al final de este sprint, una campaña programada se procesa, se generan los Deliveries, se encolan y los Workers los procesan. No hay Provider real todavía — se usa el `FakeProvider`.

**Dependencia:** Sprint 5 completado.

### Tareas

#### Domain — Delivery Aggregate

- [ ] `DeliveryId extends UniqueId`
- [ ] `DeliveryStatus` enum: `Pending`, `Queued`, `Sending`, `Sent`, `Delivered`, `Read`, `Failed`, `Cancelled`, `Expired`
- [ ] `DeliveryAttempt` Value Object: `attemptNumber`, `startedAt`, `completedAt?`, `providerMessageId?`, `errorCode?`, `errorMessage?`, `success: boolean`
- [ ] `Delivery` Aggregate Root:
  - Campos: `id`, `campaignId`, `workspaceId`, `contactId`, `channel`, `address` (e164 o email), `messageSnapshot: string`, `status`, `attempts: DeliveryAttempt[]`, `providerMessageId?`, `timeline: TimelineEntry[]`, `createdAt`, `updatedAt`
  - `Delivery.create(campaignId, workspaceId, contact, messageSnapshot): Result<Delivery, DomainError>`
  - `delivery.markQueued(): Result<void, DomainError>`
  - `delivery.markSending(attempt: number): Result<void, DomainError>`
  - `delivery.markSent(providerMessageId: string): Result<void, DomainError>`
  - `delivery.markDelivered(): Result<void, DomainError>`
  - `delivery.markRead(): Result<void, DomainError>`
  - `delivery.markFailed(error: DeliveryAttempt): Result<void, DomainError>`
  - `delivery.canRetry(maxRetries: number): boolean`
  - `delivery.markExpired(): Result<void, DomainError>`
  - `delivery.cancel(): Result<void, DomainError>` — solo si está en Pending o Queued
- [ ] Tests unitarios completos de transiciones

#### Domain — Events de Delivery

- [ ] `DeliveryQueued { deliveryId, campaignId, workspaceId }`
- [ ] `DeliveryFailed { deliveryId, campaignId, workspaceId, attemptNumber, errorCode }`
- [ ] `DeliveryCompleted { deliveryId, campaignId, workspaceId, status }` — para Sent, Delivered, Read
- [ ] `DeliveryExpired { deliveryId, campaignId, workspaceId }`

#### Infrastructure — Prisma Schema

- [ ] Modelo `Delivery`: `id`, `campaignId`, `workspaceId`, `contactId`, `channel`, `address`, `messageSnapshot`, `status`, `providerMessageId`, `attempts` (JSON array), `timeline` (JSON array), `createdAt`, `updatedAt`
- [ ] Índices (crítico para rendimiento): `(workspaceId, campaignId)`, `(workspaceId, status)`, `(providerMessageId)`, `(contactId)`, `(createdAt)` — particionado mensual a configurar en Postgres nativo

#### Infrastructure — Delivery Repository

- [ ] `IDeliveryRepository`:
  - `findById(id, workspaceId)`
  - `findByProviderMessageId(providerMessageId): Promise<Delivery | null>` — usado por webhooks
  - `findByCampaign(campaignId, workspaceId, status?, pagination)`
  - `countByCampaignAndStatus(campaignId, workspaceId): Promise<Record<DeliveryStatus, number>>`
  - `saveBatch(deliveries: Delivery[]): Promise<void>` — transacción, lotes de 500
- [ ] `PrismaDeliveryRepository`

#### Application — AudienceResolver

- [ ] `AudienceResolver` Domain Service:
  - `resolve(campaign: Campaign, workspaceId): Promise<ResolvedContact[]>`
  - Expande `groupIds` a contactos
  - Expande `contactIds` a contactos
  - Aplica BR-003: filtra opt-outs automáticamente
  - Filtra contactos sin canal válido para el canal de la campaña
  - Retorna: `{ contactId, address, estimatedCount }`

#### Application — DeliveryGenerator

- [ ] `DeliveryGenerator` Domain Service:
  - Recibe: `campaign`, lista de `ResolvedContact[]`
  - Renderiza el mensaje para cada contacto usando `VariableResolver`
  - Crea `Delivery` por contacto
  - Persiste en lotes de 500 con `IDeliveryRepository.saveBatch()`
  - Emite `DeliveryQueued` por cada Delivery

#### Application — BatchPlanner

- [ ] `BatchPlanner` Domain Service:
  - `plan(deliveries: DeliveryId[], ratePerMinute: number): Batch[]`
  - Divide los IDs en lotes según la capacidad del Provider
  - Cada `Batch`: `{ batchId, deliveryIds, priority, scheduledAfter: Date }`

#### Infrastructure — BullMQ Queues

- [ ] Queue `campaign` — jobs: `start-campaign`, `pause-campaign`, `resume-campaign`
- [ ] Queue `delivery` — jobs: `send-delivery`
- [ ] Queue `retry` — jobs: `retry-delivery` con delay
- [ ] Queue `webhook` — jobs: `process-webhook`
- [ ] Queue `analytics` — jobs: `update-statistics`
- [ ] Configurar `Bull Board` para visualizar todas las colas en `/admin/queues`

#### Apps — Scheduler

- [ ] `apps/scheduler` — proceso Node.js independiente
- [ ] Cron que corre cada 30 segundos: `SELECT campaigns WHERE status = Scheduled AND scheduledAt <= NOW()`
- [ ] Por cada campaña encontrada: atomicly cambia estado a `Running` (con lock optimista usando `version`), encola job `start-campaign`
- [ ] Idempotencia: si la campaña ya está en `Running`, el Scheduler lo ignora
- [ ] Garantía: nunca procesa la misma campaña dos veces en paralelo (usa `FOR UPDATE SKIP LOCKED` en Postgres)

#### Apps — Worker

- [ ] `apps/worker` — proceso Node.js independiente
- [ ] Handler `start-campaign`:
  1. Carga Campaign desde DB
  2. Llama a `AudienceResolver`
  3. Llama a `DeliveryGenerator`
  4. Llama a `BatchPlanner`
  5. Encola lotes en `delivery` queue con delays según rate
- [ ] Handler `send-delivery`:
  1. Carga Delivery desde DB
  2. Llama a `ProviderOrchestrator.send(delivery)`
  3. En éxito: `delivery.markSent(providerMessageId)`
  4. En error temporal: encola en `retry` queue con backoff
  5. En error permanente: `delivery.markFailed()`, no reintentar
  6. Encola `update-statistics` en analytics queue
- [ ] Handler `retry-delivery`: mismo flujo que `send-delivery` pero incrementa `attemptNumber`
- [ ] Handler `update-statistics`: actualiza `CampaignStatistics` de forma atómica (incremento, no SET)

#### Application — Outbox Worker

- [ ] Proceso que cada 2 segundos lee la tabla `outbox` donde `publishedAt IS NULL`
- [ ] Publica cada evento en BullMQ
- [ ] Marca como publicado: `publishedAt = NOW()`
- [ ] Manejo de errores: si falla la publicación, deja el registro para el próximo ciclo

#### FakeProvider (para tests y desarrollo)

- [ ] `providers/fake` implementa `MessagingProvider`
- [ ] `send()` — simula latencia de 50–200ms, retorna éxito el 95% del tiempo
- [ ] `send()` — retorna error temporal (429) el 3% del tiempo
- [ ] `send()` — retorna error permanente (número inválido) el 2% del tiempo
- [ ] `health()` — siempre retorna `online`
- [ ] Configurable: `FAKE_PROVIDER_SUCCESS_RATE`, `FAKE_PROVIDER_DELAY_MS`

### Criterios de aceptación

- Crear una campaña con 100 contactos, programarla y esperar: en 30 segundos el Scheduler la detecta y empieza a procesarla
- Los 100 Deliveries se crean en DB con estado inicial `Pending`
- Los Workers los procesan y actualizan los estados
- Con `FakeProvider`: al menos el 90% de Deliveries terminan en `Sent` o `Delivered`
- Un Delivery fallido con error temporal (429) se re-encola en `retry-queue` con delay
- Bull Board muestra las colas con los jobs procesados
- `campaign.statistics` se actualiza correctamente al final
- El Scheduler no procesa la misma campaña dos veces (verificado con test de concurrencia)
- `apps/scheduler` y `apps/worker` arrancan como procesos independientes
- Toda la secuencia funciona con `FakeProvider` (sin Meta ni Evolution)

---

## Sprint 7 — Communication Layer (3 semanas)

**Objetivo:** Envío real de WhatsApp funcionando. Al final de este sprint el producto puede venderse: un cliente conecta su cuenta de WhatsApp y envía su primera campaña real.

**Dependencia:** Sprint 6 completado. Decisión tomada sobre qué Provider lanzar primero (Meta o Evolution).

### Tareas

#### Infrastructure — Provider SDK (contratos finales)

- [ ] `MessagingProvider` interface — revisión final con todo lo aprendido en Sprint 6
- [ ] `OutboundMessage` DTO: `to: string`, `body: string`, `mediaUrl?`, `buttons?`, `header?`, `footer?`, `templateName?`, `templateLanguage?`, `templateVariables?`
- [ ] `ProviderResponse` DTO: `providerMessageId: string`, `timestamp: Date`, `raw: unknown`
- [ ] `ProviderError` — tipos: `PermanentError`, `TemporaryError`, `RateLimitError`, `AuthError`, `NetworkError`
- [ ] `HealthStatus` DTO: `status: 'online' | 'degraded' | 'offline'`, `latencyMs: number`, `details?: string`

#### Infrastructure — ProviderRegistry

- [ ] `ProviderRegistry`:
  - `register(provider: MessagingProvider): void`
  - `get(channel: ChannelType, providerId: string): Result<MessagingProvider, NotFoundError>`
  - `list(channel?: ChannelType): MessagingProvider[]`
  - `supports(channel: ChannelType, feature: ProviderFeature): boolean`
- [ ] Al arrancar `apps/api` y `apps/worker`: registra todos los Providers disponibles

#### Infrastructure — ProviderOrchestrator

- [ ] `ProviderOrchestrator`:
  - `resolve(workspaceId, channel): Promise<Result<MessagingProvider, ProviderError>>` — consulta `ChannelConnection` del Workspace, resuelve por prioridad
  - `send(delivery: Delivery): Promise<Result<ProviderResponse, ProviderError>>` — resuelve Provider y llama a `provider.send()`
  - Smart Routing: si el Provider primario falla con `NetworkError` o `TemporaryError`, intenta el siguiente por prioridad
- [ ] Tests unitarios con Providers mock

#### Domain — ChannelConnection Aggregate

- [ ] `ChannelConnectionId extends UniqueId`
- [ ] `ConnectionStatus` enum: `Pending`, `Connected`, `Disconnected`, `Error`
- [ ] `ChannelConnection` Aggregate Root:
  - Campos: `id`, `workspaceId`, `channel`, `providerId`, `status`, `priority`, `enabled`, `credentials` (opaco para el dominio), `capabilities`, `lastHealthCheck`, `createdAt`
  - `ChannelConnection.create(workspaceId, channel, providerId, credentials, priority)`
  - `connection.markConnected(capabilities)`
  - `connection.markDisconnected(reason)`
  - `connection.markError(error)`
  - `connection.disable()` / `connection.enable()`
- [ ] Invariante (BR-002): no puede existir más de un ChannelConnection `enabled` y `Connected` para el mismo `(workspaceId, channel, priority=1)`

#### Infrastructure — Prisma Schema (ChannelConnection)

- [ ] Modelo `ChannelConnection`: `id`, `workspaceId`, `channel`, `providerId`, `status`, `priority`, `enabled`, `credentialsEncrypted` (AES-256), `capabilities` (JSON), `lastHealthCheck`, `createdAt`, `updatedAt`
- [ ] `ChannelConnectionRepository`

#### Infrastructure — Cifrado de credenciales

- [ ] `CredentialEncryption` service: `encrypt(plaintext): string`, `decrypt(ciphertext): string`
- [ ] Usa AES-256-GCM con key derivada de `ENCRYPTION_KEY` env var
- [ ] Las credenciales se cifran antes de persistir y se descifran al leer. Nunca pasan por logs.

#### Provider — Meta Cloud API

- [ ] `providers/meta/MetaProvider implements MessagingProvider`
- [ ] Configuración: `phoneNumberId`, `accessToken`, `webhookVerifyToken`, `apiVersion`
- [ ] `connect()` — valida `accessToken` contra Graph API
- [ ] `send(message)` — `POST /messages` a la API de WhatsApp Business
  - Soporte: texto simple, imagen, documento, template con variables
  - Manejo de errores: 429 → `RateLimitError`, 401 → `AuthError`, 5xx → `TemporaryError`, error de número → `PermanentError`
- [ ] `health()` — `GET /health` a la Graph API
- [ ] `capabilities()` — `{ supportsTemplates: true, supportsMedia: true, supportsButtons: true, maxMessagesPerMinute: 100 }`
- [ ] Tests de integración con la API real (con credenciales de test) o mock de Axios

#### Provider — Evolution API

- [ ] `providers/evolution/EvolutionProvider implements MessagingProvider`
- [ ] Configuración: `baseUrl`, `apiKey`, `instanceName`
- [ ] `connect()` — verifica que la instancia exista y esté autenticada
- [ ] `send(message)` — `POST /message/sendText` o `sendMedia`
  - Manejo de errores según códigos de Evolution API
- [ ] `health()` — `GET /instance/connectionState/:instance`
- [ ] `capabilities()` — `{ supportsTemplates: false, supportsMedia: true, supportsButtons: true, maxMessagesPerMinute: 30 }`

#### Apps — Webhook

- [ ] `apps/webhook` — proceso Express independiente
- [ ] `GET /webhook/meta` — endpoint de verificación (challenge de Meta)
- [ ] `POST /webhook/meta` — recibe eventos de Meta: `messages.sent`, `messages.delivered`, `messages.read`, `messages.failed`
  - Valida firma HMAC con `WEBHOOK_VERIFY_TOKEN`
  - Encola job en `webhook-queue` inmediatamente (responde 200 en < 50ms)
- [ ] `POST /webhook/evolution` — recibe eventos de Evolution API
- [ ] Handler `process-webhook` en Worker:
  - Busca Delivery por `providerMessageId`
  - Actualiza estado: `Sent → Delivered`, `Delivered → Read`, etc.
  - Encola `update-statistics`

#### Application — ChannelConnection Use Cases

- [ ] `ConnectProviderCommand { workspaceId, channel, providerId, credentials, priority?, userId }` — cifra credenciales, llama a `provider.connect()`, crea `ChannelConnection`
- [ ] `DisconnectProviderCommand { connectionId, workspaceId, userId }`
- [ ] `GetChannelStatusQuery { workspaceId, channel }` — retorna estado de todas las conexiones del canal
- [ ] `HealthCheckCommand { connectionId, workspaceId }` — llama a `provider.health()`, actualiza `lastHealthCheck`

#### Presentation — HTTP (Canales)

- [ ] `POST /workspaces/:id/channels/connect`
- [ ] `POST /workspaces/:id/channels/:connectionId/disconnect`
- [ ] `GET /workspaces/:id/channels` — lista todas las conexiones
- [ ] `GET /workspaces/:id/channels/:channel/status` — estado del canal
- [ ] `POST /workspaces/:id/channels/:connectionId/health-check`

#### Monitoring — Provider Health Dashboard

- [ ] Métrica Prometheus: `provider_health_status{provider, workspace}` — gauge 0/1
- [ ] Métrica Prometheus: `provider_latency_ms{provider}` — histograma
- [ ] Métrica Prometheus: `messages_sent_total{provider, status}` — counter
- [ ] Panel Grafana con estado de todos los Providers

### Criterios de aceptación

- `POST /channels/connect` con credenciales de Meta válidas crea un `ChannelConnection Connected`
- `POST /channels/connect` con credenciales inválidas retorna error con mensaje claro
- Crear una campaña de 10 contactos con Meta como Provider: los 10 mensajes llegan al WhatsApp real
- El webhook de Meta actualiza el estado del Delivery de `Sent` a `Delivered` cuando WhatsApp confirma
- Si Meta devuelve 429, el Worker re-encola con delay. El mensaje se envía en el reintento.
- Si Meta devuelve error de número inválido, el Delivery queda en `Failed` sin reintento
- Las credenciales de Meta en DB están cifradas (verificar con `SELECT credentialsEncrypted FROM channel_connection`)
- `GET /channels/status` muestra latencia y estado del Provider en tiempo real
- `apps/webhook` valida la firma HMAC de Meta y rechaza requests sin firma válida

---

## Sprint 8 — Analytics (2 semanas)

**Objetivo:** Dashboard, KPIs y reportes. El cliente puede ver qué está pasando con sus campañas.

**Dependencia:** Sprint 7 completado.

### Tareas

#### Application — Analytics Queries

- [ ] `GetDashboardQuery { workspaceId, period: '24h' | '7d' | '30d' }`:
  - Campañas activas, programadas
  - Mensajes enviados, entregados, leídos, fallidos en el período
  - Tasa de entrega, tasa de lectura
  - Actividad reciente (últimos 10 eventos del workspace)
- [ ] `GetCampaignStatsQuery { campaignId, workspaceId }`:
  - Totales por estado
  - Tasa de entrega, tasa de lectura
  - Distribución de errores por tipo
  - Distribución de envíos por hora
- [ ] `CompareCampaignsQuery { workspaceId, campaignIds: CampaignId[] }` — métricas comparativas
- [ ] `GetTopCampaignsQuery { workspaceId, metric: 'deliveryRate' | 'readRate', limit: number }`
- [ ] `GetDeliveryBreakdownQuery { campaignId, workspaceId, groupBy: 'status' | 'hour' | 'provider' }`

#### Infrastructure — Analytics optimizado

Las queries de analytics no deben impactar las tablas transaccionales. Estrategia:

- [ ] Vista materializada `campaign_daily_stats` — actualizada por el `analytics-queue` Worker
- [ ] Tabla `analytics_snapshot` — snapshot diario por campaña, generado por un cron nocturno
- [ ] Para el MVP: queries directas con índices bien definidos son suficientes. La vista materializada es para escala.

#### Presentation — HTTP

- [ ] `GET /workspaces/:id/analytics/dashboard?period=7d`
- [ ] `GET /workspaces/:id/analytics/campaigns/:campaignId`
- [ ] `GET /workspaces/:id/analytics/campaigns/compare?ids=a,b,c`
- [ ] `GET /workspaces/:id/analytics/campaigns/top?metric=readRate`
- [ ] `GET /workspaces/:id/analytics/campaigns/:campaignId/deliveries?groupBy=status`
- [ ] `GET /workspaces/:id/analytics/campaigns/:campaignId/export` — CSV con detalle de todos los Deliveries

#### Grafana — Dashboards

- [ ] Dashboard "Platform Overview": requests por segundo, latencia P95, error rate, tamaño de colas
- [ ] Dashboard "Campaign Execution": jobs procesados por minuto, duración media de procesamiento, delivery rate en tiempo real
- [ ] Dashboard "Provider Health": estado, latencia y cuota de cada Provider

### Criterios de aceptación

- `GET /analytics/dashboard?period=7d` retorna datos correctos verificados contra la DB
- El export CSV de una campaña de 1.000 contactos descarga en menos de 5 segundos
- Los Grafana dashboards muestran datos reales de la última hora de operación
- Las queries de analytics no hacen full table scan en la tabla `delivery` (verificar con `EXPLAIN ANALYZE`)

---

## Sprint 9 — Hardening (2 semanas)

**Objetivo:** El producto está listo para venderse. Seguro, performante, observable, con backups y documentación final.

**Dependencia:** Sprint 8 completado.

### Tareas

#### Performance

- [ ] Revisar todas las queries con `EXPLAIN ANALYZE` — ninguna debe hacer Seq Scan en tablas grandes
- [ ] Caché Redis para: datos del Workspace (TTL 5min), permisos del usuario (TTL 5min), templates (TTL 10min)
- [ ] Paginación cursor-based en lugar de offset para listas grandes (contacts, deliveries)
- [ ] Compression middleware en Express (gzip)
- [ ] Rate limiting en todos los endpoints: 100 req/min por IP, 1000 req/min por workspace

#### Seguridad

- [ ] Audit de dependencias: `pnpm audit` — resolver vulnerabilidades críticas y altas
- [ ] Headers de seguridad con `helmet`
- [ ] Validación de todos los inputs de entrada con `zod` (ya debería estar, revisión final)
- [ ] SQL injection: verificar que Prisma usa queries parametrizadas en todos los casos (sí lo hace, pero verificar raw queries)
- [ ] CORS configurado correctamente para producción
- [ ] Secrets: verificar que ningún secret aparece en logs (revisar toda la codebase)
- [ ] Test de sesiones: revocar refresh token, verificar que no se puede usar

#### Observabilidad final

- [ ] Alertas en Grafana:
  - Queue size > 10.000 jobs → alerta crítica
  - Provider offline > 5 minutos → alerta crítica
  - Error rate > 5% en últimos 10 minutos → alerta alta
  - Delivery failed rate > 10% → alerta alta
- [ ] Logs de auditoría para todas las acciones del catálogo (Sprint 2 sentó la base — completar lo que falta)
- [ ] Tracing con OpenTelemetry: cada request tiene trace que atraviesa API → Worker → Provider

#### Backups y operaciones

- [ ] Script de backup de PostgreSQL a S3 (o local en dev)
- [ ] Script de restauración probado
- [ ] `apps/cli` con comandos: `bcp workspace:list`, `bcp campaign:status <id>`, `bcp delivery:retry <campaignId>`, `bcp db:migrate`, `bcp db:seed` (datos de demostración)
- [ ] Documentación de operaciones: cómo levantar, cómo escalar Workers, cómo agregar un Provider

#### Documentación final

- [ ] `README.md` en raíz: qué es BCP, cómo levantar el proyecto, cómo correr tests
- [ ] `docs/OPERATIONS.md`: guía de operaciones para el comprador (levantar, escalar, monitorear)
- [ ] `docs/PROVIDERS.md`: cómo agregar un nuevo Provider (paso a paso con código de ejemplo)
- [ ] `docs/openapi/openapi.yaml`: completo y actualizado
- [ ] Cada Provider tiene su propio `README.md` con: qué necesita, cómo configurar, limitaciones conocidas

#### Tests E2E finales

- [ ] Flujo completo: `register → login → connect provider → import contacts → create campaign → send campaign → verify deliveries`
- [ ] Flujo de error: Provider caído → retry → recovery
- [ ] Flujo de opt-out: marcar contacto → lanzar campaña → verificar que no recibió mensaje

### Criterios de aceptación

- `GET /workspaces/:id/contacts` con 50.000 contactos responde en < 200ms con índices correctos
- `pnpm audit` sin vulnerabilidades críticas ni altas
- El flujo E2E completo pasa sin errores
- Un nuevo desarrollador puede levantar el proyecto completo siguiendo solo el `README.md`
- Las alertas de Grafana disparan correctamente en los umbrales definidos
- La documentación `PROVIDERS.md` permite implementar un Provider nuevo sin consultar el código existente

---

## Notas generales

**Convenciones de commits:**
```
feat(domain): add Campaign aggregate with state machine
feat(api): add POST /campaigns endpoint
fix(worker): handle 429 rate limit from Meta provider
test(campaign): add missing state transition tests
chore(deps): upgrade BullMQ to v5
```

**Branches:**
- `main` — siempre estable y deployable
- `sprint/N` — rama del sprint activo
- `feat/nombre` — features individuales dentro del sprint

**Pull Requests:** Todo código entra por PR a `sprint/N`. Ningún push directo a `main`. El PR requiere que el CI pase.

**Tests:** Los tests se escriben junto con el código. No hay "sprint de testing" separado. Un feature sin test no está terminado (ver DoD en `BCP-SPECIFICATION.md`).
