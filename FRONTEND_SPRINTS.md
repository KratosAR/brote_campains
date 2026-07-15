# BROTE Communication Platform — Frontend Sprints (Next.js)

**Framework:** Next.js 15 + TypeScript + TailwindCSS  
**Team:** Gonza + Claude  
**Estimated Duration:** 8 sprints (~4 months)

---

## Sprint 0 — Bootstrap (2 semanas)

**Objetivo:** Proyecto Next.js operativo en monorepo, SDK typed client, autenticación base segura.

### Tareas

#### Setup Next.js App

```bash
pnpm create next-app apps/web --typescript --tailwind --app --no-src-dir
```

- [ ] Crear `apps/web` en monorepo
- [ ] Configurar `package.json`: nombre `@bcp/web`
- [ ] Agregar a `pnpm-workspace.yaml`
- [ ] Configurar `tsconfig.json` con paths: `@/*`, `@bcp/*`
- [ ] Instalar dependencias:
  - `@tanstack/react-query` (data fetching + caching)
  - `react-hook-form`, `zod` (forms + validation)
  - `clsx` (className utilities)
  - `@axe-core/playwright` (a11y testing)
  - `@playwright/test` (E2E)
  - `msw` (Mock Service Worker para tests)

#### Build @bcp/sdk (Critical Path)

- [ ] `packages/sdk/src/client.ts` — `ApiClient` class:

  ```typescript
  class ApiClient {
    constructor(baseURL: string)
    private async request<T>(method, path, body?, options?): Promise<T>
    // Handles:
    // - JSON envelope typing (ApiResponse<T> = { success, data, error })
    // - Bearer token injection from cookies
    // - 401 → refresh-token retry once (dedup in-flight refreshes)
    // - 401 again → redirect to /login on frontend side
  }
  ```

- [ ] `packages/sdk/src/auth.ts`:

  ```typescript
  export async function register(...)
  export async function login(email, password)
  export async function logout()
  export async function refreshToken()
  ```

- [ ] `packages/sdk/src/index.ts` — barrel export

#### Auth Route Handler Proxy

- [ ] `apps/web/app/api/auth/route.ts` — handles token persistence:
  - `POST /api/auth/login` → calls SDK login → sets httpOnly cookies (access + refresh)
  - `POST /api/auth/refresh` → backend refresh → rotates cookies
  - `POST /api/auth/logout` → clears cookies
  - Rationale: httpOnly cookies prevent XSS token theft (localStorage is XSS-vulnerable)

#### Middleware & Routing

- [ ] `apps/web/middleware.ts`:
  - Check cookie presence for protected routes (`/dashboard/*`)
  - Redirect unauthenticated → `/login`
  - Redirect authenticated to `/login` → `/dashboard`

- [ ] Route groups:
  - `app/(auth)/` — login, register, invite
  - `app/(dashboard)/` — everything else

#### Layout & Base Components

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (dashboard)/
│   │   └── layout.tsx
│   ├── api/auth/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── AuthLayout.tsx
│   │   └── DashboardLayout.tsx (sidebar, header)
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── ErrorAlert.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── queryKeys.ts (TanStack Query key factory)
│   └── utils.ts
└── middleware.ts
```

#### React Context + Hooks

- [ ] `WorkspaceContext` — workspace id from JWT, exposed via `useWorkspace()`
- [ ] `useAuth()` — user + logout function
- [ ] Setup `QueryClientProvider` in root layout

#### Testing Setup

- [ ] `playwright.config.ts`
- [ ] `apps/web/tests/e2e/health.spec.ts` — smoke test (GET /health renders)
- [ ] MSW setup for unit test mocking

#### CI/CD

- [ ] Update `turbo.json`:
  - Add `apps/web` to build, dev, lint, typecheck pipelines
- [ ] `package.json` root: keep existing `pnpm dev` (→ api only), add `pnpm dev:web`

### API Endpoints Used

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /health` (smoke test)

### Criterios de Aceptación

- [ ] `pnpm --filter @bcp/web dev` levanta Next.js en puerto 3001
- [ ] `pnpm typecheck` pasa
- [ ] SDK client exports typed functions, no TS errors
- [ ] Middleware redirects unauthenticated users to login
- [ ] Playwright smoke test passes
- [ ] CI pipeline green (lint, typecheck, build, E2E)

---

## Sprint 1 — Auth Flow (2 semanas)

**Objetivo:** Registro, login, logout, session persistence con httpOnly cookies.

### Tareas

#### SDK Auth Expansion

- [ ] `packages/sdk/src/auth.ts` — completar:
  ```typescript
  export async function register(data: {
    ownerName: string
    ownerEmail: string
    ownerPassword: string
    workspaceName: string
    timezone?: string
  }): Promise<{ workspaceId: string; userId: string; accessToken: string }>

  export async function login(email: string, password: string)
  export async function logout()
  ```

#### Login Page

- [ ] `app/(auth)/login/page.tsx`
  - Zod schema: email (RFC 5321), password (required)
  - Form state via react-hook-form
  - Submit → `POST /api/auth/login` (route handler) → sets cookies
  - On success → redirect `/dashboard`
  - On error (401, 400) → show inline field errors or toast
  - Link to register

#### Register Page

- [ ] `app/(auth)/register/page.tsx`
  - Zod schema: workspaceName (3-50 chars), ownerName, email, password (8+ chars, mixed case/number/symbol), confirmPassword
  - Submit → `POST /api/auth/register` → sets cookies
  - Error: workspace slug duplicate (409) → show "Workspace name taken"
  - Error: email duplicate (400) → show "Email already registered"
  - Link to login

#### Invitation Page

- [ ] `app/(auth)/invite/[token]/page.tsx`
  - Extract `token` from URL params
  - Form: name, password, confirmPassword
  - Submit → `POST /api/auth/invitations/{token}/accept`
  - On success → redirect `/dashboard`
  - Error: invalid/expired token → show message + link to login

#### Error Handling & Toast System

- [ ] `components/Toast.tsx` — simple toast container
  - Types: success, error, info
  - Auto-dismiss after 5s
  - Context: `ToastProvider` + `useToast()` hook

- [ ] API error handling standardized:
  - 400 → validation errors (map to form fields)
  - 401 → "Session expired, please log in again" + redirect
  - 409 → domain business error (e.g., "Workspace name taken")
  - 500 → generic "Something went wrong"

#### Route Handler Improvements

- [ ] `apps/web/app/api/auth/login/route.ts`

  ```typescript
  POST body: { email, password }
  - Call SDK login()
  - Set cookies: "accessToken" (short-lived), "refreshToken" (httpOnly, 30d)
  - Return { workspaceId, userId }
  - On SDK error → 401/400 response with error message
  ```

- [ ] `apps/web/app/api/auth/refresh/route.ts`
  ```typescript
  POST
  - Get refreshToken from cookies
  - Call SDK refreshToken()
  - Rotate cookies
  - Return new accessToken
  - On error → 401 → frontend must redirect to login
  ```

#### Session Persistence

- [ ] `useAuth()` hook:
  - Calls `GET /api/auth/me` (new endpoint on backend OR extract from JWT in cookie) on mount
  - Returns { user, isLoading, error }
  - Logout function

- [ ] Auto-refresh: TanStack Query intercepts 401, calls refresh handler, retries request
  - Dedup in-flight refreshes (single in-flight promise)

#### Testing

- [ ] Unit tests (MSW mocked fetch):
  - `packages/sdk/src/__tests__/auth.test.ts`
    - register() returns tokens
    - login() with invalid credentials fails
    - refreshToken() rotates token

- [ ] Playwright E2E:
  - `apps/web/tests/e2e/auth.spec.ts`
    - Register → redirected to dashboard
    - Login with invalid → error shown
    - Login with valid → redirected
    - Logout → cookies cleared

### API Endpoints Used

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /invitations/{token}/accept`

### Criterios de Aceptación

- [ ] Register creates workspace + sets cookies
- [ ] Login with valid creds succeeds
- [ ] Login with invalid creds shows error (no crash)
- [ ] Tokens stored in httpOnly cookies (not localStorage)
- [ ] Refresh token rotation works (call refresh, get new token)
- [ ] Logout clears cookies
- [ ] E2E test passes full auth flow

---

## Sprint 2 — Dashboard Shell + Workspace Context (2 semanas)

**Objetivo:** Dashboard layout y workspace overview.

### Tareas

#### Dashboard Layout

- [ ] `app/(dashboard)/layout.tsx` — componente base
  - Sidebar navegable (links: Dashboard, Contacts, Templates, Campaigns, Channels, Analytics, Settings)
  - Header con workspace nombre, user menu (profile, logout)
  - Main content area

#### Dashboard Page

- [ ] `app/(dashboard)/page.tsx`
  - Workspace info card (name, created date, users count)
  - Quick stats (total contacts, campaigns, messages sent)
  - Recent campaigns list (últimas 5)
  - Next steps cards (Connect channel, Import contacts, Create campaign)

#### Workspace Settings

- [ ] `app/(dashboard)/settings/page.tsx`
  - Workspace name, description
  - Timezone, locale
  - Max contacts, max campaigns (info only)
  - Edit workspace form
  - Endpoint: `GET /workspaces/{id}`, `PUT /workspaces/{id}`

#### User Management

- [ ] `app/(dashboard)/settings/users/page.tsx`
  - Lista de usuarios en workspace
  - Invitar nuevo usuario (form)
  - Cambiar role de usuario
  - Remover usuario
  - Endpoints: `GET /workspaces/{id}/users`, `POST /workspaces/{id}/users/invite`, etc.

#### Navigation Store

- [ ] Zustand store para `activeTab`, `mobileMenuOpen`
- [ ] Responsive: sidebar collapsible en mobile

### API Endpoints Used

- `GET /workspaces/{id}`
- `PUT /workspaces/{id}` (si existe)
- `GET /workspaces/{id}/users`
- `POST /workspaces/{id}/users/invite`

### Criterios de Aceptación

- [ ] Dashboard carga datos del workspace
- [ ] Sidebar navega entre secciones
- [ ] Settings editable
- [ ] Responsive en mobile

---

## Sprint 3 — Provider Setup (Channel Connection Wizard) ⭐ PRIORITY (2 semanas)

**Objetivo:** Revenue-critical: connect WhatsApp/Email/SMS providers end-to-end.

### Tareas

#### SDK Channels Module

- [ ] `packages/sdk/src/channels.ts`:
  ```typescript
  export async function listChannels(workspaceId): Promise<Channel[]>
  export async function connectChannel(workspaceId, channel, providerId, credentials)
  export async function testConnection(workspaceId, channel, providerId, credentials)
  export async function disconnectChannel(workspaceId, channel)
  export async function getChannelStatus(workspaceId, channel)
  export async function healthCheckChannel(workspaceId, connectionId)
  ```

#### Channels List Page

- [ ] `app/(dashboard)/channels/page.tsx`
  - Query: `useQuery(['channels'], listChannels)`
  - Grid/list of channel cards (WhatsApp, Email, SMS)
  - Per-card: status badge (active/error/pending), actions (Edit, Disconnect, Health Check)
  - Button "Add Provider"
  - Modal trigger for wizard

#### Provider Connection Wizard (5-step)

- [ ] `components/ProviderWizard.tsx` — state machine:
  ```
  Step 1: Choose channel (WhatsApp/Email/SMS)
  Step 2: Choose provider (Meta/Evolution for WhatsApp; SMTP for Email; Twilio for SMS)
  Step 3: Enter credentials (provider-specific form)
  Step 4: Test connection (call health-check endpoint)
  Step 5: Confirm & save
  ```

#### Step 1: Channel Selection

- [ ] `components/ChannelSelector.tsx`
  - Button grid: WhatsApp, Email, SMS
  - Icons + descriptions
  - Next button → step 2

#### Step 2: Provider Selection

- [ ] `components/ProviderSelector.tsx`
  - List providers available for chosen channel
  - Each with: name, icon, description (e.g., "Meta Cloud API" vs "Evolution API")
  - Select → step 3

#### Step 3: Credential Form (No Dynamic Schema Engine — Explicit Switch)

- [ ] `lib/providerConfig.ts` — hardcoded provider forms:

  ```typescript
  const PROVIDER_CONFIGS = {
    'whatsapp/meta': {
      name: 'Meta Cloud API',
      fields: [
        { name: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true, help: '...' },
        { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
        { name: 'businessAccountId', label: 'Business Account ID', type: 'text', required: false },
      ]
    },
    'whatsapp/evolution': { ... },
    'email/smtp': { ... },
    'sms/twilio': { ... },
  }
  ```

- [ ] `components/CredentialForm.tsx` — maps over config.fields:
  - Text/email/password/number/url/tel inputs
  - React-hook-form validation with Zod
  - Error messages under each field
  - Next button (disabled until valid)

#### Step 4: Test Connection

- [ ] `components/TestConnection.tsx`
  - Show: "Testing connection..."
  - Call API: `testConnection(channel, providerId, credentials)`
  - On success: ✅ "Connected successfully" + Next button
  - On error (409 conflict): Show specific message "This channel is already connected to another provider"
  - On error (generic): Show error message from API + "Retry" button

#### Step 5: Confirmation

- [ ] `components/ProviderConfirmation.tsx`
  - Summary: channel, provider, tested ✅
  - Button "Save & Connect"
  - Call: `connectChannel(workspaceId, channel, providerId, credentials)`
  - On success: close modal, refetch channels, show toast "Provider connected!"
  - On error: show error

#### Channel Card Component

- [ ] `components/ChannelCard.tsx`:
  ```typescript
  interface ChannelCardProps {
    channel: 'WhatsApp' | 'Email' | 'SMS'
    connection?: {
      provider: string
      isActive: boolean
      lastTestedAt?: Date
      status: 'healthy' | 'error' | 'pending'
    }
    onEdit: () => void
    onDisconnect: () => void
    onHealthCheck: () => void
  }
  ```
  - Show provider name + status
  - Action buttons
  - Disconnect with confirm dialog: "This will disconnect all campaigns using this channel. Continue?"

#### Error Handling & Business Rules

- [ ] 409 (Primary Connection Conflict): "This channel is already connected. Disconnect the existing provider first."
- [ ] 400 (Invalid Credentials): Show API error message
- [ ] Network errors: "Connection failed. Check your credentials and try again."
- [ ] All errors in toasts (not modals)

#### State Management

- [ ] Wizard state (open, currentStep, selectedChannel, selectedProvider, testResult, loading)
- [ ] Store in component local state (useState) — no need for global store yet

#### Testing

- [ ] Unit tests:
  - `lib/__tests__/providerConfig.test.ts` — verify all providers have required fields
  - `components/__tests__/ProviderWizard.test.tsx` — step navigation (mock useMutation)
  - Form validation per provider

- [ ] Playwright E2E:
  - Happy path: open wizard → select WhatsApp → select Meta → enter valid creds → test → confirm
  - Error path: enter invalid creds → test fails → retry → success
  - 409 conflict: attempt to connect when already connected → show specific error
  - Disconnect flow: show confirm → disconnect

#### ponytail: note

- No generic dynamic form builder (would need JSON schema engine).
- Explicit switch over 3-4 known providers is the YAGNI choice.
- Upgrade path: if 5th provider arrives, revisit the architecture; don't build it speculatively.

### API Endpoints Used

- `GET /workspaces/{id}/channels` (list)
- `POST /workspaces/{id}/channels/connect` (connect)
- `POST /workspaces/{id}/channels/test-connection` (test)
- `DELETE /workspaces/{id}/channels/{channel}` (disconnect)
- `GET /workspaces/{id}/channels/{channel}/status` (status)
- `POST /workspaces/{id}/channels/{connectionId}/health-check` (manual health check)

### Criterios de Aceptación

- [ ] List all connected/disconnected channels
- [ ] Open wizard, complete 5-step flow
- [ ] Test connection succeeds with valid creds
- [ ] Test connection fails with invalid creds, shows error
- [ ] Save credentials after test passes
- [ ] Disconnect channel with confirmation
- [ ] 409 conflict error shows specific message
- [ ] E2E test covers happy + error paths
- [ ] All fields properly validated before advancing

---

## Sprint 4 — Contacts Management (2 semanas)

**Objetivo:** CRUD de contactos, búsqueda, bulk import.

### Tareas

#### Contacts List Page

- [ ] `app/(dashboard)/contacts/page.tsx`
  - Tabla paginada de contactos (20 por página)
  - Columnas: nombre, email/phone, tags, status, actions
  - Ordenamiento por nombre, fecha
  - Búsqueda (query)
  - Filtros: tags, status, acceptsCampaigns
  - Botones: Create, Import, Export

#### Contacts Table Component

- [ ] Tabla responsiva (scrollable en mobile)
- [ ] Row actions: View, Edit, Delete
- [ ] Selección multi-check (select all, individual)
- [ ] Bulk actions: Delete, Add tag

#### Create/Edit Contact Modal

- [ ] Form: name, phone, email, tags, groups, acceptsCampaigns
- [ ] Validación
- [ ] Endpoints: `POST /workspaces/{id}/contacts`, `PUT /workspaces/{id}/contacts/{contactId}`

#### Bulk Import

- [ ] Upload CSV/Excel
- [ ] Preview: primeras filas antes de importar
- [ ] Mapping: columnas del archivo → campos del sistema
- [ ] Endpoint: `POST /workspaces/{id}/contacts/import`
- [ ] Progress tracking: `GET /workspaces/{id}/contacts/import/{jobId}`
- [ ] Status: pending, processing, completed, failed

#### Contact Groups

- [ ] Sidebar: lista de grupos
- [ ] Filter by group
- [ ] CRUD de grupos: `GET /workspaces/{id}/groups`, etc.

#### Opt-out Management

- [ ] Ver contacts con opt-out
- [ ] Toggle opt-out status
- [ ] Endpoint: `POST /workspaces/{id}/contacts/{contactId}/opt-out`

### API Endpoints Used

- `GET /workspaces/{id}/contacts` (list with pagination, search)
- `POST /workspaces/{id}/contacts` (create)
- `GET /workspaces/{id}/contacts/{contactId}` (get)
- `PUT /workspaces/{id}/contacts/{contactId}` (update)
- `DELETE /workspaces/{id}/contacts/{contactId}` (delete)
- `POST /workspaces/{id}/contacts/import` (bulk import)
- `GET /workspaces/{id}/contacts/import/{jobId}` (import status)
- `POST /workspaces/{id}/contacts/{contactId}/opt-out` (opt-out)
- `GET /workspaces/{id}/groups`, `POST /workspaces/{id}/groups`, etc.

### Criterios de Aceptación

- [ ] Listar contactos con paginación
- [ ] Crear, editar, eliminar contacto
- [ ] Buscar y filtrar
- [ ] Importar CSV con validación
- [ ] Agrupar contactos
- [ ] Opt-out funciona

---

## Sprint 5 — Templates (1 semana)

**Objetivo:** Crear y gestionar templates de mensajes.

### Tareas

#### Templates List

- [ ] `app/(dashboard)/templates/page.tsx`
  - Tabla: nombre, canal, createdAt, actions
  - Create, Edit, Delete, Duplicate, Preview

#### Template Editor

- [ ] `app/(dashboard)/templates/[id]/edit/page.tsx`
  - Form: name, channel, body, variables
  - Preview live
  - Validación: variable names, character limits (WhatsApp: 1024, Email: ilimitado)
  - Guardar borradores y publicados

#### Template Preview

- [ ] Modal para previsualizar template
- [ ] Mock data para variables
- [ ] Mostrar como se ve en cada canal

#### Template Versioning (Basic)

- [ ] Ver versiones anteriores
- [ ] Rollback a versión anterior
- [ ] Endpoint: `GET /workspaces/{id}/templates/{templateId}/versions`

### API Endpoints Used

- `GET /workspaces/{id}/templates` (list)
- `POST /workspaces/{id}/templates` (create)
- `GET /workspaces/{id}/templates/{templateId}` (get)
- `PUT /workspaces/{id}/templates/{templateId}` (update)
- `DELETE /workspaces/{id}/templates/{templateId}` (delete)
- `POST /workspaces/{id}/templates/{templateId}/duplicate` (clone)
- `POST /workspaces/{id}/templates/{templateId}/preview` (preview)
- `GET /workspaces/{id}/templates/{templateId}/versions` (history)

### Criterios de Aceptación

- [ ] Crear template con variables
- [ ] Editar y guardar
- [ ] Preview con datos mock
- [ ] Versioning básico
- [ ] Validar límites de caracteres

---

## Sprint 6 — Campaigns (2 semanas)

**Objetivo:** Crear campañas, agendar ejecución, lanzar.

### Tareas

#### Campaigns List

- [ ] `app/(dashboard)/campaigns/page.tsx`
  - Tabla: nombre, template, recipients, status, createdAt, actions
  - Estados: Draft, Scheduled, Running, Paused, Completed, Archived, Failed
  - Acciones: View, Edit, Schedule, Execute, Pause, Resume, Cancel, Archive, Duplicate

#### Campaign Wizard (Create/Edit)

- [ ] Multi-step form:
  1. **Basics**: nombre, descripción
  2. **Channel & Template**: seleccionar canal, template
  3. **Recipients**: seleccionar contactos o grupos
  4. **Scheduling**: envío inmediato o agendado
  5. **Review & Launch**: resumen, botón "Create" o "Execute"

#### Campaign Detail Page

- [ ] `app/(dashboard)/campaigns/[id]/page.tsx`
  - Show: nombre, status, recipients, created, scheduled time
  - Stats: sent, delivered, failed, open rate, click rate
  - Actions: Pause, Resume, Cancel, Archive
  - Timeline de events

#### Campaign Status & Monitoring

- [ ] Real-time status updates (polling cada 5s o WebSocket)
- [ ] Progress bar: enviados vs total
- [ ] Endpoint: `GET /workspaces/{id}/campaigns/{campaignId}`

#### Scheduling

- [ ] Date picker + time picker
- [ ] Timezone-aware scheduling
- [ ] Endpoint: `POST /workspaces/{id}/campaigns/{campaignId}/schedule`
- [ ] Endpoint: `POST /workspaces/{id}/campaigns/{campaignId}/pause` (if running)

### API Endpoints Used

- `GET /workspaces/{id}/campaigns` (list)
- `POST /workspaces/{id}/campaigns` (create)
- `GET /workspaces/{id}/campaigns/{campaignId}` (get)
- `PUT /workspaces/{id}/campaigns/{campaignId}` (update)
- `DELETE /workspaces/{id}/campaigns/{campaignId}` (delete)
- `POST /workspaces/{id}/campaigns/{campaignId}/schedule` (schedule)
- `POST /workspaces/{id}/campaigns/{campaignId}/pause` (pause)
- `POST /workspaces/{id}/campaigns/{campaignId}/resume` (resume)
- `POST /workspaces/{id}/campaigns/{campaignId}/cancel` (cancel)
- `POST /workspaces/{id}/campaigns/{campaignId}/archive` (archive)
- `POST /workspaces/{id}/campaigns/{campaignId}/duplicate` (clone)
- `GET /workspaces/{id}/campaigns/{campaignId}/timeline` (events)

### Criterios de Aceptación

- [ ] Crear campaña con wizard
- [ ] Seleccionar template, contactos, scheduling
- [ ] Ejecutar inmediatamente o agendar
- [ ] Ver status en tiempo real
- [ ] Pausar, reanudar, cancelar
- [ ] Ver timeline de eventos

---

## Sprint 7 — Analytics (1.5 semanas)

**Objetivo:** Dashboards de resultados y métricas de campañas.

### Tareas

#### Analytics Dashboard

- [ ] `app/(dashboard)/analytics/page.tsx`
  - Overview cards: total messages sent, delivered, failed, avg open rate, avg click rate
  - Chart: message volume over time (últimas 30 días)
  - Chart: delivery status breakdown (pie)
  - Top campaigns (table)
  - Recent events (log)

#### Campaign Analytics Detail

- [ ] `app/(dashboard)/campaigns/[id]/analytics/page.tsx`
  - Stats: sent, delivered, failed, bounced, open, click
  - Timeline: cuando se enviaron, deliveries over time
  - Recipient stats: distribution por status
  - Click tracking (si aplica)

#### Charts & Graphs

- [ ] Usar `recharts` o `chart.js`
- [ ] Responsive charts
- [ ] Export to CSV

#### Filters

- [ ] Date range picker
- [ ] Filter by channel, campaign, status
- [ ] Real-time updates (si backend soporta)

### API Endpoints Used

- `GET /workspaces/{id}/analytics/campaigns` (overview)
- `GET /workspaces/{id}/analytics/campaigns/{campaignId}/deliveries` (detail)
- `GET /workspaces/{id}/analytics/campaigns/{campaignId}/timeline` (timeline)

### Criterios de Aceptación

- [ ] Ver métricas agregadas
- [ ] Ver detalles por campaña
- [ ] Filtrar por fecha
- [ ] Charts legibles y responsive

---

## Sprint 8 — Polish & Hardening (1.5 semanas)

**Objetivo:** UX refinement, mobile, accessibility, error handling.

### Tareas

#### Mobile Responsiveness

- [ ] Probar en móvil (Chrome DevTools)
- [ ] Breakpoints: xs (320px), sm (640px), md (768px), lg (1024px)
- [ ] Sidebar → drawer en mobile
- [ ] Tables → horizontal scroll o card layout
- [ ] Modal → fullscreen en mobile

#### Accessibility (WCAG 2.1 AA)

- [ ] Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`
- [ ] ARIA labels, aria-describedby, aria-label
- [ ] Color contrast (4.5:1 para text, 3:1 para UI)
- [ ] Keyboard navigation: Tab, Enter, Escape
- [ ] Screen reader testing (NVDA o JAWS)
- [ ] Form validation messages linked to inputs

#### Error Handling

- [ ] Graceful degradation si API falla
- [ ] Retry logic para requests fallidos
- [ ] 404 page
- [ ] 500 error boundary
- [ ] Network error messages
- [ ] Timeout handling

#### Performance

- [ ] Code splitting: lazy load pages
- [ ] Image optimization (next/image)
- [ ] Memoization de componentes complejos (React.memo)
- [ ] Bundle size analysis
- [ ] Lighthouse score ≥ 80

#### UX Improvements

- [ ] Loading skeletons para tablas
- [ ] Confirmación antes de acciones destructivas (delete)
- [ ] Toast notifications (success, error, info, warning)
- [ ] Empty state messages
- [ ] No data placeholders

#### E2E Testing

- [ ] Setup Playwright o Cypress
- [ ] Test critical flows:
  - Register → Login → Dashboard
  - Connect Provider → Import Contacts → Create Campaign
  - Execute Campaign → View Analytics
- [ ] Run en CI/CD

### Criterios de Aceptación

- [ ] App funciona en mobile (iOS Safari, Chrome Android)
- [ ] Todos los inputs tienen labels
- [ ] Tab navigation fluido
- [ ] Lighthouse ≥ 80
- [ ] E2E tests pasan
- [ ] No console errors

---

## Roadmap Timeline

| Sprint   | Duración  | Week  | Prioridad              |
| -------- | --------- | ----- | ---------------------- |
| Sprint 0 | 2 semanas | 1-2   | Foundation             |
| Sprint 1 | 2 semanas | 3-4   | Critical               |
| Sprint 2 | 2 semanas | 5-6   | Critical               |
| Sprint 3 | 2 semanas | 7-8   | ⭐ MVP Revenue Feature |
| Sprint 4 | 2 semanas | 9-10  | MVP Feature            |
| Sprint 5 | 2 semanas | 11-12 | MVP Feature            |
| Sprint 6 | 2 semanas | 13-14 | MVP Feature            |
| Sprint 7 | 2 semanas | 15-16 | Polish                 |
| Sprint 8 | 2 semanas | 17-18 | Polish                 |

**Total: ~16-18 semanas (~4 meses)**

## MVP Checkpoint (End of Sprint 5)

After Sprint 5 (~12 weeks), the MVP is revenue-ready:

- ✅ User can register workspace, log in
- ✅ User can connect WhatsApp provider
- ✅ User can import contacts via CSV
- ✅ User can create and send a campaign
- ✅ User can view delivery status

Sprints 6-8 add templates, full campaign lifecycle, analytics, and polish.

## Architecture Decisions Documented

- **No localStorage for tokens** — httpOnly cookies only (XSS protection)
- **No dynamic form builder** — explicit provider config switch (YAGNI)
- **No websocket/SSE** — polling is acceptable given backend doesn't expose push API
- **No multi-workspace support** — backend model is single workspace per register; defer until backend adds support
- **TanStack Query** — preferred for data fetching + caching (better than Context + useEffect)
- **Minimal global state** — workspace id in context; rest in component state or Query cache

Each is documented as a `ponytail:` upgrade path in sprint descriptions.

---

## MVP Feature Set (Sprints 0-4)

Para un MVP viable:

- Auth + Dashboard
- Provider Setup ⭐
- Contacts Import
- Basic templates
- Simple campaigns

**Resultado:** Usuario puede conectar WhatsApp → Importar 1000 contactos → Crear y lanzar campaña.

---

## Nice-to-haves (Futuros Sprints)

- Multi-workspace support
- Advanced segmentation
- A/B testing
- Webhook integrations
- Custom domain
- White-label
- API keys for integrations
- Zapier/Make integrations
