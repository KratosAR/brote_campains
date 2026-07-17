# Branching Strategy

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Política vigente de branching.


## Overview

We use a modified Gitflow strategy with 3 main branches and feature branches.

```
main (production)
  ↑
  └─ Pull Request (require 1 approval, all checks pass)
     │
     staging (pre-production)
     │
     ├─ Auto-deploy to staging on every commit
     └─ Triggered by: PR merge to staging
        │
        development (development branch)
        │
        ├─ Auto-deploy to dev environment
        └─ Triggered by: PR merge to development
           │
           feature/* (feature branches)
           ├─ feature/user-auth
           ├─ feature/campaign-builder
           └─ fix/login-bug
```

---

## Branch Definitions

### `main` (Production)
- **Purpose:** Live production code
- **Protection:** YES (require 1 approval, CI passing)
- **Deployment:** Manual (tech lead only, MFA required)
- **Merge from:** `staging` only (via PR)
- **Hotfixes:** `hotfix/*` branches merge directly to main + staging

**Rules:**
- ✅ Require pull request review (1 approval minimum)
- ✅ Require status checks pass (CI, coverage, security)
- ✅ Require up-to-date branch
- ✅ Require dismiss stale PRs
- ❌ Allow force push
- ❌ Allow direct commits

**SLA:** Deploy within 2 hours of approval

---

### `staging` (Pre-production)
- **Purpose:** Test production-like environment before release
- **Protection:** YES (require CI passing)
- **Deployment:** Auto-deploy on every merge
- **Merge from:** `development` + hotfixes
- **Merge to:** `main` (via PR)

**Rules:**
- ✅ Require status checks pass
- ✅ Auto-merge PRs if CI passes (optional)
- ❌ No approval required (only CI)
- ❌ Allow direct commits (only via PR)

**SLA:** Deploy automatically within 5 min

**Test Plan on staging:**
- [ ] Full test suite passes
- [ ] E2E tests pass
- [ ] Manual smoke tests (registration, login, campaign creation)
- [ ] Security headers present
- [ ] Performance acceptable (p95 latency <500ms)

---

### `development` (Development)
- **Purpose:** Integration branch for features
- **Protection:** NO (allow direct commits if needed)
- **Deployment:** Auto-deploy to dev environment
- **Merge from:** Feature branches only (via PR)
- **Merge to:** `staging` (via PR, weekly)

**Merge Process:**
1. Feature branch → PR against `development`
2. CI passes + 1 approval
3. Merge
4. Auto-deploy to dev environment

**SLA:** Deploy automatically within 5 min

---

## Branch Lifecycle

### Feature Development

```
# 1. Create feature branch from development
git checkout development
git pull origin development
git checkout -b feature/my-feature

# 2. Work and commit
git add .
git commit -m "feat(scope): description"
git push origin feature/my-feature

# 3. Create PR against development
gh pr create --base development --head feature/my-feature

# 4. After approval and CI pass
gh pr merge --squash  # Squash commits for clean history

# 5. Delete branch
git push origin --delete feature/my-feature
```

### Release to Staging

```
# Weekly or when ready for pre-production testing
git checkout staging
git pull origin staging
gh pr create --base staging --head development --title "Release: week-of-2026-07-15"

# Tech lead reviews + merges
gh pr merge
```

### Release to Production

```
# Tech lead only, after staging validation
gh pr create --base main --head staging --title "Production Release v1.2.3"

# Requires:
# - 1 approval
# - All CI checks pass
# - Tech lead authentication (MFA)

gh pr merge
# Auto-deploy via CI/CD
```

### Hotfix to Production

```
# Emergency fix (security, critical bug)
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# Fix + test
git commit -m "fix(security): patch CVE-2024-XXXXX"
git push origin hotfix/security-patch

# Create PR to main
gh pr create --base main --head hotfix/security-patch

# After merge to main, also merge back to staging + development
git checkout staging
git pull origin staging
git merge hotfix/security-patch
git push origin staging

git checkout development
git pull origin development
git merge hotfix/security-patch
git push origin development
```

---

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/*` | `feature/user-auth` |
| Bug fix | `fix/*` | `fix/login-validation` |
| Hotfix | `hotfix/*` | `hotfix/security-patch` |
| Chore | `chore/*` | `chore/update-deps` |
| Documentation | `docs/*` | `docs/api-guide` |

---

## CI/CD Pipeline by Branch

### `feature/*` branches
```yaml
on:
  push:
    branches: [feature/*, fix/*, chore/*, docs/*]
  pull_request:
    branches: [development]

jobs:
  ci:
    # Lint, typecheck, test, build
    # No deployment
```

### `development` branch
```yaml
on:
  push:
    branches: [development]
  pull_request:
    branches: [development]

jobs:
  ci:
    # Full CI pipeline
  
  deploy-dev:
    if: github.ref == 'refs/heads/development'
    # Deploy to dev environment
```

### `staging` branch
```yaml
on:
  push:
    branches: [staging]
  pull_request:
    branches: [staging]

jobs:
  ci:
    # Full CI pipeline
  
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    # Deploy to staging environment
    # Run smoke tests
```

### `main` branch
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    # Full CI pipeline
  
  # NO auto-deploy
  # Require manual trigger for production
```

---

## Environment Mapping

| Branch | Environment | Auto-deploy? | Access |
|--------|-------------|--------------|--------|
| `main` | Production | ❌ Manual | Tech lead + MFA |
| `staging` | Staging | ✅ Automatic | All team |
| `development` | Dev | ✅ Automatic | All team |
| `feature/*` | None | ❌ No | Local testing only |

---

## Branch Protection Setup

### Required: `main` branch

```bash
# Via GitHub CLI
gh api repos/OWNER/brote_campains/branches/main/protection \
  -f required_status_checks.strict=true \
  -f "required_status_checks.contexts[]=ci (Lint / TypeCheck / Test / Build)" \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f enforce_admins=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

### Recommended: `staging` branch

```bash
gh api repos/OWNER/brote_campains/branches/staging/protection \
  -f required_status_checks.strict=true \
  -f "required_status_checks.contexts[]=ci (Lint / TypeCheck / Test / Build)" \
  -f enforce_admins=false \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

### Optional: `development` branch

```bash
gh api repos/OWNER/brote_campains/branches/development/protection \
  -f required_status_checks.strict=true \
  -f "required_status_checks.contexts[]=ci (Lint / TypeCheck / Test / Build)" \
  -f enforce_admins=false
```

---

## Merge Strategies

### Feature → Development
```bash
git merge --squash feature/my-feature
# Squashes all commits into one for clean history
```

### Development → Staging
```bash
git merge --no-ff develop
# Preserves feature branch history
```

### Staging → Main
```bash
git merge --no-ff staging
# Preserves release history
```

---

## Frequently Asked Questions

**Q: Can I commit directly to development?**
A: Not recommended. Always use feature branches + PR for review, even if you're working alone.

**Q: What if I need to deploy a hotfix?**
A: Create `hotfix/branch`, merge to `main` first, then back-merge to `staging` and `development`.

**Q: Can I force push?**
A: Never on `main` or `staging`. Only on your own feature branches if necessary.

**Q: How often do we release to production?**
A: When ready. Could be daily, weekly, or monthly depending on release cadence.

**Q: What if a commit lands on main by mistake?**
A: Revert it with `git revert <commit>`, create new PR, get approval.

---

## Monthly Release Checklist

Before staging → main PR:

- [ ] All features merged to staging
- [ ] Full test suite passes (80%+ coverage)
- [ ] E2E tests pass
- [ ] No HIGH/CRITICAL security vulnerabilities
- [ ] Database migrations tested (staging)
- [ ] Performance acceptable (p95 <500ms)
- [ ] Documentation updated (if needed)
- [ ] Release notes prepared
- [ ] On-call team ready
- [ ] Rollback plan documented

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
