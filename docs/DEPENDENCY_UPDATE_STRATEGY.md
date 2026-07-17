# Dependency Update Strategy: Dependabot + Snyk Coordination

## Overview

We use **two complementary tools** for dependency management:

- **Dependabot:** Regular updates (minor, patch, major)
- **Snyk:** Security-focused updates (vulnerabilities only)

This document defines how they coordinate to avoid conflicts and PRs spam.

---

## Tool Responsibilities

### Dependabot (Automated, Scheduled)

**What it does:**
- Scans `pnpm-lock.yaml` on schedule
- Creates PRs for available updates
- Categorizes by type: minor, patch, major
- Auto-rebase on new commits
- Auto-merges if CI passes (configurable)

**Schedule:**
- **Weekly updates:** Every Monday 3am UTC (all types)
- **Daily security:** Every day at 3am UTC (security-only)

**Merge strategy:**
- ✅ Auto-merge minor/patch if CI passes
- ⚠️ Require approval for major versions
- CI + coverage + security checks must pass

**Config:** `.github/dependabot.yml` (already set up)

---

### Snyk (Security-focused, Responsive)

**What it does:**
- Continuously scans dependencies (during CI)
- Detects **known vulnerabilities only**
- Creates fix PRs for security issues
- Includes exploit-ability assessment (EPSS)
- Can auto-fix common vulnerabilities

**Triggers:**
- ✅ HIGH/CRITICAL severity vulnerabilities
- ✅ Known exploits (CISA KEV)
- ✅ On-demand scan (manual trigger)

**Merge strategy:**
- ✅ Auto-merge if CI passes (security fixes)
- ❌ Never auto-merge without CI validation
- Manual review recommended for critical paths

**Config:** Snyk Web UI (activated via GitHub integration)

---

## Coordination Matrix

### What each tool handles:

| Update Type | Dependabot | Snyk | Action |
|------------|-----------|------|--------|
| **Minor version** (1.2.0 → 1.3.0) | ✅ | ❌ | Dependabot handles |
| **Patch version** (1.2.0 → 1.2.1) | ✅ | ❌ | Dependabot handles |
| **Major version** (1.2.0 → 2.0.0) | ✅ | ❌ | Require approval |
| **Security fix (vuln found)** | ❌ | ✅ | Snyk creates urgent PR |
| **Zero-day exploit** | ❌ | ✅ | Snyk fast-tracks |
| **New CVE in old version** | ✅ | ✅ | Both may PR (see below) |

---

## Handling Duplicate PRs

**Scenario:** Both Dependabot AND Snyk want to update the same package

### Example:
```
lodash@4.17.20 has CVE-2024-XXXXX (CVSS 8.6, EPSS 75%)
- Snyk: Creates urgent PR to patch@4.17.21
- Dependabot: Also queues lodash@4.17.21 (weekly)
```

### Resolution:

**Priority Order:**
1. **Snyk PR comes first** (security-urgent)
2. Snyk PR is merged → Dependabot auto-detects and closes its duplicate
3. No manual conflict resolution needed

**Timing:**
- Snyk: Creates PR within 1 hour of vuln detection
- Dependabot: Creates PR on next scheduled run (weekly)
- Snyk will be ahead by days/weeks

---

## PR Limits & Policies

### Dependabot PR Limits

```yaml
# .github/dependabot.yml
open-pull-requests-limit: 5
```

**What this means:**
- Max 5 open Dependabot PRs at a time
- Waits for PR to close before creating next
- Prevents PR overload
- Applies to each package ecosystem (npm, github-actions)

### Snyk PR Limits

**Configuration in Snyk Web UI:**
```
Settings → Integrations → GitHub → Automatic pull requests
- Limit to 5 open fix PRs
- Create PR as soon as fix is available
- Only HIGH+ severity
```

**What this means:**
- Max 5 open Snyk security fix PRs
- Independent limit from Dependabot
- Total possible: 10 open PRs (5 from each)
- Unlikely in practice (security fixes < regular updates)

---

## Timeline & SLA

### Regular Update Timeline

```
Monday 3am UTC (Dependabot weekly run)
  ├─ Scans for available updates
  ├─ Creates up to 5 PRs (minor/patch/major)
  ├─ Each PR runs CI (lint, test, security scan)
  ├─ If Snyk finds no new vulns:
  │  └─ Auto-merge if CI passes ✅
  └─ If new vuln found:
     └─ Snyk creates urgent PR (same package)

(Day later) Snyk detects vulnerability
  ├─ Creates fix PR (if not already handled by Dependabot)
  ├─ Runs CI + security validation
  └─ Auto-merges if CI passes ✅
```

### Security Fix Timeline (High Priority)

```
Vuln discovered (CVSS 8.6, EPSS 75%)
  ├─ Snyk detects within 1 hour
  ├─ Creates urgent fix PR
  ├─ PR labeled "security" + "urgent"
  ├─ Runs full CI pipeline
  ├─ If CI passes: Auto-merge within 2 hours ✅
  └─ Deployment to production within 6 hours
```

---

## PR Labels & Routing

### Dependabot PRs

```
Labels:
  - dependencies
  - npm (or github-actions)
  - [status] (minor, patch, major)

Title pattern:
  "chore(deps): bump package@x.y.z"

Example:
  Title: chore(deps): bump express@4.21.2
  Labels: [dependencies, npm, patch]
```

### Snyk Security Fix PRs

```
Labels:
  - security
  - dependencies
  - snyk

Title pattern:
  "fix(security): patch CVE-2024-XXXXX"

Example:
  Title: fix(security): patch CVE-2024-XXXXX (CVSS 8.6, EPSS 75%)
  Labels: [security, dependencies, snyk]
  Priority: HIGH
```

---

## Review & Merge Workflow

### For Dependabot PRs

**Patch updates (auto-merge):**
```
PR created → CI runs → If ✅ → Auto-merge
└─ No manual review needed
```

**Minor updates (review):**
```
PR created → CI runs → Requires tech lead review → Merge
└─ Review mainly for changelog/breaking changes
```

**Major updates (careful review):**
```
PR created → CI runs → Tech lead + code owner review → Merge
└─ Ensure no breaking changes in our code
```

### For Snyk Security PRs

**All security fixes (require CI, then auto-merge):**
```
PR created → CI runs (security + coverage) 
  ├─ If ✅: Auto-merge (HIGH+ severity)
  ├─ Reason: Security patches are critical
  └─ Deployment within 2 hours
```

**Special cases (manual review):**
```
If Snyk fix seems risky (e.g., major version bump):
  → Comment "hold for review"
  → Tech lead reviews within 1 hour
  → Merge or request alternative fix
```

---

## Monitoring & Health

### Weekly PR Review

Every Monday (after Dependabot run):

```markdown
# Weekly Dependency Report

## Dependabot
- [ ] How many PRs created this week?
- [ ] How many auto-merged?
- [ ] Any PRs blocked/waiting for review?
- [ ] Any conflicts with Snyk?

## Snyk
- [ ] New vulnerabilities found?
- [ ] Security PRs merged?
- [ ] Any urgent CVEs pending?

## Health
- [ ] All PRs passing CI?
- [ ] Coverage maintained (≥80%)?
- [ ] No stale dependency PRs?
```

### Escalation

**If PR stalls:**
```
Dependabot PR open >48 hours without merge:
  → Tech lead reviews and merges
  → If test failure: Fix and re-run CI

Snyk security PR open >24 hours without merge:
  → ESCALATE to tech lead + security team
  → May need emergency deployment
  → Check for CI/test issues
```

---

## Configuration Checklist

### Dependabot (.github/dependabot.yml)
- ✅ Weekly minor/patch/major updates (Monday 3am)
- ✅ Daily security-only updates
- ✅ Max 5 open PRs per ecosystem
- ✅ Auto-rebase enabled
- ✅ Auto-commit enabled
- ✅ Labels: "dependencies", ecosystem-specific
- ✅ Assignee: tech lead (for review)

### Snyk (Web UI Setup)

**After creating Snyk account:**

1. **Integrate GitHub**
   - Settings → Integrations → GitHub → Connect

2. **Enable automatic PRs**
   - Settings → Integrations → GitHub → Automatic pull requests
   - ✅ Create pull requests for vulnerability fixes
   - ✅ Security issues only (HIGH+)
   - ✅ Limit to 5 open PRs
   - ❌ Don't auto-merge (require CI review)

3. **Frequency**
   - ✅ Create PR as soon as fix is available (responsive)
   - Daily scan

4. **Labels & assignment**
   - Labels: "security", "dependencies"
   - Assignee: tech lead (optional)

---

## Handling Conflicts

### Scenario 1: Both create PR for same package

```
lodash@4.17.20 → 4.17.21
  - Dependabot PR: "chore(deps): bump lodash@4.17.21"
  - Snyk PR: "fix(security): patch CVE-2024-XXXXX in lodash"

Resolution:
  1. Snyk PR likely merged first (urgent)
  2. Dependabot PR auto-closes (detects duplicate)
  3. Both covered in single merge ✅
  4. Zero conflict
```

### Scenario 2: Update with different versions

```
lodash updates available:
  - Dependabot: 4.17.21 (patch)
  - Snyk: 4.18.0 (minor, vulnerability fix in new version)

Resolution:
  1. Snyk PR for 4.18.0 merged first (urgent fix)
  2. Dependabot PR for 4.17.21 auto-closes (superseded)
  3. Result: Better version (4.18.0) merged ✅
```

### Scenario 3: Dependabot major update pending, Snyk finds vuln

```
express 4.x → 5.x (major, non-urgent)
  - Dependabot PR: "chore(deps): bump express@5.0.0"
  - Pending review (major updates need approval)

vuln found in express 4.x (urgent)
  - Snyk PR: "fix(security): patch CVE-2024-XXXXX"
  - Creates PR for express@4.21.2 (patch in current major)

Resolution:
  1. Snyk PR merges to main immediately ✅
  2. Dependabot PR remains open (for review)
  3. After review: Merge to main
  4. Both versions handled appropriately ✅
```

---

## Best Practices

✅ **Do:**
- Review Dependabot PRs promptly (within 24h)
- Let Snyk auto-merge security fixes (CI validated)
- Close/decline Dependabot PRs if major breaks our code
- Document any package that must stay on old version

❌ **Don't:**
- Manually create PRs for updates (let tools handle)
- Auto-merge major Dependabot updates (review first)
- Hold Snyk security PRs for review (urgent fixable)
- Merge Snyk PRs without CI passing (always validate)

---

## Monthly Audit

**First Monday of month:**

```bash
# Check dependency health
gh api repos/KratosAR/brote_campains/dependabot/alerts \
  --jq '.[] | {package: .package.package, severity: .security_advisory.severity}'

# Check Snyk vulnerabilities (via Snyk CLI if installed)
snyk test --severity-threshold=high

# Review merged PRs
gh pr list --state closed --label dependencies --limit 30
```

---

## Escalation Contacts

**For Dependabot issues:**
- Contact: Tech Lead
- Response time: 24 hours
- Action: Review, approve, or close PR

**For Snyk security issues:**
- Contact: Security Team + Tech Lead
- Response time: 6 hours (HIGH+), 24 hours (MEDIUM)
- Action: Merge or implement workaround

---

## References

- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates)
- [Snyk Automatic Pull Requests](https://docs.snyk.io/integrations/git-repository-scm-integrations/github-integration#automatic-pull-requests-for-known-vulnerabilities)
- [GitHub Security](https://docs.github.com/en/code-security)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
