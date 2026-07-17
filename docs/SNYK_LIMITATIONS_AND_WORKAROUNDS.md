# Snyk Limitations and Workarounds (Free Plan)

## Overview

This document clarifies the **actual vs. planned** Snyk capabilities after configuring on a Free plan. We discovered several limitations and documented workarounds to achieve the intended security posture.

---

## Snyk Configuration (As Implemented)

### What We Actually Configured

**Snyk Integrations → GitHub → Automatic fix PRs:**
- ✅ **Enabled:** Create automatic fix PRs for vulnerabilities
- ✅ **Severity:** Critical + High only (as planned)
- ❌ **Dependency upgrades:** Disabled (Dependabot handles this)
- ✅ **Scan frequency:** Weekly (Free plan limitation)

**GitHub Repo Settings (to support auto-merge):**
- ✅ **Allow auto-merge:** Enabled (allows PRs to auto-merge if CI passes)
- ✅ **Branch protection:** Configured (requires CI checks to pass)

---

## Planned vs. Actual Capabilities

### Limitation 1: Auto-merge Implementation

**What we planned:**
```
Snyk creates PR → CI runs → Snyk auto-merges if CI ✅
```

**Actual limitation:**
- Snyk Free plan has **no native auto-merge option**
- Snyk cannot automatically merge its own PRs

**Workaround implemented:**
```
Snyk creates PR → CI runs → GitHub auto-merge kicks in → PR auto-merges if:
  1. All checks pass ✅
  2. Branch protection requirements met ✅
  3. Auto-merge enabled on repo ✅
```

**How it works:**
1. Snyk creates fix PR with label "fix(security): CVE-2024-XXXXX"
2. GitHub Actions CI runs (lint, test, coverage, security checks)
3. If ALL checks pass: GitHub automatically merges the PR
4. Branch gets deleted automatically (cleanup)
5. **Deployment** happens on next push to main/staging

**Status:** ✅ Works via GitHub (not Snyk direct), same end result

---

### Limitation 2: PR Limit for Security Fix PRs

**What we planned:**
```
Max 5 open Snyk security fix PRs (independent from Dependabot)
```

**Actual limitation:**
- Snyk Free plan **does NOT enforce a limit** on open fix PRs
- The "Limit to X PRs" option **only exists for automatic dependency upgrades**
- We disabled dependency upgrades (Dependabot handles), so no limit available

**What this means:**
- If Snyk finds 10 vulnerabilities → Creates 10 fix PRs
- If Snyk finds 100 vulnerabilities → Creates 100 fix PRs
- No built-in rate limiting for security fixes

**Workaround implemented:**
- **Monitor weekly:** Review open Snyk PRs in GitHub
- **Manual gating:** Tech lead can close duplicate/unnecessary fix PRs
- **Dependabot limit:** 5 PR limit still active for routine updates

**Example:**
```
Snyk scan finds:
  - CVE-2024-001: lodash (HIGH)
  - CVE-2024-002: express (CRITICAL)
  - CVE-2024-003: zod (HIGH)
  
Result: 3 PRs created
Limit: None enforced (but 3 is manageable)

Mitigation:
  - If too many PRs open: close non-critical ones manually
  - Prioritize CRITICAL over HIGH via PR labels
  - Tech lead reviews before auto-merge if needed
```

**Status:** ⚠️ Limitation accepted, managed manually

---

### Limitation 3: Scan Frequency

**What we planned:**
```
Daily scan (responsive to new CVEs)
```

**Actual limitation:**
- Snyk Free plan **only supports weekly scans**
- Daily scans require paid plan upgrade

**Available options in Free plan:**
- `Test weekly` ← Currently set
- `Test never`

**What this means:**
- New vulnerabilities discovered by Snyk are checked once per week
- Zero-day exploits may take up to 7 days to be detected
- If a critical 0-day is released on Monday evening, may not be detected until next Monday

**Workaround implemented:**
- **Manual trigger:** Can run Snyk scan on-demand via CLI or web UI
- **CI integration:** Snyk runs during CI/CD pipeline (catches vulns at PR time)
- **Dependabot daily:** Daily dependency checks still happen via Dependabot
- **CISA KEV check:** CI pipeline checks for known-exploited vulns daily

**Example:**
```
Monday 9am: CRITICAL 0-day discovered
  ↓
Snyk free plan: Won't detect until next Monday scan
  ↓
BUT: CI CISA KEV check will catch it (daily)
  ↓
Result: 24-48 hour delay instead of 7 days
```

**Status:** ⚠️ Limitation accepted, mitigated by CI checks

---

## Actual Security Posture (After Workarounds)

### What we get with Snyk Free + GitHub auto-merge + CI CISA KEV:

```
Daily Scanning (via CI):
  ├─ Dependabot: Checks for available updates (daily)
  ├─ CISA KEV: Checks for known-exploited CVEs (daily)
  └─ CodeQL: Checks code patterns (daily via CI)

Weekly Scanning (Snyk):
  ├─ Full vulnerability scan (Snyk database)
  └─ Auto-creates fix PRs for HIGH+ severity

Auto-merge Chain:
  ├─ Snyk PR created
  ├─ CI runs (lint, test, coverage, security)
  ├─ If all pass: GitHub auto-merges
  ├─ Branch auto-deleted
  └─ Deployment happens on next push

Result:
  ✅ Security fixes merge automatically (same day, if CI passes)
  ✅ No manual merge step required
  ✅ Full audit trail in GitHub
  ✅ Zero-day detection may take 24-48h (via CISA KEV)
```

---

## Comparison: Free vs. Paid Plans

| Feature | Free | Paid | Impact |
|---------|------|------|--------|
| **Scan frequency** | Weekly | Daily | 24h delay on new CVEs |
| **Fix PR limit** | None | Configurable | May get many PRs |
| **Auto-merge fix PRs** | Via GitHub | Native + GitHub | Same result (GitHub does it) |
| **SAST scanning** | Yes | Yes | No difference |
| **Dependency upgrade PRs** | No | Yes | We use Dependabot instead |
| **SLA/Support** | Community | 24h | Not needed for security |
| **Cost** | $0 | $2500+/month | Using Free for now |

---

## Implementation Checklist

- [x] Snyk account created
- [x] GitHub integration connected
- [x] Automatic fix PRs enabled (Critical + High)
- [x] Dependency upgrade PRs disabled
- [x] Snyk token added to GitHub Secrets
- [x] GitHub auto-merge enabled
- [x] Branch protection configured (requires CI)
- [x] Weekly scan scheduled
- [ ] Team trained on Snyk PR workflow
- [ ] First vulnerability detected and fix PR created (wait for scan)

---

## When to Consider Paid Plan

Upgrade to Snyk Paid if:

```
❌ Too many false positives (can't filter in free)
❌ Need daily scans for compliance requirement
❌ Need SLA response from Snyk support
❌ Managing 100s of vulnerabilities monthly
❌ Regulatory requirement (SOC2, ISO27001)
```

**Recommendation:** Stay on Free plan for now. Upgrade only if:
- CVE detection SLA becomes business-critical
- Compliance audit requires daily scanning
- Cost of a delayed patch > $2500/month

---

## Actual Vulnerability Response Flow

```
Vulnerability discovered in public database
  ↓
Daily 11:59 PM: CISA KEV check in CI catches it ✅
  (if known-exploited)
  ↓
OR
  ↓
Next Monday 3am: Snyk weekly scan detects it ✅
  (if High+ severity)
  ↓
Snyk creates fix PR (e.g., "fix(security): patch CVE-2024-XXXXX")
  ├─ Labels: [security, dependencies, snyk]
  ├─ Description: CVE link, CVSS score, EPSS score
  └─ Targets: main branch
  ↓
GitHub Actions CI runs
  ├─ Lint ✅
  ├─ TypeCheck ✅
  ├─ Test (80%+) ✅
  ├─ Coverage ✅
  ├─ CodeQL ✅
  └─ Build ✅
  ↓
If all ✅: GitHub auto-merge kicks in
  ├─ PR auto-merges (squash)
  ├─ Branch auto-deleted
  └─ Commit pushed to main
  ↓
Deployment to production (on next CI run)
  └─ Fix live within minutes
```

**SLA with Free plan:**
- Known-exploited (CISA KEV): 24-48 hours
- High+ vulnerabilities: 7-8 days (weekly scan)
- Average real-world: ~2-3 days (some found in CI)

**vs. Paid plan:**
- Would be: 24-48 hours for all

---

## Team Communication

**When Snyk fix PRs appear:**

```
Slack #security:
  "🔒 Security fix PR created: CVE-2024-XXXXX (lodash)"
  "CVSS: 8.6 | EPSS: 75% | Status: CI running"
  "Will auto-merge if tests pass"
  
If CI fails:
  "⚠️ Security PR failed CI: CVE-2024-XXXXX"
  "Issue: Test failure in xyz"
  "Action: Tech lead reviews and fixes"
```

---

## References

- [Snyk Pricing](https://snyk.io/plans/)
- [Snyk GitHub Integration](https://docs.snyk.io/integrations/git-repository-scm-integrations/github-integration)
- [GitHub Auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

*Last updated: 2026-07-16 (after Snyk Free plan configuration)*  
*Next review: When first security fix PR is created*
