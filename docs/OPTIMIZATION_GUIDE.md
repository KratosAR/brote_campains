# Optimization & Best Practices Guide

## 4.3: Dependency Compatibility Matrix

### Problem: Version Conflicts

When updating dependencies, transitive dependencies can conflict:
```
your-package@2.0 needs lodash@^4.17
other-package@3.0 needs lodash@^3.0
→ npm install fails or installs wrong version
```

### Solution: Dependency Audit Matrix

**Monthly review:**

```bash
# Generate compatibility matrix
npm list --depth=0

# Check for duplicates
npm ls lodash

# Identify conflicts
npm audit --production
```

**Document in:**
```markdown
# Dependency Compatibility Matrix (2026-07-15)

| Package | Version | Status | Compatible With |
|---------|---------|--------|-----------------|
| express | 4.21.2 | ✅ | Node 20+ |
| typeorm | 0.3.x | ⚠️ Unused | — |
| lodash | 4.17.21 | ✅ | Used by 3 packages |
| zod | 3.24.3 | ✅ | TypeScript 5.8+ |

## Conflicts
- None currently

## Deprecated
- typeorm: Unused, candidate for removal

## Review cadence
- Monthly: Check for updates
- Quarterly: Full compatibility audit
```

**Action:** Track in `DEPENDENCY_MATRIX.md`, update monthly

---

## 4.4: Performance Baselines in CI

### Setup: Measure Build Performance

```yaml
# .github/workflows/performance.yml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Measure build time
        run: |
          START=$(date +%s)
          pnpm build
          END=$(date +%s)
          BUILD_TIME=$((END - START))

          echo "Build time: ${BUILD_TIME}s"

          # Baseline: allow ±10% variance
          MAX_TIME=60  # seconds
          if [ $BUILD_TIME -gt $MAX_TIME ]; then
            echo "⚠️ Build exceeds baseline ($BUILD_TIME > $MAX_TIME seconds)"
          fi

      - name: Measure test suite
        run: |
          START=$(date +%s)
          pnpm test --coverage
          END=$(date +%s)
          TEST_TIME=$((END - START))

          echo "Test time: ${TEST_TIME}s"
          MAX_TIME=120
          if [ $TEST_TIME -gt $MAX_TIME ]; then
            echo "⚠️ Tests exceed baseline ($TEST_TIME > $MAX_TIME seconds)"
          fi

      - name: Report metrics
        run: |
          echo "## Performance Report" >> $GITHUB_STEP_SUMMARY
          echo "- Build: ${BUILD_TIME}s (max: ${MAX_TIME}s)" >> $GITHUB_STEP_SUMMARY
          echo "- Tests: ${TEST_TIME}s (max: 120s)" >> $GITHUB_STEP_SUMMARY
          echo "- Coverage: 80%+" >> $GITHUB_STEP_SUMMARY
```

### Thresholds (Baselines)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Build time | <60s | Warn if >60s |
| Test suite | <120s | Warn if >120s |
| Lint time | <30s | Warn if >30s |
| Bundle size | <2MB | Fail if >2MB |
| API latency p95 | <500ms | Warn if >500ms |

**Action:** Add to CI, monitor trends weekly

---

## 4.5: CI Runner Cost Optimization

### Current Cost Analysis

```bash
# GitHub Actions pricing (as of 2026)
# - ubuntu-latest: $0.008/minute
# - Standard: 3,000 free minutes/month
# - Pay-per-minute after

# Monthly spend estimate:
# - 50 PRs × 10 min CI = 500 min (free tier)
# - 5 scheduled workflows × 15 min = 75 min (free tier)
# - Total: 575 min / month (within free tier)

# Estimated cost: $0
```

### Optimizations (if usage grows)

**1. GitHub Actions self-hosted runners** (your own hardware)
```bash
# One-time setup
docker run -d \
  -e RUNNER_NAME=bcp-runner-1 \
  -e ORG_NAME=your-org \
  -e RUNNER_TOKEN=$TOKEN \
  ghcr.io/actions/runner:latest
```
Cost: ~$0.10/month (vs $0.008/min on GitHub's hardware)

**2. Cache aggressively**
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```
Impact: Saves ~30-60s per run (if dependencies don't change)

**3. Reduce redundant jobs**
- Don't run E2E tests on every PR (only on main)
- Don't run performance tests on every commit
- Use `if: github.event_name == 'push'` gates

**4. Parallel job execution**
```yaml
matrix:
  node-version: [18, 20]
  os: [ubuntu-latest, macos-latest]
# Runs 4 jobs in parallel instead of sequential
```
Cost: Same per unit time, but can skip some configs

**Current recommendation:** Stay on GitHub's free tier until 5,000+ min/month

---

## 4.6: Security Architecture Documentation

### Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   API (Express + Node.js)               │
│  - Rate limiting (express-rate-limit)                   │
│  - CORS (origin whitelist)                              │
│  - Security headers (helmet.js recommended)             │
│  - Request validation (Zod schemas)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Application Layer (Domain Logic)            │
│  - Commands (RegisterWorkspace, CreateCampaign)         │
│  - Password validation (8+ chars, uppercase+lowercase   │
│    +number+special, bcrypt salt=12)                    │
│  - JWT authentication (HS256, 15min expiry)            │
│  - Refresh tokens (7 day expiry, separate secret)      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│           Infrastructure (Database + Cache)             │
│  - PostgreSQL (TLS connections, IAM auth if available)  │
│  - Redis (TLS, password auth)                          │
│  - Secrets: encrypted at rest (ENCRYPTION_KEY)          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│                 External Providers                      │
│  - Meta (WhatsApp): OAuth 2.0, creds encrypted         │
│  - Evolution API: API key rotation, TLS                │
│  - Webhook signing: HMAC verification                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Monitoring & Audit                     │
│  - Pino logging (structured, no PII)                   │
│  - Error tracking (Sentry or similar)                  │
│  - Audit log (who did what, when)                      │
│  - Rate limit enforcement                             │
│  - DDoS detection                                      │
└─────────────────────────────────────────────────────────┘
```

### Key Security Boundaries

**Boundary 1: User → API**
- ✅ TLS/HTTPS only (enforce in load balancer)
- ✅ CORS: whitelist known origins
- ✅ Rate limiting: 100 req/min per IP
- ✅ Validate all input (Zod schemas)

**Boundary 2: API → Database**
- ✅ Parameterized queries (Prisma ORM prevents SQLi)
- ✅ Principle of least privilege (API user has minimal DB perms)
- ✅ Connection pooling (prevent connection exhaustion)
- ✅ Encryption at rest (DB encryption enabled)

**Boundary 3: API → External Services**
- ✅ API key rotation (90 days)
- ✅ Encrypted storage (ENCRYPTION_KEY for creds)
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ TLS for all outbound requests

### Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| SQL Injection | Low | Critical | Parameterized queries |
| XSS (API) | Low | High | Input validation, CSP |
| Credential exposure | Medium | Critical | Encryption + rotation |
| DDoS | High | High | Rate limiting + WAF |
| Brute force login | Medium | High | Login throttling + MFA |
| JWT forgery | Low | Critical | HS256 + strong secret |
| Dependency vuln | Medium | High | Snyk + regular patching |

### Compliance Alignment

- **GDPR:** Data minimization (no PII in logs), DPO contact
- **SOC2:** Audit logging (who did what), encryption, access control
- **PCI DSS:** If handling payments (not applicable yet)
- **ISO27001:** Info security management system

---

## Quarterly Review

| Item | Frequency | Owner | Last Review |
|------|-----------|-------|-------------|
| Dependency audit | Monthly | Tech Lead | 2026-07-15 |
| Performance baselines | Monthly | DevOps | TBD |
| Security architecture | Quarterly | Security | TBD |
| Threat model | Annually | Security | TBD |
| CI cost analysis | Quarterly | DevOps | TBD |

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [The Twelve Factor App](https://12factor.net/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
