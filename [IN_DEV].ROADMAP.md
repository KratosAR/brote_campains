# BROTE Campaigns — Roadmap hacia paridad y diferenciación frente a ManyChat

**Estado del documento:** 🚧 EN DESARROLLO — Roadmap activo — se actualiza a medida que avanzan las fases.


**Versión:** 1.0
**Estado:** Definitivo (aprobado 2026-07-17)
**Fecha:** 2026-07-17
**Equipo:** 2 desarrolladores (Gonzalo + Claude)

Este documento continúa `[COMPLETE].BCP-SPRINTS.md` (Sprints 0–9.4, ✅ completados: broadcast engine WhatsApp, DDD/hexagonal, CI de seguridad). Define las siguientes fases de producto para llevar Brote de "motor de campañas broadcast" a una alternativa completa a ManyChat, con diferenciadores propios.

## Decisión de negocio (2026-07-17)

- **Prioridad de Fase 1: Multicanal.** Se prioriza expandir de WhatsApp-only a Instagram/Messenger/SMS/Email antes que inbox o flow builder, reusando la abstracción `providers/*` ya validada con `evolution`/`meta`/`fake`.
- **Inbox conversacional (Fase 2) es dependencia dura de Fase 3** (flow builder) — no puede haber automatización de respuestas sin un modelo de conversación entrante.
- **Diferenciador elegido: self-hosted / open-core.** A diferencia de ManyChat (SaaS cerrado atado a Meta), Brote ya soporta WhatsApp self-hosted (Evolution API) y oficial (Meta Cloud API) en paralelo. Se profundiza esta ventaja en cada fase (portabilidad de datos, sin vendor lock-in, control de infraestructura) en vez de competir solo en superficie de features.
- Compliance-first e IA nativa quedan como diferenciadores secundarios, revisitados en Fase 4 y Fase 5 respectivamente.

## Índice

- [Fase 1 — Multicanal](#fase-1--multicanal-10-semanas)
- [Fase 2 — Inbox conversacional](#fase-2--inbox-conversacional-8-semanas)
- [Fase 3 — Flow builder visual + secuencias](#fase-3--flow-builder-visual--secuencias-12-semanas)
- [Fase 4 — CRM enriquecido y compliance regional](#fase-4--crm-enriquecido-y-compliance-regional-6-semanas)
- [Fase 5 — Monetización + IA nativa](#fase-5--monetización--ia-nativa-10-semanas)
- [Resumen de estimaciones](#resumen-de-estimaciones)

---

## Fase 1 — Multicanal (10 semanas)

**Objetivo:** salir de WhatsApp-only. Cada canal nuevo es un `provider` que implementa la interfaz existente (`send`, `healthCheck`, credential schema) — sin tocar `packages/domain`/`application` salvo agregar el enum de canal y su validación.

### Backend — Sprint B1: Meta Messenger + Instagram DM (3 semanas)

- [ ] `providers/meta-messenger`: adapter sobre Graph API (mismo App de Meta que WhatsApp Cloud API — reduce fricción de onboarding OAuth)
- [ ] `providers/meta-instagram`: adapter sobre Instagram Messaging API (Graph API, requiere cuenta business vinculada)
- [ ] Extender `ChannelConnection` (ya soporta credenciales encriptadas por canal): agregar `channel: MESSENGER | INSTAGRAM` al enum existente
- [ ] Extender `ContactChannel` para permitir múltiples identificadores por contacto (PSID de Messenger, IG-scoped ID)
- [ ] Webhook app (`apps/webhook`): nuevos endpoints de verificación/recepción para Messenger e Instagram (reusar middleware de firma HMAC ya usado en Meta WhatsApp)
- [ ] Tests de integración con provider fake extendido (`FakeMessengerProvider`, `FakeInstagramProvider`)
- **Estimación:** 3 semanas, 1 dev

### Backend — Sprint B2: SMS con failover real (3 semanas)

- [ ] `providers/twilio` (o proveedor regional equivalente si aplica LATAM)
- [ ] Implementar la lógica de `priority`/failover en `ChannelConnection` que hoy solo existe como campo sin uso: si falla el canal primario, reintentar por el canal de mayor prioridad siguiente dentro del mismo `Delivery`
- [ ] Extender `DeliveryGenerator`/`BatchPlanner` para resolver fallback de canal, no solo de provider dentro del mismo canal
- [ ] Migración Prisma: índices necesarios para la query de fallback
- [ ] Tests: escenario de caída de provider primario → entrega recuperada por secundario
- **Estimación:** 3 semanas, 1 dev

### Backend — Sprint B3: Email SMTP + Telegram (4 semanas)

- [ ] `providers/smtp` (nodemailer o similar) — soporte de templates HTML, tracking de apertura opcional (pixel) como diferenciador de compliance (opt-in explícito para tracking)
- [ ] `providers/telegram` (Bot API) — canal más simple, usarlo para validar que el patrón de providers escala a un 5to canal sin fricción
- [ ] Documentar en `docs/[CURRENT].PROVIDERS.md` el checklist para agregar un provider nuevo (a partir de la experiencia de B1–B3)
- **Estimación:** 4 semanas, 1 dev

### Frontend — Sprint F1: Conexión y gestión de canales nuevos (4 semanas)

- [ ] `apps/web` — `settings/channels`: wizard de conexión OAuth para Messenger/Instagram (reusar flujo de Meta WhatsApp ya existente)
- [ ] Formulario de conexión SMTP (host/puerto/credenciales) y Telegram (bot token)
- [ ] UI de prioridad/failover por canal en `ChannelConnection` (drag-to-reorder)
- [ ] Selector de canal al crear campaña: mostrar todos los canales conectados del workspace, no solo WhatsApp
- [ ] Indicador de salud por canal (ya existe healthCheck en backend, falta superficie en UI)
- **Estimación:** 4 semanas, 1 dev (puede correr en paralelo a B2/B3)

**Total Fase 1: ~10 semanas backend + 4 semanas frontend (parcialmente paralelizable) → ~10 semanas de calendario con 2 devs.**

---

## Fase 2 — Inbox conversacional (8 semanas)

**Objetivo:** modelar la conversación entrante, habilitador crítico de Fase 3.

### Backend — Sprint B4: Modelo de conversación (3 semanas)

- [ ] Nuevas entidades de dominio: `Conversation` (agregado, estado: open/pending/closed, asignado a `WorkspaceUser`), `Message` (dirección in/out, canal, contenido, referencia a `Delivery` cuando aplica)
- [ ] Migración Prisma: tablas `Conversation`, `Message`, índices por `workspaceId + contactId + status`
- [ ] Normalizar recepción de mensajes entrantes: hoy `apps/webhook` solo registra receipts de entrega; extenderlo para crear/actualizar `Conversation` + `Message` al recibir un mensaje entrante de cualquier canal
- [ ] Casos de uso: `AssignConversationCommand`, `CloseConversationCommand`, `SendReplyCommand`, `ListConversationsQuery`, `GetConversationQuery`
- **Estimación:** 3 semanas, 1 dev

### Backend — Sprint B5: Reglas keyword → respuesta (2 semanas)

- [ ] Entidad `AutoReplyRule` (workspace-scoped: keyword/regex match, canal opcional, template de respuesta, activo/inactivo)
- [ ] Motor de matching simple ejecutado al recibir `Message` entrante (antes de crear la conversación como "pending", intenta autoresponder)
- [ ] Reutilizar `VariableResolver` de templates existente para personalizar la respuesta
- [ ] Base explícita para Fase 3: este motor de reglas es el "nodo trigger" más simple del futuro flow builder
- **Estimación:** 2 semanas, 1 dev

### Frontend — Sprint F2: Inbox (3 semanas, en paralelo a B4/B5)

- [ ] Nueva ruta `(dashboard)/inbox`: lista de conversaciones con filtros (estado, canal, asignado)
- [ ] Vista de hilo de conversación con envío de respuesta manual
- [ ] Asignación de conversación a agente del workspace (reusar `WorkspaceUser`)
- [ ] Notificaciones en tiempo real de mensajes entrantes (WebSocket o polling con React Query — evaluar costo/beneficio de socket dedicado)
- [ ] CRUD de `AutoReplyRule` en `settings/auto-replies`
- **Estimación:** 3 semanas, 1 dev

**Total Fase 2: ~5 semanas backend + 3 semanas frontend en paralelo → ~5-6 semanas de calendario con 2 devs.**

---

## Fase 3 — Flow builder visual + secuencias (12 semanas)

**Objetivo:** el feature más icónico de ManyChat, construido sobre el inbox y el motor de reglas de Fase 2.

### Backend — Sprint B6: Motor de flujos (5 semanas)

- [ ] Entidades: `Flow` (agregado), `FlowNode` (trigger/condition/action/delay), `FlowEdge`, `FlowExecution` (estado de una instancia de flujo corriendo para un contacto)
- [ ] Motor de ejecución: reusar el patrón ya probado `AudienceResolver → BatchPlanner → DeliveryGenerator` del broadcast engine, adaptado a ejecución dirigida por evento (mensaje entrante, tag agregado, tiempo transcurrido) en vez de por audiencia masiva
- [ ] Tipos de nodo v1: enviar mensaje, esperar (delay), condición (tag/campo de contacto), agregar/quitar tag, asignar a agente humano (handoff a inbox de Fase 2)
- [ ] Cola BullMQ dedicada para `FlowExecution` steps (desacoplada de la cola de campañas)
- **Estimación:** 5 semanas, 1-2 devs

### Backend — Sprint B7: Secuencias/drip sobre Campaign (2 semanas)

- [ ] Extender `Campaign` (o nueva entidad `Sequence` si el modelo de estados no encaja) a soportar múltiples pasos con delays entre sí, reusando `DeliveryGenerator`
- [ ] Migración y casos de uso: `CreateSequenceCommand`, pausar/reanudar por paso
- **Estimación:** 2 semanas, 1 dev

### Frontend — Sprint F3: Editor visual de flujos (5 semanas, arranca tras diseño de nodos de B6)

- [ ] Integrar librería de diagramas (React Flow) en nueva ruta `(dashboard)/flows`
- [ ] Editor drag-and-drop: paleta de nodos, conexión de edges, panel de configuración por nodo
- [ ] Vista de ejecución/debug: ver por qué un contacto está "atascado" en un nodo (crítico para confianza del usuario, gap típico en herramientas similares)
- [ ] Constructor de secuencias (UI simplificada, lista de pasos con delay, no requiere el canvas completo)
- **Estimación:** 5 semanas, 1-2 devs

**Total Fase 3: ~7 semanas backend + 5 semanas frontend, con solapamiento parcial → ~10-12 semanas de calendario con 2 devs.**

---

## Fase 4 — CRM enriquecido y compliance regional (6 semanas)

**Objetivo:** profundizar el diferenciador de compliance (opt-in/opt-out ya es más robusto que el promedio) y agregar segmentación real.

### Backend — Sprint B8: Custom fields y segmentos dinámicos (3 semanas)

- [ ] `ContactCustomField` (definición por workspace: tipo, nombre) + valores por contacto
- [ ] `Segment` (agregado): reglas combinables (tag, custom field, canal, actividad de conversación) evaluadas dinámicamente en vez de membership estática como `Group`
- [ ] Migrar `AudienceResolver` para aceptar `Segment` como tipo de audiencia de campaña/flujo, junto a `Group`/lista explícita ya soportados
- **Estimación:** 3 semanas, 1 dev

### Backend — Sprint B9: Compliance regional (2 semanas)

- [ ] Extender modelo de consentimiento existente (`acceptsCampaigns`, `consentSource`, `consentDate`, `optedOutAt`) con soporte de bases legales por región (GDPR: legitimate interest vs consent; LGPD; TCPA para SMS en EE.UU.)
- [ ] Reporte de auditoría de consentimiento exportable (ya existe `AuditLog`, agregar vista específica de compliance)
- **Estimación:** 2 semanas, 1 dev

### Frontend — Sprint F4: Segmentos y compliance (2 semanas, paralelo)

- [ ] Constructor visual de segmentos dinámicos en `contacts/segments`
- [ ] Custom fields: gestión de definiciones + edición en ficha de contacto
- [ ] Dashboard de compliance en `settings/compliance`
- **Estimación:** 2 semanas, 1 dev

**Total Fase 4: ~5 semanas backend + 2 semanas frontend en paralelo → ~5-6 semanas de calendario con 2 devs.**

---

## Fase 5 — Monetización + IA nativa (10 semanas)

### Backend — Sprint B10: Billing (3 semanas)

- [ ] Integración Stripe: planes, suscripciones, webhooks de facturación
- [ ] Aplicar límites ya presentes en `Workspace` (`maxContacts`, `maxCampaigns`) como enforcement real en los comandos de creación (hoy son campos sin validación activa)
- [ ] Portal de facturación (Stripe Customer Portal embebido)
- **Estimación:** 3 semanas, 1 dev

### Backend — Sprint B11: IA nativa (5 semanas)

- [ ] Nuevo tipo de nodo en el flow engine de Fase 3: "AI Agent" — responde con contexto del negocio (RAG sobre FAQ/documentos del workspace) en vez de reglas rígidas
- [ ] Servicio de LLM desacoplado (proveedor configurable, similar al patrón de providers de mensajería) para no atarse a un solo vendor de IA — coherente con el diferenciador open-core/sin lock-in
- [ ] Límite de uso de IA por plan (integra con B10)
- **Estimación:** 5 semanas, 1-2 devs

### Frontend — Sprint F5: Billing UI + configuración de IA (2 semanas)

- [ ] `settings/billing`: selección de plan, método de pago, historial de facturas
- [ ] `settings/ai-agent`: carga de documentos/FAQ, tono de voz, activar/desactivar por flujo
- **Estimación:** 2 semanas, 1 dev

**Total Fase 5: ~8 semanas backend + 2 semanas frontend → ~10 semanas de calendario con 2 devs.**

---

## Resumen de estimaciones

| Fase | Backend | Frontend | Calendario (2 devs) |
|---|---|---|---|
| 1 — Multicanal | 10 sem | 4 sem | ~10 sem |
| 2 — Inbox conversacional | 5 sem | 3 sem | ~5-6 sem |
| 3 — Flow builder + secuencias | 7 sem | 5 sem | ~10-12 sem |
| 4 — CRM y compliance | 5 sem | 2 sem | ~5-6 sem |
| 5 — Billing + IA nativa | 8 sem | 2 sem | ~10 sem |
| **Total** | **~35 sem** | **~16 sem** | **~40-44 sem (~9-10 meses)** con 2 devs trabajando en paralelo backend/frontend por fase |

Estimaciones a nivel de sprint (semana), no de tarea individual — asumen 1 dev de backend + 1 dev de frontend corriendo en paralelo dentro de cada fase, con handoff de contratos de API vía `packages/contracts` (patrón ya usado en Sprints 0-9).
