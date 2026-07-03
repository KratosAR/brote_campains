# Sprint 2 — Security review: Auth module

Date: 2026-07-03
Scope: `packages/application/src/auth/**`, `apps/api/src/{routes,middleware,repositories,config}/**` (auth-related only).
Verification: `pnpm --filter @bcp/application build/test`, `pnpm --filter @bcp/api build/test` — all green after each fix.

## Fixed

| # | File | Severity | Issue | Fix |
|---|------|----------|-------|-----|
| 1 | `apps/api/src/routes/workspaces.ts` | CRITICAL | IDOR: any authenticated user could read any workspace by ID — token was validated but never checked against `:id`. | `requireOwnWorkspace` middleware (see ADR below), not a per-route `if`. |
| 2 | `packages/application/src/auth/InviteUserCommand.ts` | HIGH | Privilege escalation: an Admin could invite a new user as **Owner**, minting permissions above their own. | Reject `role === UserRole.Owner` at invite time; ownership only via registration or `workspace:transfer`. |
| 3 | `packages/application/src/auth/security/accessToken.ts` | HIGH | JWT sign/verify didn't pin the algorithm — relied on library defaults against `alg:none`/confusion attacks. | `algorithm: 'HS256'` on sign, `algorithms: ['HS256']` on verify. |
| 4 | `packages/application/src/auth/LoginCommand.ts` | MEDIUM | Timing side-channel: unknown email skipped `bcrypt.compare` (~250ms) and returned in ~1ms, leaking account existence via response time. | Run a dummy `bcrypt.compare` against a constant cost-12 hash when the user isn't found. |
| 5 | `apps/api/src/middleware/requestLogger.ts` | MEDIUM | Invitation accept token (a bearer secret) travels in the URL path and was logged in plaintext on every request. | `redactSecrets()` masks `/invitations/:token` before logging. |
| 6 | `apps/api/src/repositories/InMemoryRepositories.ts` + application test double | MEDIUM | Refresh-token rotation race: two concurrent `/auth/refresh` calls with the same token could both pass the revoked/expired check and both mint a new pair (reuse window). | `revoke()` is now conditional (fails if already revoked); `RefreshTokenCommand` maps that failure to 401 instead of propagating a 404. Comment marks the Prisma upgrade path (`updateMany WHERE revokedAt IS NULL`, check affected rows). |
| 7 | `apps/api/src/middleware/rateLimit.ts` (new), wired into `auth.ts` + `invitations.ts` | HIGH | No rate limiting on `/auth/*` or invitation-accept — brute-forceable. | `express-rate-limit`, 20 req / 15 min / IP. In-memory store — per-instance ceiling, noted in code. |

## Verified OK, no change needed

- bcrypt cost factor 12; `bcrypt.compare` is timing-safe internally.
- Access token TTL is exactly 15 minutes (covered by `auth.integration.test.ts`).
- JWT payload carries only `sub`, `workspaceId`, `role`, `permissions` — no PII/secrets.
- Refresh tokens: `crypto.randomBytes(32)`, only the SHA-256 hash is persisted, plaintext never logged.
- Login error message is identical for "no such user" / "wrong password" / "no membership".
- `authenticate`/`authorize` middleware fail closed (401/403) on malformed/expired/bad-signature tokens; `authorize()` is typed against the `Permission` enum, no string-bypass surface.
- Invitations expire (7 days) and can't be re-accepted (`acceptedAt` check).
- `env.ts` validates all secrets at boot via Zod (min 32 chars), no defaults, nothing logged.
- Errors sent to clients are `DomainError.message` only — no stack traces.

## Known gaps — reported, not fixed (with reason)

- **Invitation double-accept race** (`AcceptInvitationCommand.ts`): window between the `acceptedAt` check and the final `save` (~250ms, the bcrypt hash). Closing it needs a conditional/atomic update in `IInvitationRepository` (contract change) — out of scope for a minimal diff. Low impact today because the in-memory repo reuses the same reserved `userId`, making a second accept idempotent. Revisit when the Prisma-backed `IInvitationRepository` lands: use a conditional `updateMany` and check affected rows.
- **Invitation token in the URL** (`POST /invitations/:token/accept`): still exposed to proxy/CDN access logs upstream of us; our own logs are now redacted (#5) but moving the token to the body is an API-shape decision left to the team.
- **`/auth/register` email-exists enumeration**: standard UX tradeoff, now mitigated by rate limiting (#7); not changed.
- **No revoke-all-sessions on refresh-token reuse detection**: a rotated token that gets reused now correctly 401s, but doesn't yet trigger revoking the user's other sessions (classic stolen-token signal). Future sprint.
- **`cors()` fully open** (`apps/api/src/app.ts`): low risk since auth is Bearer-token only (no cookies), but should be restricted before production.
- **`JWT_REFRESH_SECRET` env var required but unused**: refresh tokens are opaque by design (correct), the var looks vestigial. Left alone in case another part of the sprint depends on it.

## ADR: workspace-scoped route authorization lives in router middleware, not per-handler

**Context.** The first fix for IDOR #1 was an inline `if (req.user.workspaceId !== req.params.id)` guard added directly to the `GET /workspaces/:id` handler. Correct behavior, wrong location: any route added later under `/workspaces/:id/*` (campaigns, contacts, etc. — Sprint 3+) would need the same check copy-pasted in, with no structural guarantee that anyone remembers to. That's exactly the class of bug being fixed.

**Domain check.** `IWorkspaceUserRepository.findByUserId` returns a single `WorkspaceUser` (`Result<WorkspaceUser, NotFoundError>`), not a list — the current domain model is one user → one membership → one workspace. That means the JWT's `workspaceId` claim already **is** the user's full authorization scope; comparing it to `:id` is correct business logic, not a workaround.

**Decision.** Moved the check into `apps/api/src/middleware/requireOwnWorkspace.ts`, mounted once per router via `router.use('/workspaces/:id', authenticate(jwtSecret), requireOwnWorkspace)` in `apps/api/src/routes/workspaces.ts`. Every route nested under that path inherits it automatically; the invite endpoint's own separate `authenticate()` call was removed as a result (now redundant).

**Consequence / upgrade path.** If a user is ever allowed to belong to multiple workspaces, `requireOwnWorkspace` must switch from reading the JWT claim to querying `workspaceUserRepository` for membership — marked with a `ponytail:` comment in the file. No documented ADR or spec contradicted this approach; `docs/adr/` was empty and `docs/openapi/openapi.yaml` is still a 43-line skeleton, so this file is the first record of the decision.

## Files touched (this review)

- `packages/application/src/auth/security/accessToken.ts`
- `packages/application/src/auth/LoginCommand.ts`
- `packages/application/src/auth/InviteUserCommand.ts`
- `packages/application/src/auth/RefreshTokenCommand.ts`
- `packages/application/src/auth/__tests__/testDoubles.ts`
- `apps/api/src/routes/workspaces.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/invitations.ts`
- `apps/api/src/middleware/requestLogger.ts`
- `apps/api/src/middleware/rateLimit.ts` (new)
- `apps/api/src/middleware/requireOwnWorkspace.ts` (new)
- `apps/api/src/repositories/InMemoryRepositories.ts`
- `apps/api/src/__tests__/auth.integration.test.ts` (regression tests: cross-workspace 403, Owner-role invite rejection)
- `apps/api/package.json`, `pnpm-lock.yaml` (`express-rate-limit`)
