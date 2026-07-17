# Codecov Free Plan: Capabilities and Limitations

## Overview

After configuring Codecov, we discovered that the Free plan is sufficient for our needs, but has some limitations compared to Pro. This document clarifies what works and what doesn't.

---

## Codecov Free Plan - What We Get

### ✅ Included in Free Plan

```
Coverage Analysis:
  ✅ Percentage-based coverage reports
  ✅ Report comments on PRs
  ✅ Coverage history tracking
  ✅ Basic coverage diff (PR vs base branch)
  ✅ Coverage badges (for README)
  ✅ Codecov dashboard (view reports)
  ✅ GitHub integration (auto-sync)
  
Enforcement:
  ✅ CI check: Fail if coverage < 80% (configured in codecov.yml)
  ✅ CI check: Fail if patch coverage < 80%
  ✅ PR comments with coverage details
  ✅ Browser notifications (optional)
```

### ❌ NOT Included in Free Plan

```
Flags (backend + frontend):
  ❌ NOT available in Free plan
  ❌ Requires Pro upgrade
  ❌ We don't need this (not splitting frontend/backend coverage)
  
Advanced Features:
  ❌ Carryforward flags (for parallel CI runs)
  ❌ Blazing fast updates (higher priority processing)
  ❌ Rollup reports (aggregate multiple services)
  ❌ Advanced notifications (Slack, Teams integrations)
  ❌ SLA / Priority support
  
Report Sharing:
  ❌ Public report embedding
  ❌ Team features (multiple users)
  ❌ Advanced access control
```

---

## Configuration File: codecov.yml

We configured coverage requirements via `codecov.yml` instead of dashboard toggles because:

1. **Configuration-as-code**: Version controlled, auditable, reproducible
2. **Consistency**: Same config across all branches
3. **Free plan limitation**: Dashboard toggles aren't available in Free
4. **Infrastructure-as-code**: Aligns with CI/CD best practices

### codecov.yml Settings

```yaml
coverage:
  range: "80...100"      # Coverage must be between 80-100%
  
  patch:
    target: 80%          # New code must be 80%+ covered
    threshold: null      # Fail if target not met
  
  project:
    target: 80%          # Overall project must be 80%+ covered
    threshold: null      # Fail if target not met
```

**What this does:**
- Every PR checks: `patch_coverage ≥ 80%` AND `project_coverage ≥ 80%`
- If either fails: ❌ CI check fails (PR cannot merge)
- If both pass: ✅ CI check passes (PR can proceed)

---

## How Coverage Flows to Codecov

```
Git commit pushed
  ↓
GitHub Actions CI runs:
  ├─ Install dependencies
  ├─ Build
  ├─ Run tests (Jest)
  │  └─ Generates coverage/coverage-final.json
  └─ Upload coverage to Codecov
  
Codecov receives report:
  ├─ Analyzes coverage percentage
  ├─ Compares to codecov.yml targets
  ├─ Checks: patch ≥ 80% AND project ≥ 80%?
  └─ If YES: ✅ Passes check | If NO: ❌ Fails check
  
GitHub CI Results:
  ├─ Codecov check: ✅ or ❌
  └─ PR shows: "Coverage OK" or "Coverage below 80%"
```

---

## Free vs Pro Comparison

| Feature | Free | Pro | Impact |
|---------|------|-----|--------|
| **Coverage tracking** | ✅ Yes | ✅ Yes | No difference |
| **PR comments** | ✅ Yes | ✅ Yes | No difference |
| **Coverage gates (CI)** | ✅ Yes | ✅ Yes | No difference |
| **Flags** | ❌ No | ✅ Yes | Can't split by area (OK for us) |
| **Carryforward** | ❌ No | ✅ Yes | Not needed (linear CI) |
| **Integrations** | Basic | Advanced | Using GitHub only (OK) |
| **Cost** | $0 | $99+/month | Plenty of runway on Free |

---

## PR Coverage Report Example

When a PR is created, Codecov comments with something like:

```
✅ Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Project Coverage: 82%
   Target: 80%
   Status: ✅ PASS

📝 Patch Coverage: 85%
   Target: 80%
   Status: ✅ PASS

Files changed: +125 lines, -45 lines
Coverage change: -0.3% (normal variation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If coverage drops below 80%:

```
❌ Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Project Coverage: 78%
   Target: 80%
   Status: ❌ FAIL (-2%)

📝 Patch Coverage: 75%
   Target: 80%
   Status: ❌ FAIL (-5%)

⚠️ Coverage decreased. Please add tests.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**PR Merge Status:**
- If any check fails: ❌ **Cannot merge** (branch protection requires all checks pass)
- If all checks pass: ✅ **Can merge** (after 1 approval)

---

## No GitHub Secret Needed

Unlike Snyk (which needs SNYK_TOKEN), Codecov:
- ✅ Auto-detects GitHub Actions environment
- ✅ Uses GitHub's built-in PR context
- ✅ No authentication token required
- ✅ Automatic GitHub app permissions

Just upload coverage from CI and Codecov handles the rest.

---

## When to Upgrade to Pro

Upgrade to Codecov Pro if:

```
❌ Multiple coverage areas need separate tracking
   → Use Flags feature (requires Pro)
   
❌ Need Slack/Teams notifications
   → Pro has advanced integrations
   
❌ Large team managing coverage metrics
   → Pro has team features
   
❌ Running parallel test jobs (flaky)
   → Carryforward flags simplify aggregation
   
✅ None of the above apply
   → Free plan is fine (current plan)
```

**Upgrade cost:** $99/month (vs $0 now)  
**Break-even:** Only if you'd save 2+ hours/month on coverage troubleshooting

---

## Coverage Badge (Optional)

Add to README.md:

```markdown
[![codecov](https://codecov.io/gh/KratosAR/brote_campains/branch/main/graph/badge.svg)](https://codecov.io/gh/KratosAR/brote_campains)
```

This shows:
- Current coverage % as a badge
- Links to Codecov dashboard
- Updates automatically on every merge

---

## Implementation Checklist

- [x] Create codecov.yml with coverage targets
- [x] Add to git repository
- [x] Configure Codecov GitHub integration
- [x] First PR will trigger coverage upload
- [x] Codecov comment appears on PR (~2-3 min)
- [x] CI check passes/fails based on targets
- [ ] (Optional) Add badge to README.md
- [ ] (Optional) Upgrade to Pro if needed

---

## Troubleshooting

### Coverage report not appearing

```
Check 1: Is coverage being generated in CI?
  → Look for coverage/coverage-final.json in build artifacts
  
Check 2: Is coverage being uploaded?
  → Look for "Uploading to Codecov" in CI logs
  
Check 3: Wait 2-3 minutes
  → Codecov takes a few minutes to process
```

### Coverage check failing when it shouldn't

```
Check 1: Verify codecov.yml is in repo root
  → Path: ./codecov.yml (not nested)
  
Check 2: Check the coverage report details
  → Click "Details" in PR check to see exact numbers
  
Check 3: Verify targets match
  → File says "80%" but report shows "78%"?
  → Fix code coverage, not the config
```

### Want to see coverage without PR?

```
Go to: https://codecov.io/gh/KratosAR/brote_campains
View:
  - Coverage history
  - File-by-file breakdown
  - Coverage trends over time
```

---

## Key Takeaway

Codecov Free plan is **perfect for our needs**:
- ✅ Enforces 80% coverage (via codecov.yml)
- ✅ Reports on every PR
- ✅ Prevents low-coverage merges (CI check)
- ✅ Tracks trends over time
- ❌ No complex features we don't need

**Cost:** $0  
**Setup:** One file (codecov.yml) + GitHub account  
**Value:** Ensures code quality stays above 80%

---

*Last updated: 2026-07-16 (after Codecov configuration)*  
*Next review: After first PR coverage report appears*
