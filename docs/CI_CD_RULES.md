# CI/CD Pipeline Rules

## Overview

This document defines the CI/CD policies for BROTE Campaign Platform. All code must pass these checks before merging to `main`.

**Last Updated:** 2026-07-15  
**Status:** ACTIVE (enforced starting 2026-07-15)

---

## Branch Protection Policy

### Main Branch (`main`)

**Protected:** YES

**Required checks before merge:**
1. ✅ All CI workflow jobs pass (lint, typecheck, test, build)
2. ✅ Test coverage minimum 80% (per jest.config.js threshold)
3. ✅ No dependency vulnerabilities (Snyk scan passes)
4. ✅ No CISA KEV (Known Exploited Vulnerabilities) detected
5. ✅ At least 1 code review approval

**Settings (GitHub > Settings > Branches > main):**
```
- Require a pull request before merging: YES
- Require approvals: 1
- Require status checks to pass before merging: YES
  - Apps: api, cli, scheduler, webhook, worker
  - Packages: application, common, contracts, domain, infrastructure, sdk, testing
  - Providers: evolution, fake, meta
- Require branches to be up to date before merging: YES
- Include administrators: YES
- Allow force pushes: NO
- Allow deletions: NO
```

**Note:** Repository administrators must also follow these rules.

---

## CI/CD Pipeline Requirements

### Code Quality Gates

| Gate | Requirement | Failure Mode | Severity |
|------|-------------|--------------|----------|
| **Lint** | ESLint passes (warnings allowed) | Blocks merge | HIGH |
| **TypeCheck** | tsc passes with no errors | Blocks merge | HIGH |
| **Test Coverage** | ≥80% lines (per jest.config.js) | Blocks merge | CRITICAL |
| **Test Execution** | All tests pass (0 failures) | Blocks merge | CRITICAL |
| **Build** | Turbo build succeeds | Blocks merge | HIGH |
| **Snyk** | No high-severity deps (non-blocking) | Warns only | MEDIUM |
| **CISA KEV** | No exploited CVEs in deps | Warns only* | HIGH |

*Will block merge once fully integrated.

### Dependency Rules

| Rule | Details |
|------|---------|
| **No `--passWithNoTests`** | Test suites must have >0 tests. Empty test directories fail CI. |
| **Coverage threshold 80%** | All src code must have test coverage. Utilities, types, and test helpers excluded. |
| **No new packages without review** | Any `package.json` change reviewed for security (single-maintainer, unmaintained, etc) |
| **Snyk high-severity only** | Medium/low severity issues allowed; high-severity require escalation |
| **Vulnerability disclosure** | Critical/high CVEs: inform security team immediately |

### Secret Management

| Rule | Enforcement |
|------|------------|
| **No hardcoded secrets** | ESLint + pre-commit hook blocks commits with API keys, tokens, passwords |
| **No .env files in git** | `.env` is gitignored; only `.env.example` allowed |
| **Rotation policy** | JWT_SECRET, ENCRYPTION_KEY rotated every 90 days (automated in CD) |
| **Audit trail** | All secret rotations logged to security team |

---

## Test Coverage Standards

### Minimum Coverage

```json
{
  "coverage": {
    "lines": 80,
    "statements": 80,
    "functions": 75,
    "branches": 75
  }
}
```

**Exclusions from coverage:**
- `src/index.ts` (re-exports only)
- `src/**/__tests__/**` (test files themselves)
- Auto-generated code (Prisma, gRPC, etc.)
- Type-only files (.d.ts)

### Test Organization

```
src/
  feature/
    Feature.ts
    __tests__/
      Feature.test.ts          # Unit tests
      Feature.integration.test.ts # Integration tests
```

**Test Types Required:**
1. **Unit Tests:** Individual functions, classes, utilities
2. **Integration Tests:** API endpoints, database interactions, external service calls
3. **E2E Tests:** Critical user flows (fullWorkflow.test.ts in apps/api/e2e/)

---

## Pull Request Workflow

### Before Opening PR

1. **Local pre-commit checks pass:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

2. **Coverage remains ≥80%** (check in CI preview)

3. **Commit message follows format:**
   ```
   <type>(<scope>): <description>
   
   <optional body>
   ```
   Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

4. **No secrets, console.log, or TODOs** in code

### PR Checklist

- [ ] Branch is up to date with `main`
- [ ] CI workflow passes (all green checks)
- [ ] Test coverage ≥80%
- [ ] Code reviewed by 1+ maintainer
- [ ] Commit message is clear and follows conventions
- [ ] No new linting warnings introduced
- [ ] E2E tests pass (if UI/API changes)

---

## Supply Chain Security (Glasswing Framework)

Based on Anthropic's Glasswing and CISA recommendations:

### Dependency Audit

| Action | Frequency | Owner |
|--------|-----------|-------|
| Snyk scan | Every CI run | Automated |
| CISA KEV check | Every CI run | Automated |
| Manual audit | Weekly | Security team |
| Major version updates | Quarterly | Tech lead |

### Vulnerability Response SLA

| Severity | SLA | Action |
|----------|-----|--------|
| **CRITICAL** (CVSS ≥9.0) | 24 hours | Patch + deploy |
| **HIGH** (7.0-8.9) | 1 week | Patch + test + deploy |
| **MEDIUM** (4.0-6.9) | 2 weeks | Add to backlog |
| **LOW** (<4.0) | 30 days | Consider in next sprint |

### Known Exploited (KEV) Protocol

If CISA flags a dependency:
1. **Immediately** notify security team (Slack #security)
2. **Within 24 hours:** Find patched version or workaround
3. **Within 48 hours:** Deploy patch to production
4. **Post-incident:** Root cause analysis + prevent repeat

---

## CI/CD Pipeline Stages

```
┌─ pnpm install --frozen-lockfile
│
├─ Snyk vulnerability scan
│  └─ Checks transitive dependencies
│
├─ CISA KEV check  
│  └─ Blocks if any exploited CVE found
│
├─ pnpm lint
│  └─ ESLint (warnings allowed)
│
├─ pnpm typecheck
│  └─ TypeScript type checking (errors block)
│
├─ pnpm test
│  └─ Jest with 80% coverage threshold (must pass)
│
└─ pnpm build
   └─ Turbo build (errors block)

All green → Ready to merge ✅
Any red   → PR blocked ❌
```

---

## Exemptions & Waivers

### Coverage Waiver Request

If 80% is not achievable, request waiver:

1. **Owner:** Tech lead or security team
2. **Justification:** Document why coverage <80%
3. **Approval:** 2+ maintainers + 1 security reviewer
4. **Record:** Add issue label `coverage-waiver` with link
5. **Sunset:** Waiver expires in 1 sprint; must reapply

### Severity Downgrade

If Snyk/CVE severity is disputed:

1. **File issue:** Tag `@security-team` 
2. **Provide evidence:** Link to vendor response, patch timeline, mitigation
3. **Approval:** 2 security reviewers
4. **Override:** Commit includes comment with issue link
5. **Document:** Log overrides in `SECURITY_OVERRIDES.md`

---

## Enforcement & Monitoring

### Automated

- ✅ Pre-commit hook (lint + typecheck)
- ✅ GitHub Actions CI on every PR
- ✅ Branch protection rules prevent merge bypass

### Manual

- 🔍 Weekly security audit (security team)
- 📊 Monthly coverage report (tech lead)
- 📋 Quarterly policy review (leadership)

### Escalation

**If CI gate bypassed:**
1. Automatic alert to #security Slack channel
2. Review trigger: Why was it forced?
3. Post-incident: Prevent future bypass (update protection rules)

---

## Glasswing Alignment

This policy incorporates recommendations from:
- **Anthropic Glasswing Initiative:** Supply chain security via AI-accelerated testing
- **CISA KEV:** Known Exploited Vulnerabilities tracking
- **EPSS Framework:** Exploit Prediction Scoring (future: MEDIUM-2.3)
- **Rules (common/testing.md):** 80% coverage minimum

---

## Questions & Updates

For policy questions or updates, contact:
- **Tech Lead:** [fill in]
- **Security Team:** [fill in]
- **GitHub:** Create issue with label `ci-cd-policy`

Policy changes require:
1. Issue discussion (24h comment period)
2. PR with documentation update
3. Team consensus (2+ approvals)
4. Merge to main

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
