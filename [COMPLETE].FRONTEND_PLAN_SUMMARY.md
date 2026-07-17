# BROTE Frontend — Plan Summary & Next Steps

**Estado del documento:** ✅ COMPLETO — Resumen del plan de frontend ejecutado.


> **Next up:** frontend work resumes at Fase 1 (Multicanal, Sprint F1) of [`[IN_DEV].ROADMAP.md`](./[IN_DEV].ROADMAP.md) — channel connection UI for Messenger/Instagram/SMTP/Telegram, followed by the Inbox (Fase 2) and Flow Builder (Fase 3).

## The Plan at a Glance

**Framework:** Next.js 15 + TypeScript + TailwindCSS  
**Duration:** ~4 months (8 sprints × 2 weeks each)  
**Team:** Gonzalo + Claude  
**MVP Ready:** After Sprint 5 (~12 weeks)  

---

## Sprint Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 0 (2w) — Bootstrap                                   │
│ Next.js app + SDK client + basic auth                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 1 (2w) — Auth Flow                                   │
│ Register, login, logout, httpOnly cookies                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 2 (2w) — Dashboard Shell                             │
│ Authenticated layout, workspace context, navigation          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 3 (2w) — Provider Setup ⭐ REVENUE CRITICAL           │
│ WhatsApp/Email/SMS connection wizard (5-step)               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 4 (2w) — Contacts Management                          │
│ CRUD, search, bulk import via CSV                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 5 (2w) — Templates                                   │
│ Create, edit, preview, versioning                           │
│                                                              │
│ ✨ MVP READY: User can now register → connect provider →    │
│    import contacts → create campaign → send                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 6 (2w) — Campaigns Lifecycle                          │
│ Create wizard, schedule, pause, resume, cancel, archive      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 7 (2w) — Analytics & Monitoring                       │
│ Delivery metrics, live campaign status, charts               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SPRINT 8 (2w) — Polish & Hardening                           │
│ Mobile responsive, a11y, error handling, E2E tests           │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions

| Decision | Rationale | Upgrade Path |
|----------|-----------|--------------|
| **httpOnly Cookies** (not localStorage) | XSS protection | Already optimal |
| **Explicit Provider Config** (not dynamic form builder) | YAGNI, simpler code | Add generic schema when 5th provider requested |
| **Polling** (not WebSocket/SSE) | Backend doesn't expose push API | Add SSE when backend implements it |
| **TanStack Query** for data fetching | Built-in caching, refetch, error handling | Perfect for this use case |
| **@bcp/sdk package** (not fetch in pages) | Type safety, centralized API logic | Already optimal |
| **Single Workspace** (not multi-workspace UI) | Backend model is single-workspace-per-register | Defer UI until backend adds support |

---

## Package Structure

```
apps/web/                              ← New Next.js app
├── app/
│   ├── (auth)/          ← Login, register, invite
│   ├── (dashboard)/     ← All protected routes
│   ├── api/auth/        ← Route handler proxies (cookies, refresh)
│   └── globals.css
├── components/
│   ├── layout/          ← AuthLayout, DashboardLayout
│   ├── ui/              ← Button, Input, Card, Badge, etc.
│   └── ProviderWizard/  ← 5-step channel connection
├── lib/
│   ├── queryKeys.ts     ← TanStack Query key factory
│   └── utils.ts
└── tests/e2e/           ← Playwright E2E tests

packages/sdk/            ← **CRITICAL PATH**
├── src/
│   ├── client.ts        ← ApiClient class (bearer token, 401 refresh)
│   ├── auth.ts          ← register, login, refresh, logout
│   ├── contacts.ts      ← CRUD, import, groups
│   ├── templates.ts     ← CRUD, preview, versions
│   ├── campaigns.ts     ← CRUD, schedule, lifecycle actions
│   ├── channels.ts      ← connect, disconnect, health-check
│   ├── analytics.ts     ← delivery metrics, timeline
│   └── index.ts         ← barrel export
└── package.json         ← @bcp/sdk (already exists, currently empty)
```

---

## Backend API Contract

The frontend depends on these backend endpoints (all already built):

| Feature | Endpoints |
|---------|-----------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| **Contacts** | `GET/POST /workspaces/{id}/contacts`, `POST /contacts/import`, `GET /contacts/import/{jobId}`, `POST /contacts/{id}/opt-out` |
| **Templates** | `GET/POST /workspaces/{id}/templates`, `GET /templates/{id}/versions`, `POST /templates/{id}/preview` |
| **Campaigns** | `GET/POST /workspaces/{id}/campaigns`, `POST /campaigns/{id}/schedule`, `POST /campaigns/{id}/pause/resume/cancel/archive` |
| **Channels** | `GET /workspaces/{id}/channels`, `POST /channels/connect`, `POST /channels/test-connection`, `DELETE /channels/{id}`, `POST /channels/{id}/health-check` |
| **Analytics** | `GET /workspaces/{id}/analytics/campaigns/{campaignId}/deliveries` |

✅ **Status:** All endpoints exist and are documented in `/docs/openapi/openapi.yaml`

---

## Critical Path & Dependencies

### Blockers for Each Sprint

| Sprint | Blocker | Status |
|--------|---------|--------|
| 0 | @bcp/sdk needs ApiClient + auth module | ⏳ Ready to build |
| 1 | ApiClient + route handlers (auth proxy) | Depends on Sprint 0 |
| 2 | Auth endpoints working, WorkspaceContext | Depends on Sprint 1 |
| 3 | Channels endpoints (`/connect`, `/test-connection`) | ✅ Exists |
| 4 | Contacts endpoints (`/import`, import job status) | ✅ Exists |
| 5 | Templates endpoints (`/preview`) | ✅ Exists |
| 6 | Campaign lifecycle endpoints (all exist) | ✅ Exists |
| 7 | Analytics endpoints | ✅ Exists |
| 8 | No new blockers (polish only) | ✅ Clear |

---

## Quick Start: Sprint 0

Once you approve this plan, here's the immediate next step:

```bash
# 1. Create Next.js app in monorepo
pnpm create next-app apps/web --typescript --tailwind --app --no-src-dir

# 2. Configure workspace
# - Update pnpm-workspace.yaml to include apps/web
# - Set @bcp/web as package name
# - Extend tsconfig.base.json paths

# 3. Build SDK skeleton
# - Create packages/sdk/src/client.ts (ApiClient class)
# - Create packages/sdk/src/auth.ts (register, login, refresh, logout)

# 4. Setup auth proxy
# - Create apps/web/app/api/auth/route.ts (handles cookie setting)
# - Create middleware.ts (protects /dashboard routes)

# 5. Verify
pnpm --filter @bcp/web dev  # Should start on port 3002
pnpm typecheck              # Should pass
```

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| **Unit** | Vitest + MSW | SDK client, custom hooks, form validation |
| **Integration** | Vitest | SDK + route handlers against mocked API |
| **E2E** | Playwright | Full user journeys (register → campaign launch) |
| **Accessibility** | Axe-core (automated) | WCAG 2.1 AA compliance, gated in CI |

**Coverage Gate:** 80% on `@bcp/sdk` + shared hooks. Pages covered via E2E (more realistic than unit tests).

---

## Success Metrics (MVP Checkpoint — Sprint 5)

After 12 weeks, the frontend should support:

- ✅ **Registration:** Create workspace + owner user
- ✅ **Authentication:** Login/logout with httpOnly session persistence
- ✅ **Provider Setup:** Connect WhatsApp/Email/SMS with credential testing
- ✅ **Contact Import:** Upload CSV, map columns, track job status
- ✅ **Template Creation:** Write message template with variable placeholders
- ✅ **Campaign Launch:** Select template + contacts + send (immediate or scheduled)
- ✅ **Basic Monitoring:** See campaign status and delivery count
- ✅ **Mobile Usable:** Responsive on phones, accessible with keyboard

This is the **minimum viable product**. Later sprints add features, not MVP requirements.

---

## Nice-to-haves (Post-MVP)

These are not in the sprint plan; defer until feedback:

- Multi-workspace switcher
- Advanced audience segmentation
- A/B testing UI
- Webhook integrations
- Custom domain setup
- White-label theme config
- API keys + OAuth flows
- Zapier/Make.com integrations
- Advanced analytics (heatmaps, funnels)

Each requires backend support, which doesn't exist yet. Build them when backend is ready.

---

## Next Steps

1. **Approve this plan** → Will confirm timeline, dependencies, and success criteria
2. **Start Sprint 0** → Create Next.js app, build SDK skeleton, setup auth proxy
3. **Daily standup** → ~15min sync on blockers, PRs, design decisions
4. **End of sprint** → Demo to stakeholders, retrospective (what went well, what to improve)

---

## Questions?

- **Timeline too long?** Can compress by working in parallel (e.g., sprints 4-5 in parallel if team splits), but 4 months is realistic for one team.
- **Why not use existing UI library?** Could use Shadcn/ui or Headless UI — would speed up Sprint 0-2, add minimal overhead. Recommend adding by Sprint 3 if time permits.
- **Why TanStack Query?** Caching + refetch logic saves ~500 lines of error handling and state management. Alternative: Redux, Zustand + custom hooks (more code, harder to maintain).
- **Why not Clerk/Auth0?** Backend owns auth (JWT + refresh tokens). Frontend proxy pattern is standard for SaaS monorepos; adds ~200 lines, keeps auth logic close to backend contract.

---

**Ready to ship.** 🚀
