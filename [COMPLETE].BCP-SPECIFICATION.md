# BROTE Communication Platform — Especificación del Producto

**Estado del documento:** ✅ COMPLETO — Especificación del alcance ejecutado en Sprints 0–9.4. Decisiones posteriores viven en [IN_DEV].ROADMAP.md.


**Versión:** 1.0  
**Estado:** Definitivo  
**Fecha:** 2026-07-02  
**Autor:** BROTE  

> **Actualización de negocio (2026-07-17):** esta especificación cubre el alcance ejecutado en Sprints 0–9.4 (broadcast engine WhatsApp). Las decisiones de producto posteriores — expansión multicanal, inbox conversacional, flow builder, diferenciación como plataforma self-hosted/open-core y compliance regional — están definidas en [`[IN_DEV].ROADMAP.md`](./[IN_DEV].ROADMAP.md) y no modifican retroactivamente este documento.

---

## Índice

1. [Por qué existe este producto](#1-por-qué-existe-este-producto)
2. [Visión, Misión y Filosofía](#2-visión-misión-y-filosofía)
3. [Mercado objetivo y modelo comercial](#3-mercado-objetivo-y-modelo-comercial)
4. [Lenguaje ubicuo](#4-lenguaje-ubicuo)
5. [Arquitectura del sistema](#5-arquitectura-del-sistema)
6. [Diseño del dominio](#6-diseño-del-dominio)
7. [Estrategia de proveedores](#7-estrategia-de-proveedores)
8. [Infraestructura y persistencia](#8-infraestructura-y-persistencia)
9. [Colas y ejecución asincrónica](#9-colas-y-ejecución-asincrónica)
10. [Seguridad](#10-seguridad)
11. [Observabilidad](#11-observabilidad)
12. [Especificación funcional (SRS)](#12-especificación-funcional-srs)
13. [Especificación de producto (UX)](#13-especificación-de-producto-ux)
14. [Especificación de implementación](#14-especificación-de-implementación)
15. [Roadmap de desarrollo](#15-roadmap-de-desarrollo)
16. [Decisiones arquitectónicas (ADR)](#16-decisiones-arquitectónicas-adr)
17. [Definición de hecho (DoD)](#17-definición-de-hecho-dod)

---

## 1. Por qué existe este producto

### El problema

El mercado de mensajería empresarial tiene dos tipos de soluciones, y ambas fallan en distintos frentes.

**Herramientas simples** (scripts, apps de difusión, automatizaciones básicas)  
No escalan. Sin trazabilidad. Sin integración. Alto riesgo operativo. Difícil mantenimiento.

**Plataformas SaaS grandes** (Twilio, ManyChat, WATI, Interakt)  
Costos crecientes con el volumen. Dependencia tecnológica total. Funcionalidades genéricas. Sin personalización real. El cliente nunca es dueño de sus datos.

### La oportunidad

Existe un espacio intermedio sin cubrir: empresas que necesitan una plataforma profesional, con control propio, personalizable, escalable y sin lock-in.

**BCP cubre exactamente ese espacio.**

### Lo que BCP NO es

BCP no pretende competir con ManyChat, HubSpot, Salesforce ni Twilio. No es un CRM, un helpdesk, un sistema de tickets ni una mesa de soporte. Esos módulos pueden incorporarse en versiones futuras, pero nunca serán el núcleo del producto.

---

## 2. Visión, Misión y Filosofía

### Visión

No construir un software que envíe mensajes.  
Construir la infraestructura de comunicación de una empresa.

Hoy el canal es WhatsApp. Mañana puede ser Email, SMS, Telegram, Instagram, Messenger, RCS, o cualquier canal que aún no existe. El dominio nunca cambiará.

### Misión

Permitir que cualquier empresa pueda automatizar sus comunicaciones manteniendo el control absoluto sobre sus datos, su infraestructura y sus procesos.

### Filosofía BROTE

El cliente compra una solución, no alquila una plataforma.

- El código queda documentado.
- La infraestructura queda documentada.
- El conocimiento queda documentado.
- El cliente puede continuar el proyecto con cualquier equipo.

Esa independencia forma parte del producto.

### Los 10 principios de ingeniería de BROTE

1. **El dominio manda.** Ninguna tecnología puede condicionar el negocio.
2. **Todo reemplazable.** Frameworks, ORMs, proveedores y librerías son temporales.
3. **Documentación viva.** La documentación evoluciona junto con el código.
4. **El código explica el cómo. La documentación explica el porqué.**
5. **La observabilidad no es opcional.** Todo sistema debe ser medible.
6. **La seguridad es transversal.** No existe una "fase de seguridad".
7. **La automatización primero.** Si una tarea puede automatizarse, no debería depender de una persona.
8. **El cliente es dueño de la solución.** Sin lock-in innecesario.
9. **El producto evoluciona por eventos, no por parches.** Cada cambio importante tiene una decisión arquitectónica detrás.
10. **La simplicidad es una característica.** Si una solución necesita demasiadas explicaciones, probablemente aún no esté bien diseñada.

### Criterios de éxito del producto

El proyecto se considera exitoso cuando:

- Agregar un nuevo canal requiere menos de un día de trabajo.
- Agregar un proveedor no implica modificar el dominio.
- El envío de un millón de mensajes puede escalar horizontalmente.
- El dominio permanece inalterado durante años.
- Cualquier desarrollador puede comprender la arquitectura únicamente leyendo la documentación.

---

## 3. Mercado objetivo y modelo comercial

### Segmentos

| Segmento | Perfil | Necesidades principales |
|---|---|---|
| **Starter** | Empresas pequeñas, hasta 10.000 contactos, pocas campañas | Rapidez de puesta en marcha, presupuesto reducido |
| **Growth** | Empresas medianas, decenas de miles de contactos, campañas frecuentes | Integraciones, múltiples usuarios, segmentación avanzada |
| **Enterprise** | Grandes empresas, múltiples canales, alta disponibilidad | Integraciones ERP, auditoría, observabilidad, RBAC avanzado |

### Modelo de productos

BCP se vende en dos presentaciones que comparten exactamente el mismo dominio:

| Producto | Canal de envío | Proveedor |
|---|---|---|
| **Starter** | WhatsApp | WhatsApp Web vía Evolution API o WPPConnect |
| **Professional** | WhatsApp | API Oficial de Meta Cloud |

La única diferencia entre ambos es el Provider configurado. El dominio, la lógica de negocio, las campañas, los contactos y la experiencia de usuario son idénticos.

### Diferencial de BROTE

BROTE no vende licencias. BROTE entrega soluciones.

Cada cliente es propietario de:
- Su infraestructura
- Su número de teléfono
- Su cuenta de proveedor
- Sus datos
- El código contratado

No existe lock-in tecnológico. Ese principio debe mantenerse durante toda la vida del proyecto.

---

## 4. Lenguaje ubicuo

Todos los miembros del proyecto — ingenieros, diseñadores, QA, clientes — deben usar exactamente la misma terminología. No existen sinónimos. Los términos que aparecen en esta sección son los únicos válidos en código, base de datos, API, documentación, interfaz y reuniones.

### Entidades principales

| Término | Definición | Sinónimos PROHIBIDOS |
|---|---|---|
| **Workspace** | Empresa que utiliza la plataforma | Empresa, Cliente, Tenant, Organización |
| **User** | Persona que accede al sistema. Administra la plataforma, nunca envía mensajes directamente | — |
| **Contact** | Persona o empresa destinataria de mensajes. Nunca inicia sesión ni posee permisos | Destinatario, Lead, Cliente |
| **Contact Group** | Conjunto de contactos (Clientes Córdoba, Prospectos Premium) | Lista, Audiencia |
| **Campaign** | Proceso organizado para enviar un mensaje a múltiples contactos | Envío masivo, Blast |
| **Broadcast** | Proceso técnico que ejecuta el envío de una Campaign. No es visible para el usuario | — |
| **Delivery** | Resultado individual del envío de un mensaje. Existe uno por contacto | — |
| **Message** | Unidad mínima de comunicación (texto, imagen, documento, variables, botones) | Texto, SMS |
| **Template** | Modelo reutilizable de mensaje con variables | — |
| **Channel** | Medio de comunicación (WhatsApp, Email, SMS, Telegram) | — |
| **Provider** | Implementación técnica utilizada para enviar mensajes (Meta, Evolution, SMTP) | Servicio, Integración |
| **ChannelConnection** | Vínculo entre un Workspace, un Channel y un Provider específico | — |
| **Scheduler** | Servicio que detecta campañas listas para ejecutarse y dispara eventos. Nunca envía mensajes | — |
| **Queue** | Cola de procesamiento que desacopla el envío | — |
| **Worker** | Proceso que consume mensajes desde una Queue | — |
| **Retry** | Nuevo intento de envío luego de un error | — |
| **Rate Limit** | Cantidad máxima de mensajes permitidos por período. Pertenece al Provider, nunca al dominio | — |
| **Session** | Estado de autenticación de un Provider que requiere login (ej: WhatsApp Web) | — |
| **Conversation** | Conjunto de mensajes entre una empresa y un contacto. No forma parte del MVP | — |

### Estados de Delivery

```
Pending → Queued → Sending → Sent → Delivered → Read
                                           ↑
                              Failed → Retry → Sending
```

Transiciones válidas:
- `Failed` puede reintentar. `Failed → Retry → Sending`.
- `Failed` nunca pasa directamente a `Delivered`. Debe re-enviarse.
- `Pending` nunca puede volver a `Pending` una vez avanzado.

### Estados de Campaign

```
Draft → Scheduled → Running → Completed
                 ↘ Paused ↗
                 → Cancelled
Completed → Archived
```

Transiciones inválidas: `Draft → Completed`. Toda campaña debe pasar por validación y programación.

### Estados de Workspace

```
Creating → Active → Suspended → Archived
```

`Archived` es terminal. Un Workspace archivado nunca puede volver a `Active`. Se crea uno nuevo.

---

## 5. Arquitectura del sistema

### Principio central

La arquitectura permite reemplazar cualquier tecnología sin modificar el dominio. El dominio representa el negocio. Todo lo demás representa implementación.

### Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│         HTTP API  │  Workers  │  Scheduler  │  Webhooks      │
│                (todos usan los mismos Use Cases)             │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                          │
│           Use Cases  │  Commands  │  Queries                 │
│           DTOs  │  Mappers  │  Validators  │  Ports          │
├─────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                            │
│     Entities  │  Aggregates  │  Value Objects  │  Events     │
│     Domain Services  │  Repositories (interfaces)           │
│     Specifications  │  Policies  │  Factories               │
├─────────────────────────────────────────────────────────────┤
│                 INFRASTRUCTURE LAYER                         │
│   Prisma  │  Redis  │  BullMQ  │  Logger  │  Providers      │
│   HTTP Clients  │  Webhooks  │  Monitoring  │  Security      │
└─────────────────────────────────────────────────────────────┘
```

**Regla de dependencias:** Las dependencias apuntan hacia adentro. Infrastructure depende de Domain. Nunca al revés.

**Verificación:** Si se elimina toda la capa de Infrastructure, el Domain debe seguir compilando sin errores.

**Regla del dominio puro:** El Domain nunca importa Express, Prisma, BullMQ, Redis, Axios, Node, Meta, WPPConnect, ni ninguna librería externa.

### Bounded Contexts

| Contexto | Responsabilidades |
|---|---|
| **Workspace** | Empresas, usuarios, permisos, configuración, límites, billing |
| **Contacts** | Contactos, grupos, etiquetas, importaciones, consentimiento |
| **Campaigns** | Campañas, programación, audiencia, estado, reglas de negocio |
| **Messaging** | Construcción del mensaje, variables, renderizado, validación |
| **Delivery** | Seguimiento individual, intentos, resultados, timeline |
| **Providers** | Adaptadores de Meta, Evolution, SMTP, Telegram, SMS |
| **Scheduler** | Detección y disparo de campañas programadas |
| **Analytics** | Métricas, dashboards, KPIs, exportaciones |
| **Observability** | Logs, auditoría, tracing, métricas de sistema |

### Relación entre contextos

```
              Workspace
         /        |        \
   Contacts   Campaigns   Analytics
         \        |        /
           Messaging/Delivery
                  |
           Provider Orchestrator
          /    |    |    \
        Meta  Evol  SMTP  Telegram
```

### Estructura del monorepo

```
bcp/
├── apps/
│   ├── api/           # HTTP — solo expone endpoints, sin lógica
│   ├── admin/         # Frontend (panel de administración)
│   ├── worker/        # Consume colas, ejecuta Providers
│   ├── scheduler/     # Detecta campañas, genera eventos
│   ├── webhook/       # Recibe eventos externos, dispara Use Cases
│   └── cli/           # Herramientas internas, migraciones, importaciones
│
├── packages/
│   ├── domain/        # Núcleo del negocio (sin dependencias externas)
│   │   ├── workspace/
│   │   ├── contacts/
│   │   ├── campaign/
│   │   ├── delivery/
│   │   ├── messaging/
│   │   └── shared/    # Shared Kernel
│   ├── application/   # Use Cases, Commands, Queries, DTOs
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── handlers/
│   │   ├── dto/
│   │   ├── mappers/
│   │   └── ports/
│   ├── infrastructure/
│   │   ├── prisma/
│   │   ├── redis/
│   │   ├── bullmq/
│   │   ├── logger/
│   │   ├── monitoring/
│   │   └── security/
│   ├── contracts/     # Interfaces: IRepository, IProvider, IEventBus...
│   ├── sdk/           # SDK público TypeScript/Node
│   ├── common/        # Utilidades compartidas
│   ├── testing/       # Helpers, fakes, factories para tests
│   └── ui/            # Componentes de interfaz
│
├── providers/         # Paquetes independientes (pueden publicarse como npm)
│   ├── meta/
│   ├── evolution/
│   ├── wppconnect/
│   ├── smtp/
│   ├── telegram/
│   ├── sms/
│   ├── fake/          # Proveedor falso para desarrollo
│   └── testing/       # Proveedor mock para tests
│
├── prisma/            # Schema y migraciones de base de datos
├── docs/              # Documentación técnica
│   ├── adr/           # Decisiones arquitectónicas
│   └── openapi/       # Contratos de API
├── docker/            # Docker Compose y configuraciones
├── scripts/           # Scripts de automatización
├── monitoring/        # Configuración de Prometheus, Grafana, Loki, Tempo
└── .github/           # CI/CD pipelines
```

**Por qué monorepo:** Los cuatro ejecutables (API, Worker, Scheduler, Webhook) comparten exactamente las mismas entidades, value objects, eventos y casos de uso. El monorepo evita duplicar código y garantiza consistencia.

**Por qué providers fuera de infrastructure:** Porque son completamente independientes del núcleo. En el futuro pueden publicarse como paquetes npm privados (`@brote/provider-meta`, `@brote/provider-evolution`) y ser instalados por cualquier implementación de BCP.

### Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | Node.js + TypeScript | Ecosistema maduro, tipado estático, excelente soporte async |
| HTTP | Express | Simple, ampliamente conocido, fácil de reemplazar |
| ORM | Prisma | Type-safe, migraciones automáticas, excelente DX |
| Base de datos | PostgreSQL | ACID, particionado nativo, índices avanzados |
| Cache / Pub-Sub | Redis | Estándar para BullMQ, sessions, caché de consultas |
| Colas | BullMQ | Construido sobre Redis, reintentos, prioridades, dashboards |
| Logs | Winston / Pino | — |
| Métricas | Prometheus | Estándar de la industria |
| Dashboards | Grafana | Integración nativa con Prometheus, Loki, Tempo |
| Logs centralizados | Loki | Stack Grafana |
| Tracing | Tempo | Stack Grafana |
| Auth | JWT + Refresh Token Rotation | Estándar, sin estado, revocable |
| Autorización | RBAC + Permisos granulares | Flexible y auditable |
| API docs | OpenAPI 3.x | Contrato entre frontend y backend |
| Contenedores | Docker + Docker Compose | Portabilidad, reproducibilidad |
| Monorepo | Turborepo + pnpm | Build incremental, workspaces |
| CI/CD | GitHub Actions | — |

---

## 6. Diseño del dominio

### Shared Kernel

El Shared Kernel contiene únicamente abstracciones verdaderamente compartidas. Nada de lógica de negocio específica.

```
packages/domain/shared/
├── AggregateRoot        # Base para todos los aggregates
├── Entity               # Base para todas las entidades
├── ValueObject          # Base para todos los value objects
├── DomainEvent          # Base para todos los eventos de dominio
├── Specification        # Patrón de especificación
├── Result               # Result<T, E> para errores sin excepciones
├── Either               # Left / Right
├── UniqueId             # Generador de IDs (ULID)
├── Clock                # Abstracción de tiempo (testeable)
├── PhoneNumber          # Value Object: número normalizado
├── Email                # Value Object: email validado
├── Money                # Value Object: monto con moneda
└── Locale               # Zona horaria e idioma
```

**Estrategia de IDs:** ULID para entidades principales (Workspace, Campaign, Contact, Delivery). Orden temporal garantizado. Mejores índices que UUID v4 aleatorio.

### AggregateRoot — Base

Todos los aggregates heredan de `AggregateRoot`:

```typescript
abstract class AggregateRoot {
  protected readonly _id: UniqueId
  private _domainEvents: DomainEvent[] = []
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly correlationId: string

  protected addDomainEvent(event: DomainEvent): void
  clearDomainEvents(): DomainEvent[]
}
```

### Aggregate 1 — Workspace

Aggregate Root principal. Todo pertenece a un Workspace. No existe nada "global".

```
Workspace
├── WorkspaceSettings   (timezone, idioma, límites)
├── Users               (con roles)
├── ChannelConnections  (Canal + Provider + credenciales)
└── AuditConfiguration
```

**Invariantes:**
- Siempre tiene al menos un Owner.
- Siempre tiene configuración regional y zona horaria.
- Siempre tiene un estado definido.
- Siempre tiene límites configurados.

**Responsabilidades:** Administra el entorno. Nunca conoce campañas. Nunca envía mensajes.

### Aggregate 2 — Contact

```
Contact
├── Identity            (nombre, apellido, empresa, documento, observaciones)
├── Channels            (lista de canales con tipo, valor, verificado, principal)
├── Tags                (etiquetas libres)
├── Groups              (grupos asignados)
├── Preferences         (acepta campañas, horario permitido, idioma, canal preferido, opt-out)
├── Metadata            (datos personalizados clave-valor)
└── Statistics          (mensajes enviados, respondidos, leídos, última campaña)
```

**Por qué `Channels` en lugar de `phone`:** Un mismo contacto puede tener WhatsApp, Email y Telegram. La abstracción de Canal permite agregar medios futuros sin modificar el aggregate.

**Value Object `PhoneNumber`:** No es un string. Normaliza `3511234567`, `+54 351 1234567`, `03511234567` y `5493511234567` al mismo valor internamente (formato E.164).

### Aggregate 3 — Campaign

El corazón del sistema. Contiene la mayor parte de la lógica de dominio.

```
Campaign
├── Audience            (segmentos, grupos, filtros, contactos individuales)
├── Content             (message o template con variables)
├── Schedule            (fecha, hora, timezone, prioridad)
├── Execution           (plan de ejecución, estado actual)
├── Statistics          (enviados, entregados, leídos, fallidos)
├── DeliveryPolicy      (retries, timeouts, ventanas horarias)
├── ProviderSelection   (canal, proveedor preferido, estrategia de fallback)
└── Status
```

**Regla fundamental:** La campaña decide, los Workers ejecutan.

```typescript
// CORRECTO
campaign.start()  // emite CampaignStartedEvent

// NUNCA JAMÁS
campaign.send()
```

**Casos de uso del aggregate:** Create → Validate → Schedule → Pause → Resume → Cancel → Archive

### Aggregate 4 — Message

```
Message
├── Content             (texto, encoding, longitud, vista previa)
├── Variables           (lista de variables requeridas y sus valores)
├── Attachments         (imágenes, documentos, audio, video)
├── Buttons             (botones de respuesta, CTAs)
├── Header              (encabezado multimedia)
├── Footer              (pie de mensaje)
└── Validation          (reglas de validación según canal)
```

Las variables pertenecen al dominio, no al Provider. El dominio trabaja con `{{contact.name}}`. El Provider recibe el mensaje ya renderizado.

### Aggregate 5 — Delivery

El aggregate más voluminoso por cantidad de registros. Uno por contacto por campaña.

```
Delivery
├── Recipient           (contactId, channel, address)
├── Message             (snapshot del mensaje enviado — no depende del template)
├── Attempts            (lista de intentos, cada uno con timestamp y resultado)
├── Status              (estado actual)
├── ProviderResponse    (respuesta cruda del provider)
├── Timeline            (historial de cambios de estado)
└── Metrics             (latencia, duración total)
```

**Por qué snapshot del mensaje:** Si se modifica el template o se borra la campaña, el Delivery conserva evidencia exacta de qué se envió a quién y cuándo.

**Por qué `Attempts`:** Un envío puede reintentarse múltiples veces. Cada intento queda registrado con su timestamp, código de error y duración. Tiene enorme valor para auditoría.

### Aggregate 6 — ChannelConnection

Representa la conexión de un Workspace a un canal de comunicación vía un proveedor específico.

```
ChannelConnection
├── workspaceId
├── channel             (WhatsApp, Email, SMS, Telegram...)
├── provider            (meta, evolution, smtp, telegram...)
├── status              (connected, disconnected, error, pending)
├── credentials         (cifradas con AES-256)
├── configuration       (rate limit, opciones específicas del proveedor)
├── priority            (para fallback automático)
└── capabilities        (qué soporta esta conexión específica)
```

**Por qué `ChannelConnection` en lugar de `Provider`:** El usuario no administra "Meta". Administra "su conexión de WhatsApp". La separación Canal/Provider permite que dos clientes usen el mismo canal (WhatsApp) con proveedores distintos (Meta vs Evolution) sin afectar el dominio.

### Value Objects críticos

| Value Object | Contenido | Por qué no es un primitivo |
|---|---|---|
| `PhoneNumber` | countryCode, areaCode, subscriberNumber, e164 | Normaliza múltiples formatos del mismo número |
| `CampaignName` | valor, slug, reglas min/max/único | El nombre tiene reglas de negocio |
| `Schedule` | fecha, hora, timezone, recurrencia, ventana, prioridad | Una fecha sin zona horaria es ambigua |
| `MessageContent` | texto, variables, encoding, validación, vista previa | El contenido tiene restricciones por canal |
| `ProviderId` | tipo + entorno (meta-production, evolution-dev) | Permite distinguir instancias del mismo proveedor |

### Domain Services

Servicios pequeños con responsabilidad única. Cada uno hace exactamente una cosa.

| Servicio | Responsabilidad |
|---|---|
| `CampaignPlanner` | Genera el plan de ejecución de una campaña |
| `AudienceResolver` | Expande una audiencia a lista de contactos reales |
| `MessageRenderer` | Resuelve variables y renderiza el mensaje final |
| `DeliveryGenerator` | Genera los Deliveries a partir de un plan de campaña |
| `ProviderResolver` | Selecciona el Provider correcto para un Workspace y canal |
| `RetryResolver` | Determina si y cuándo reintentar un Delivery fallido |
| `BatchPlanner` | Divide el conjunto de Deliveries en lotes según los límites del Provider |
| `StatisticsCalculator` | Calcula estadísticas agregadas de una campaña |

### Domain Events

Los eventos son la columna vertebral del sistema. Todo cambio importante produce un evento.

```
CampaignCreated
CampaignValidated
CampaignScheduled
CampaignStarted
MessagesGenerated
MessagesQueued
DeliveryStarted
DeliveryAttempted
DeliveryCompleted  (Delivered)
DeliveryFailed
DeliveryExpired
CampaignCompleted
CampaignPaused
CampaignResumed
CampaignCancelled
WorkspaceCreated
UserInvited
ProviderConnected
ProviderDisconnected
ContactsImported
ContactUpdated
ContactOptedOut
GroupCreated
```

Cada evento puede disparar métricas, logs, auditoría, notificaciones, analytics y webhooks **sin modificar el dominio**.

### Reglas de negocio

Las reglas de negocio son la fuente de verdad del sistema. Si el código contradice una regla, el código es incorrecto.

| Código | Regla |
|---|---|
| BR-001 | Una campaña solo puede ejecutarse si existe al menos un ChannelConnection activo y conectado. |
| BR-002 | No puede existir más de un ChannelConnection activo por canal en un Workspace. |
| BR-003 | Un Contact marcado como Opt-Out nunca recibirá campañas, aunque sea incluido manualmente. |
| BR-004 | Una Campaign con estado Completed o Archived nunca puede editarse. |
| BR-005 | Un Delivery nunca puede volver al estado Pending una vez avanzado. |
| BR-006 | No puede eliminarse un Workspace con Campaigns en estado Running. |
| BR-007 | Un Contact debe tener al menos un canal válido para poder incluirse en una Campaign. |
| BR-008 | Una Campaign debe tener al menos un destinatario válido antes de poder ejecutarse. |
| BR-009 | Un mensaje vacío o sin contenido válido nunca será procesado. |
| BR-010 | El Scheduler nunca ejecutará Campaigns de un Workspace Suspended. |
| BR-011 | Un Delivery en estado Failed puede reintentar hasta el máximo configurado por la RetryPolicy del Provider. |
| BR-012 | Las credenciales de un Provider siempre se almacenan cifradas. Nunca en texto plano. |
| BR-013 | Toda entidad persistente pertenece a un Workspace. No existen registros de negocio globales. |
| BR-014 | La velocidad de envío (rate) pertenece al Provider. Nunca a la Campaign. |
| BR-015 | El Scheduler nunca envía mensajes directamente. Solo dispara eventos. |
| BR-016 | Los Commands nunca devuelven entidades. Solo devuelven `Result<Id | void, DomainError>`. |
| BR-017 | Las Queries nunca modifican estado. |
| BR-018 | Un Workspace archivado no puede volver al estado Active. Debe crearse uno nuevo. |

### Errores de dominio

No se usan excepciones genéricas. Cada situación tiene su tipo de error específico.

```
CampaignAlreadyRunning
CampaignAlreadyCompleted
CampaignWithoutAudience
CampaignWithoutProvider
CampaignPaused
CampaignCancelled
ProviderUnavailable
ProviderNotConfigured
WorkspaceSuspended
WorkspaceArchived
ContactOptOut
ContactWithoutValidChannel
DeliveryExpired
InvalidTemplate
TemplateVariablesMissing
InsufficientPermissions
```

### Patrones de diseño usados en el dominio

**Result Pattern** — No se lanzan excepciones en el dominio. Todo retorna `Result.ok()` o `Result.fail()`.

**Specification Pattern** — Las reglas de negocio compuestas se expresan como Specifications combinables.
```
CampaignCanStart = CampaignHasAudience AND CampaignHasProvider AND WorkspaceIsActive
```

**Factory Pattern** — Los aggregates se crean a través de Factories, no con `new`.
```typescript
CampaignFactory.createDraft(command)
CampaignFactory.schedule(draft, schedule)
```

**Builder Pattern** — Para aggregates complejos.
```typescript
new CampaignBuilder()
  .withAudience(audience)
  .withMessage(content)
  .withProvider(providerId)
  .withSchedule(schedule)
  .build()
```

**Repository Pattern** — Los repositorios hablan el lenguaje del negocio, no CRUD genérico.
```typescript
// NO:
campaignRepository.save(campaign)

// SÍ:
campaignRepository.schedule(campaign)
campaignRepository.pause(campaign)
campaignRepository.findReady()      // campañas listas para ejecutarse
campaignRepository.findRunning()    // campañas en ejecución
```

**Policy Pattern** — Las políticas de reintento y selección son objetos independientes.
```
RetryPolicy → MetaRetryPolicy / SMTPRetryPolicy / EvolutionRetryPolicy
```

**Strategy Pattern** — La selección de Provider es una estrategia intercambiable.
```
ProviderSelectionStrategy → MetaFirst / CheapestProvider / FastestProvider / FallbackProvider
```

---

## 7. Estrategia de proveedores

### El contrato del dominio

El dominio nunca conoce Meta, Evolution ni Twilio. Solo conoce un contrato:

```typescript
interface MessagingProvider {
  connect(credentials: ProviderCredentials): Promise<Result<void, ProviderError>>
  disconnect(): Promise<Result<void, ProviderError>>
  validate(): Promise<Result<HealthStatus, ProviderError>>
  send(message: OutboundMessage): Promise<Result<ProviderResponse, ProviderError>>
  status(providerMessageId: string): Promise<Result<DeliveryStatus, ProviderError>>
  health(): Promise<HealthStatus>
  capabilities(): ProviderCapabilities
}

interface ProviderCapabilities {
  channel: Channel
  supportsTemplates: boolean
  supportsMedia: boolean
  supportsButtons: boolean
  supportsTyping: boolean
  supportsDeliveryStatus: boolean
  supportsReadReceipts: boolean
  maxMessagesPerMinute: number
}
```

El dominio pregunta `provider.supports(Feature.BUTTONS)`. Nunca pregunta `isMeta()`.

### Providers existentes y planificados

| Provider | Canal | Estado |
|---|---|---|
| `MetaProvider` | WhatsApp (API Oficial) | MVP |
| `EvolutionProvider` | WhatsApp (WhatsApp Web) | MVP |
| `WPPConnectProvider` | WhatsApp (WhatsApp Web) | Planificado |
| `SMTPProvider` | Email | v1.2 |
| `TelegramProvider` | Telegram | v1.3 |
| `SMSProvider` | SMS | v1.3 |
| `FakeProvider` | — | Desarrollo |
| `MockProvider` | — | Testing |

### Capacidades por provider (MVP)

| Capacidad | Meta | Evolution |
|---|---|---|
| Plantillas oficiales | ✅ | ❌ |
| Multimedia | ✅ | ✅ |
| Botones | ✅ | ✅ |
| Estado de entrega | ✅ | ✅ |
| Confirmación de lectura | ✅ | ✅ |
| Webhooks | ✅ | ✅ |
| Rate | 100 msg/min | 30 msg/min |

### Provider Registry

Al arrancar la aplicación, cada Provider se registra:

```typescript
registry.register(new MetaProvider(config))
registry.register(new EvolutionProvider(config))
```

El `ProviderOrchestrator` usa el registro para resolver qué Provider usar según el canal, Workspace y prioridad.

### Smart Routing y Fallback

Un Workspace puede configurar múltiples ChannelConnections con prioridades:

```
WhatsApp → Meta (prioridad 1) → Evolution (prioridad 2)
```

Si Meta responde con error o está caído:

```
Meta → HealthCheck → Offline
     → ProviderOrchestrator → Evolution (automático)
```

La Campaign nunca sabe que el Provider cambió.

---

## 8. Infraestructura y persistencia

### Filosofía de persistencia

La persistencia es una implementación, no el dominio. El dominio podría persistirse en PostgreSQL, MongoDB, EventStore o DynamoDB sin cambiar una sola regla de negocio. En BCP se usa PostgreSQL.

### Multi-tenancy

Se eligió el modelo de **base de datos única con columna `workspaceId`**.

| Opción | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| Una DB por cliente | Aislamiento total | Mantenimiento enorme, migraciones complejas | ❌ |
| Un schema por cliente | Buen aislamiento | Prisma se complica, migraciones difíciles | ❌ |
| Shared DB con workspaceId | Simple, escalable, backups fáciles | Requiere disciplina | ✅ |

Toda tabla tiene `workspaceId`. No existen registros de negocio sin Workspace. Si un cliente Enterprise requiere aislamiento total, puede migrarse a base exclusiva sin cambiar el dominio.

### Mapa de persistencia (Aggregate → Tablas)

| Aggregate | Tablas |
|---|---|
| Workspace | `workspace`, `workspace_settings`, `workspace_user` |
| Contact | `contact`, `contact_channel`, `contact_group`, `contact_tag` |
| Campaign | `campaign`, `campaign_audience`, `campaign_execution`, `campaign_statistics` |
| Delivery | `delivery`, `delivery_attempt`, `delivery_event` |
| ChannelConnection | `channel_connection`, `provider_credentials` |

**Por qué Message no tiene tabla propia:** Message no existe por sí mismo. Existe dentro de un Delivery. Cada Delivery contiene un snapshot exacto del mensaje enviado. Si se borra la campaña, el historial de entregas permanece intacto.

**Por qué `delivery_attempt`:** Un envío puede reintentarse. Cada intento queda registrado con su timestamp, código de error y duración. Auditoría completa.

### Estrategia de índices

Tabla `contact`:
- `(workspaceId, phone)` — búsqueda por teléfono
- `(workspaceId, email)` — búsqueda por email
- `(workspaceId, externalId)` — sincronización con CRMs

Tabla `campaign`:
- `(workspaceId, status)` — campañas activas / programadas
- `(workspaceId, scheduledAt)` — próximas a ejecutar
- `(workspaceId, createdAt)` — histórico

Tabla `delivery` (tabla más grande del sistema, potencialmente millones de registros):
- `(workspaceId, campaignId)` — todos los envíos de una campaña
- `(workspaceId, status)` — fallos, pendientes
- `(providerMessageId)` — resolución de webhooks entrantes
- `(contactId)` — historial por contacto
- `(createdAt)` — soporte para particionado

**Regla:** Nunca `SELECT * FROM delivery`. Siempre con filtros indexados.

### Particionado de la tabla delivery

La tabla `delivery` se particiona mensualmente. Justificación: una campaña suele durar días, nunca años. El particionado mensual permite purgar o archivar datos históricos sin afectar operaciones en curso.

### Política de eliminación

No se usa soft delete con columna `deleted_at`. En su lugar, cada entidad tiene un campo `status` que puede incluir `Deleted`. Un Worker de retención elimina físicamente registros según políticas configurables (30, 90, 365 días por tipo de entidad).

### Outbox Pattern

Toda transacción que genere un Domain Event escribe primero en una tabla `outbox` dentro de la misma transacción de base de datos:

```
BEGIN
  → Guardar Campaign
  → Guardar DomainEvent en outbox
COMMIT
  → Outbox Worker lee el evento
  → Publica en BullMQ
```

Esto garantiza consistencia entre la base de datos y las colas. Si el sistema falla entre la escritura y la publicación, el Outbox Worker reintentará.

### Auditoría

La auditoría es dominio, no logging. Todo cambio importante genera un registro con:

- Quién (userId)
- Qué (evento)
- Cuándo (timestamp)
- Desde dónde (IP, UserAgent)
- Valor anterior y nuevo
- CorrelationId

Se persiste en base de datos y **no depende de Winston**. Si el logger falla, la auditoría sigue funcionando.

### Historial (Timeline)

Cada aggregate importante tiene un Timeline que permite reconstruir su ciclo de vida sin depender exclusivamente de logs:

```
Campaign Timeline:
09:00 → Creada
09:03 → Programada para las 14:00
14:00 → Iniciada
14:02 → Primer lote generado (100 destinatarios)
14:15 → 1.000 mensajes enviados
14:35 → Finalizada (4.257 de 4.257)
```

---

## 9. Colas y ejecución asincrónica

### Principio

La API nunca hace trabajo pesado. La API crea trabajo. Los Workers ejecutan trabajo.

```
HTTP Request → Application Service → Domain Event → Outbox → BullMQ → Worker → Provider
                                                                                 ↓
                                                                              Webhook → Update Delivery → Metrics → Audit
```

**Por qué no enviar desde un request HTTP:**  
El usuario esperaría. Puede fallar en el medio. No escala. Consume memoria del servidor. Bloquea Node.js.

**Cómo funciona:**  
La API responde `200 OK` en menos de 100ms. El trabajo real ocurre en Workers de forma asincrónica.

### Tipos de colas

| Cola | Responsabilidad |
|---|---|
| `campaign-queue` | Iniciar, pausar, reanudar y cancelar campañas. Nunca envía mensajes. |
| `delivery-queue` | Enviar mensajes individuales. Solo eso. |
| `retry-queue` | Reintentos con backoff. Espera antes de re-encolar. |
| `webhook-queue` | Procesar eventos de estado entrantes (delivered, read, failed). |
| `analytics-queue` | Actualizar estadísticas y dashboards. Nunca toca el dominio transaccional. |
| `notification-queue` | Notificaciones internas (email al admin, Slack, alertas). |

Cada cola tiene un único objetivo. Las responsabilidades nunca se mezclan.

### Campaign Execution Engine

Este es el motor central de ejecución. No es la campaña en sí, sino el motor que la ejecuta.

```
Campaign
  → Execution Plan    (cuántos lotes, tamaños, prioridades)
  → Batch Generator   (divide la audiencia en lotes)
  → Rate Controller   (respeta los límites del Provider)
  → Queue Dispatcher  (encola cada lote)
  → Provider          (ejecuta el envío)
  → Retry Engine      (maneja errores)
  → Metrics           (registra resultados)
```

**Por qué lotes (batches):** Si Meta permite 100 msg/min y Evolution permite 30 msg/min, el motor adapta el tamaño de los lotes automáticamente. El dominio no sabe ni le importa cuántos mensajes entran en un lote.

### Scheduler Engine

El Scheduler detecta campañas programadas y dispara eventos. No hace polling ciego.

```
CampaignScheduled
  → Persist
  → Scheduler detecta que llegó la hora
  → Emite CampaignStartedEvent
  → Motor de ejecución toma el control
```

**Garantía de idempotencia:** Si el Scheduler procesa la misma campaña dos veces (por un fallo del sistema), el dominio rechaza el segundo intento porque la campaña ya no está en estado `Scheduled`.

### Retry Engine

Los errores se clasifican antes de decidir si reintentar:

| Tipo de error | Ejemplo | Acción |
|---|---|---|
| Error permanente | Número inexistente | No reintentar. Marcar como `Failed` definitivo. |
| Error temporal | 429 Too Many Requests | Esperar y reintentar con backoff. |
| Error de red | Timeout | Reintentar inmediatamente (hasta N veces). |
| Error del provider | 503 Service Unavailable | Backoff exponencial. |

Política de backoff:
```
Intento 1  → error → esperar 10s
Intento 2  → error → esperar 30s
Intento 3  → error → esperar 2min
Intento 4  → error → esperar 10min
Intento 5  → error → Failed definitivo
```

### Flujo completo de una campaña

```
Usuario crea campaña
  ↓ (< 100ms)
API valida y persiste → CampaignCreated
  ↓
Usuario programa campaña → CampaignScheduled
  ↓
Scheduler detecta la hora → CampaignStarted
  ↓
AudienceResolver expande contactos
  ↓
BatchPlanner divide en lotes
  ↓
delivery-queue recibe cada lote
  ↓
Worker procesa cada Delivery:
  → MessageRenderer resuelve variables
  → ProviderOrchestrator selecciona Provider
  → Provider.send(message)
  → ProviderResponse
  ↓
Webhook recibe confirmación del Provider
  ↓
DeliveryUpdated → StatisticsUpdated
  ↓
Cuando todos los Deliveries tienen estado final:
CampaignCompleted → Analytics → Audit → Notifications
```

---

## 10. Seguridad

### Autenticación

- JWT de corta duración (15 minutos)
- Refresh Token con rotación (cada refresh genera un nuevo par)
- Revocación de sesiones por usuario o Workspace

### Autorización — RBAC

```
Roles:
  Owner    → todos los permisos
  Admin    → todos menos Billing y transferencia de Workspace
  Operator → ejecutar campañas, no administrar usuarios
  Viewer   → solo lectura

Actores del sistema:
  Scheduler → disparar campañas (sin UI)
  Worker    → ejecutar entregas (sin UI)
  Webhook   → actualizar estados (sin UI)
```

**Permisos granulares** (no hardcodeados en roles):

```
campaign:create
campaign:update
campaign:delete
campaign:execute
campaign:pause
campaign:resume
campaign:view
contact:import
contact:export
workspace:transfer
billing:view
```

Los roles son conjuntos de permisos. Un Owner puede crear roles personalizados con permisos específicos en versiones Enterprise.

### Gestión de secretos

- Credenciales de Provider: cifradas con AES-256 en base de datos. Nunca en texto plano.
- Secretos de aplicación: variables de entorno en desarrollo, Vault o AWS Secrets Manager en producción.
- Nunca se loguean secretos ni credenciales.

### Seguridad de red

- HTTPS obligatorio
- Rate limiting en todos los endpoints públicos
- Headers de seguridad (HSTS, CSP, X-Frame-Options)
- Validación de webhooks entrantes (firma HMAC)

---

## 11. Observabilidad

### Stack

```
Logs      → Winston/Pino → Loki → Grafana
Métricas  → Prometheus → Grafana
Tracing   → OpenTelemetry → Tempo → Grafana
Alertas   → Grafana Alerting
```

### Correlation ID

Cada request HTTP genera un `CorrelationId` único (ULID). Este ID se propaga a través de:

- Logs de la API
- Domain Events
- Cola (BullMQ job metadata)
- Webhook entrante
- Registros de auditoría
- Métricas de Prometheus

Con el CorrelationId se puede reconstruir el ciclo de vida completo de una campaña atravesando todos los sistemas.

### KPIs del producto

Métricas que el sistema mide y expone en dashboards:

| KPI | Descripción |
|---|---|
| Delivery Rate | % de mensajes entregados sobre enviados |
| Read Rate | % de mensajes leídos |
| Reply Rate | % de mensajes respondidos |
| Provider Latency | Tiempo de respuesta del Provider (P50, P95, P99) |
| Retry % | Porcentaje de Deliveries que requirieron reintento |
| Campaign Success Rate | Campañas completadas vs fallidas |
| Worker Throughput | Mensajes procesados por segundo por Worker |
| Queue Size | Tamaño actual de cada cola |
| Queue Wait Time | Tiempo promedio de espera en cola |
| Error % | Porcentaje de errores por tipo |

### Health Monitoring de Providers

Todos los Providers implementan endpoints de salud:

```typescript
interface HealthProvider {
  health(): Promise<HealthStatus>      // online / degraded / offline
  latency(): Promise<number>           // ms de latencia promedio
  availability(): Promise<number>      // uptime %
  quota(): Promise<QuotaStatus>        // uso de cuota actual
  limits(): Promise<RateLimits>        // límites configurados
}
```

El dashboard muestra el estado de cada Provider en tiempo real.

---

## 12. Especificación funcional (SRS)

Este documento describe el comportamiento funcional completo del sistema. Si el código contradice el SRS, el código es incorrecto.

### Actores

**Humanos:**
- **Owner** — puede hacer todo en su Workspace, incluyendo billing y transferencia de propiedad.
- **Admin** — gestiona campañas, contactos y usuarios. No puede transferir ni gestionar billing.
- **Operator** — puede crear y ejecutar campañas. No administra usuarios.
- **Viewer** — solo lectura en todos los módulos.

**Del sistema:**
- **Scheduler** — detecta y dispara campañas. Sin interacción humana.
- **Worker** — ejecuta entregas. Sin interacción humana.
- **Provider** — sistema externo (Meta, Evolution, etc.).
- **Webhook** — eventos entrantes del Provider.

### Casos de uso

**Workspace**
- Crear Workspace
- Actualizar configuración
- Suspender / Archivar
- Transferir Ownership
- Cambiar Plan

**Usuarios**
- Invitar usuario (por email)
- Aceptar invitación
- Cambiar rol
- Eliminar usuario del Workspace
- Revocar sesión

**Contactos**
- Crear / Editar / Archivar / Eliminar
- Importar CSV
- Importar Excel
- Detectar y fusionar duplicados
- Buscar y filtrar
- Segmentar con reglas dinámicas
- Exportar
- Agregar / quitar etiquetas y grupos
- Registrar Opt-Out

**Campañas**
- Crear (modo wizard)
- Guardar como borrador
- Editar (solo en Draft)
- Duplicar
- Programar
- Enviar test a número propio
- Iniciar
- Pausar / Reanudar
- Cancelar
- Archivar
- Ver timeline y estadísticas en tiempo real

**Canales (ChannelConnection)**
- Conectar proveedor
- Ver estado y salud
- Desconectar
- Actualizar credenciales
- Sincronizar configuración

**Templates**
- Crear / Editar / Eliminar
- Previsualizar con variables de ejemplo
- Versionar
- Enviar mensaje de prueba

**Analytics**
- Dashboard con KPIs de las últimas 24h / 7d / 30d
- Comparar campañas
- Exportar reporte
- Ver timeline por campaña
- Ver errores clasificados

### Validaciones del sistema

| Campo | Regla |
|---|---|
| Campaign.name | 3–120 caracteres, único por Workspace |
| Message.content | No puede estar vacío. Máximo según canal (WhatsApp: 4096 chars) |
| Template.variables | Todas las variables deben estar balanceadas `{{var}}` |
| Contact.channel | Al menos uno válido y verificado |
| Provider | Debe responder HealthCheck antes de ejecutar una campaña |
| Schedule.date | No puede ser en el pasado |

### Consentimiento y Opt-Out

El sistema nunca enviará mensajes a contactos con Opt-Out, aunque sean incluidos manualmente en la audiencia. Esta regla no es configurable.

El modelo de consentimiento incluye:
- `accepts_campaigns`: Sí / No / Desconocido
- `consent_source`: Formulario Web, CRM, Manual, API, Importación, WhatsApp, Otro
- `consent_date`: cuándo se obtuvo el consentimiento
- `opted_out_at`: cuándo solicitó el opt-out

### Internacionalización

El sistema almacena claves de traducción, no textos. Soporte inicial: Español, Inglés, Portugués.

### Feature Flags

Funcionalidades activables sin redesplegar:
- Email
- SMS
- Telegram
- IA
- Automatizaciones
- Beta UI

---

## 13. Especificación de producto (UX)

### Principios de diseño

1. **Una acción primaria por pantalla.** Sin ambigüedad sobre qué hacer.
2. **Confirmación solo para acciones irreversibles.** No pedir confirmación para editar un borrador.
3. **Los errores explican el problema y la solución.** "No pudimos conectar con WhatsApp. Intentaremos nuevamente en unos segundos." No "Error 503".
4. **Mostrar progreso siempre.** Si una tarea tarda más de 500ms, el usuario debe saber qué ocurre.
5. **Nunca bloquear la interfaz durante envíos.** Todo el procesamiento ocurre en segundo plano.

### Referentes de UX

La experiencia debe ser similar a Notion, Linear, Stripe Dashboard y Vercel: pocos pasos, mucho contexto, cero formularios interminables.

### Menú principal

```
Dashboard
Campañas
Contactos
Segmentos
Plantillas
Canales
Automatizaciones  (v2)
Analíticas
Configuración
```

### Dashboard

```
┌─────────────────────────────────────────────────────┐
│  BROTE Campaigns                                     │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ Activas  │Programadas│ Enviadas │Entregadas│  Leídas │
│    12    │    5     │  4.532   │  4.411   │  3.298  │
├─────────────────────────────────────────────────────┤
│  Actividad reciente                                  │
│  ✓ Campaña "Invierno" finalizada                     │
│  ✓ CSV importado (843 contactos)                     │
│  ✓ Canal WhatsApp conectado                          │
├─────────────────────────────────────────────────────┤
│  Envíos últimos 30 días  [gráfico de líneas]         │
└─────────────────────────────────────────────────────┘
```

### Wizard "Nueva Campaña"

**Paso 1 — Canal**  
¿Dónde querés comunicarte? Al seleccionar el canal, el sistema verifica automáticamente que esté conectado y autenticado. Si no lo está, el wizard no avanza y ofrece conectarlo.

**Paso 2 — Audiencia**  
Opciones: todos los contactos, segmento existente, grupo, importar CSV, selección manual.

Al elegir un segmento, el sistema muestra inmediatamente:
```
Clientes Activos — 4.521 contactos
  ✔ 4.389 tienen WhatsApp
  ✔ 97 Opt-Out (excluidos automáticamente)
  ✔ 35 números inválidos (excluidos)
  ──────────────────────────
  Se enviará a: 4.257 contactos
```

**Paso 3 — Mensaje**  
Editor con vista previa en vivo (como Notion). Las variables se insertan con `/` seguido del nombre. Validación en tiempo real: variables sin cerrar, variables no disponibles para el contacto, límites del canal.

**Paso 4 — Prueba**  
Enviar un mensaje de prueba a un número propio antes de lanzar.

**Paso 5 — Programación**  
Enviar ahora o programar con fecha, hora y zona horaria explícita.

**Paso 6 — Confirmación (al estilo Stripe)**
```
Canal          WhatsApp
Audiencia      4.257 contactos
Mensaje        154 caracteres, 3 variables
Programación   Hoy 14:00 (Hora Argentina)
Proveedor      Meta
Tiempo est.    11 minutos
Costo est.     $0

              [ Enviar campaña ]
```

**Después del envío:** No ir al Dashboard. Ir a la pantalla de campaña con progreso en tiempo real:
```
Generando destinatarios  ████████░░░
Encolando mensajes       ████████████
Enviando                 425 / 4257

En vivo:
  425 enviados
  321 entregados
  188 leídos
```

### Pantalla de campaña

Tabs: Resumen | Destinatarios | Actividad | Errores | Configuración | Timeline

Los errores se muestran en lenguaje humano:  
`"Proveedor temporalmente no disponible. Reintentando."` — no `"Error 503"`.

El Timeline muestra el ciclo de vida completo de la campaña en formato tipo GitHub:
```
09:00  Campaña creada
09:03  Programada para las 14:00
14:00  Iniciada
14:02  Primer lote (100 destinatarios)
14:15  1.000 mensajes enviados
14:35  Campaña finalizada
```

### Importador de contactos

No es "subir un CSV". Es un proceso guiado en 6 pasos: subir → mapear columnas → validar → mostrar errores → importar → resumen.

### Módulo de canales

El usuario no ve "Meta" ni "Evolution". Ve "WhatsApp — Conectado — Proveedor: Meta — Última sincronización: hace 2 minutos". El proveedor técnico es un detalle de implementación, no un concepto del usuario.

---

## 14. Especificación de implementación

### CQRS

CQRS se aplica donde agrega valor real, no por moda.

**Commands** (modifican estado):
```
CreateCampaign / PauseCampaign / ResumeCampaign / CancelCampaign
ImportContacts / CreateWorkspace / ConnectProvider / InviteUser
```

**Queries** (nunca modifican estado):
```
GetCampaign / GetDashboard / GetAnalytics / GetContacts / SearchContacts / CampaignTimeline
```

**Regla:** Los Commands nunca devuelven entidades. Solo `Result<Id | void, DomainError>`.

### Event Bus

El bus es el sistema nervioso del sistema:

```
CampaignCreated → Bus → Scheduler / Analytics / Audit / Notifications / Webhooks / Logs
```

Nadie conoce a nadie. Todos escuchan eventos.

### Dependency Injection

Absolutamente todo entra por contratos. Las implementaciones concretas nunca se instancian directamente en el dominio o la aplicación.

```typescript
// NUNCA en dominio/aplicación:
new PrismaCampaignRepository()

// SIEMPRE mediante contrato:
container.resolve(ICampaignRepository)

// Registro en infrastructure:
container.register(ICampaignRepository, PrismaCampaignRepository)
```

Contratos principales en `packages/contracts/`:
```
ICampaignRepository / IContactRepository / IWorkspaceRepository
IDeliveryRepository / IChannelConnectionRepository
IProvider / IEventBus / ILogger / IClock / IQueue / IStorage
ISecretManager / ICache / IAuditRepository
```

### Mapper Pattern

```
Prisma Record
  → Mapper (en infrastructure)
  → Aggregate (en domain)
  → Handler (en application)
  → DTO
  → Controller
  → JSON response
```

Nunca mapeo directo Prisma → Domain sin pasar por Mapper.

### Testing Strategy

```
Unit Tests        → Entities, Value Objects, Domain Services, Specifications
Integration Tests → Repositories (real DB), Provider adapters, BullMQ
Contract Tests    → Cada Provider implementa el mismo contrato
E2E Tests         → Flujo completo: crear campaña → enviar → verificar Delivery
```

Cobertura mínima: **80%** en dominio y aplicación.

### OpenAPI First

El flujo de desarrollo sigue este orden:

```
DDD → SRS → OpenAPI spec → Tipos generados → Repositorios → Use Cases → Controllers → Frontend
```

Nunca al revés. El contrato de API se define antes de implementar.

### CI/CD Pipeline

```
1. Lint
2. TypeCheck (tsc --noEmit)
3. Unit Tests
4. Integration Tests
5. Contract Tests
6. Build
7. Docker build
8. Deploy
```

**Regla:** Sin deploy si falla un solo paso. Nunca.

---

## 15. Roadmap de desarrollo

### Sprint 0 — Bootstrap (1 semana)
Monorepo (Turborepo + pnpm), Docker Compose, PostgreSQL, Redis, Prisma, Express, TypeScript, ESLint, Prettier, Husky, Commitlint, GitHub Actions, logger, Prometheus, Grafana, OpenAPI base, variables de entorno.

**Resultado:** Proyecto vacío, compilando, con CI/CD y observabilidad base.

### Sprint 1 — Shared Kernel y Core DDD (2 semanas)
Result, Either, AggregateRoot, Entity, ValueObject, DomainEvent, EventBus, contratos de Repository, DI Container, manejo de errores.

**Resultado:** Infraestructura DDD lista. Sin lógica de negocio aún.

### Sprint 2 — Workspace y Auth (2 semanas)
Workspace aggregate, Users, login, JWT, Refresh Token Rotation, RBAC, Workspace settings.

**Resultado:** Plataforma multiusuario y multiempresa funcional.

### Sprint 3 — Contactos (2–3 semanas)
CRUD, importador CSV y Excel, detección de duplicados, etiquetas, grupos, Timeline, Opt-Out, preferencias.

**Resultado:** Base de contactos completa.

### Sprint 4 — Templates (1 semana)
CRUD, motor de variables, vista previa, versionado, validaciones, prueba rápida.

### Sprint 5 — Campañas (3 semanas)
Campaign aggregate, Builder, máquina de estados, programación, dashboard, Timeline. **Sin enviar mensajes todavía.**

**Resultado:** El flujo de creación y gestión de campañas funciona completamente en el panel.

### Sprint 6 — Execution Engine (3 semanas)
BullMQ, Workers, Scheduler, BatchPlanner, Retry Engine, Rate Limiter, Outbox Pattern.

**Resultado:** Motor de ejecución completo.

### Sprint 7 — Communication Layer (3 semanas)
Provider SDK (contratos), ProviderRegistry, ProviderOrchestrator, MetaProvider, EvolutionProvider, Webhooks, Health Monitoring, Smart Routing.

**Resultado:** Con este sprint el producto ya puede vender. Envío real de WhatsApp funcionando.

### Sprint 8 — Analytics (2 semanas)
Dashboard, KPIs, gráficos, reportes exportables.

### Sprint 9 — Hardening (2 semanas)
Performance, caché, optimización SQL, seguridad (pentest interno), auditoría, backups, documentación final.

**Resultado: MVP listo para vender.**

### MVP incluye

Login · Multiempresa · Contactos · Importación · Segmentos · Templates · Campañas · Envíos vía WhatsApp · Dashboard · Analytics.

### Versiones futuras

| Versión | Contenido |
|---|---|
| v1.1 | Automatizaciones, respuestas automáticas, bandeja de conversaciones |
| v1.2 | Email (SMTP), templates HTML |
| v1.3 | Telegram, SMS |
| v2.0 | IA para generación, segmentación y optimización · A/B Testing |

---

## 16. Decisiones arquitectónicas (ADR)

Cada decisión tiene un código permanente. Una vez registrada, solo puede ser superada por otra ADR que la reemplace explícitamente.

| ADR | Título | Decisión |
|---|---|---|
| ADR-001 | Arquitectura en capas (Clean Architecture) | Domain / Application / Infrastructure / Presentation. Las dependencias apuntan hacia adentro. |
| ADR-002 | Lenguaje del dominio puro | El Domain nunca importa librerías externas. Si se elimina Infrastructure, el Domain compila. |
| ADR-003 | Provider Pattern | Cada canal de comunicación implementa la misma interfaz `MessagingProvider`. El dominio solo conoce el contrato. |
| ADR-004 | Open/Closed Principle para providers | Agregar un nuevo Provider no requiere modificar el Domain ni la Application. Solo implementar el contrato y registrarlo. |
| ADR-005 | Queue First | Todo envío masivo es asincrónico. Nunca se envían campañas desde un request HTTP. |
| ADR-006 | Event Driven | Los cambios importantes producen Domain Events. Los módulos se comunican mediante eventos, no llamadas directas. |
| ADR-007 | Single Responsibility en Services | No existen `CampaignService` de 1.500 líneas. Cada responsabilidad es un servicio explícito y pequeño. |
| ADR-008 | Result Pattern | No se usan excepciones en el Domain ni en Application. Todo retorna `Result<T, DomainError>`. |
| ADR-009 | ULID como identificador principal | Los aggregates principales usan ULID: orden temporal, mejor performance en índices que UUID v4 aleatorio. |
| ADR-010 | Outbox Pattern obligatorio | Toda transacción que genere Domain Events escribe primero en tabla `outbox`. Garantiza consistencia entre DB y colas. |
| ADR-011 | Multi-tenancy con workspaceId compartido | Una sola base de datos. Todas las tablas tienen `workspaceId`. No existen registros de negocio globales. |
| ADR-012 | Snapshot de mensaje en Delivery | El Delivery almacena un snapshot exacto del mensaje enviado. No referencia al Template. Inmutabilidad del historial. |
| ADR-013 | Particionado mensual de Delivery | La tabla `delivery` se particiona por mes. Permite purga y archivado eficiente de datos históricos. |
| ADR-014 | Sin soft delete | No se usa `deleted_at`. Los registros tienen `status`. Un Worker de retención elimina físicamente según política. |
| ADR-015 | Colas con responsabilidad única | Cada Queue tiene un único propósito. Nunca se mezclan responsabilidades en una cola. |
| ADR-016 | El Scheduler nunca envía mensajes | El Scheduler detecta campañas y dispara eventos. El envío es responsabilidad de los Workers. |
| ADR-017 | Rate Limit pertenece al Provider | Los límites de velocidad son una propiedad del Provider, no de la Campaign. |
| ADR-018 | The Core Never Knows | El Core nunca conoce implementaciones concretas. Solo conoce contratos. Aplica a providers, persistencia, colas, observabilidad, IA e integraciones. |
| ADR-019 | OpenAPI First | La especificación de API se escribe antes de implementar. El contrato es la fuente de verdad. |
| ADR-020 | CQRS selectivo | CQRS se aplica donde aporta valor real. Commands nunca devuelven entidades. Queries nunca modifican estado. |
| ADR-021 | Auditoría como dominio | La auditoría no es logging. Es un módulo del dominio con persistencia propia. Si Winston falla, la auditoría sigue. |
| ADR-022 | Opt-Out no negociable | El sistema nunca enviará mensajes a contactos marcados como Opt-Out. Esta regla no es configurable por el usuario. |
| ADR-023 | Product First Engineering | El dominio define el comportamiento. La documentación lo explica. El código lo implementa. Los tests lo verifican. Los cuatro deben estar sincronizados. |
| ADR-024 | Nombre del producto: BROTE Communication Platform (BCP) | "Messaging" limita. "Communication" abarca WhatsApp, Email, SMS, Push, Voice e IA sin cambiar el dominio. |
| ADR-025 | ChannelConnection como aggregate | El usuario no administra "Meta". Administra "su conexión de WhatsApp". La separación Canal / Provider es un concepto de primer nivel. |
| ADR-026 | Smart Routing con prioridades | Un Workspace puede configurar múltiples Providers por canal con prioridad. El Provider Orchestrator hace el fallback automáticamente. La Campaign no sabe qué Provider se usó. |

---

## 17. Definición de hecho (DoD)

Una funcionalidad NO está terminada hasta cumplir **todos** los siguientes criterios:

| Criterio | Verificación |
|---|---|
| Dominio implementado | Las entidades, value objects y eventos existen y compilan sin dependencias externas |
| Casos de uso cubiertos | Commands y Queries implementados con los handlers correspondientes |
| Tests unitarios | Cobertura ≥ 80% en Domain y Application |
| Tests de integración | Repositories probados contra base de datos real |
| OpenAPI actualizado | El contrato de API refleja el comportamiento implementado |
| Documentación técnica | ADR si se tomó una decisión arquitectónica |
| Métricas | KPIs relevantes expuestos en Prometheus |
| Auditoría | Los cambios importantes generan registros de auditoría |
| Logs | Eventos importantes tienen logs estructurados con CorrelationId |
| RBAC | Los endpoints están protegidos con los permisos correctos |
| Performance | Queries con índices verificados. Sin `SELECT *` en tablas grandes |

---

*Fin del documento.*

*Versión 1.0 — BROTE — 2026*
