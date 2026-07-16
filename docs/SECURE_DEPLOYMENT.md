# Secure Deployment Architecture

## Overview

This document defines how to safely deploy BCP to production with security gates, audit trails, and rollback capabilities.

---

## Deployment Pipeline Stages

```
Merge to main
    ↓
[1] Build artifacts
    ↓
[2] Scan for vulnerabilities
    ↓
[3] Sign artifacts (provenance)
    ↓
[4] Deploy to staging
    ↓
[5] Smoke tests (basic functionality)
    ↓
[6] Security validation (headers, auth)
    ↓
[7] Approval gate (manual review)
    ↓
[8] Deploy to production
    ↓
[9] Health checks + monitoring
    ↓
[10] Audit log entry
```

---

## Deployment Requirements

### Authentication & Authorization

**Who can deploy?**
- Tech lead (primary)
- DevOps engineer (backup)
- CI/CD system (for automatic rollouts)

**How to verify identity:**
- GitHub Actions: Identity via OIDC token (no stored secrets)
- Manual deploy: Require MFA + SSH key (no passwords)
- CLI deploy: `gh` CLI authenticated with SSH key

**Prohibition:**
- ❌ No password-based authentication
- ❌ No hardcoded deploy tokens in scripts
- ❌ No shared credentials
- ❌ No deploys from personal machines (only CI/CD)

### Pre-deployment Checklist

Before ANY deployment to production:

- [ ] All CI checks passed (lint, test, build, security)
- [ ] Coverage maintained (≥80%)
- [ ] No new vulnerabilities introduced (Snyk clean)
- [ ] Database migrations tested (staging)
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] Incident response team on standby
- [ ] Change log entry created

---

## Staging Deployment (Automated)

Every merge to `main` → automatic deploy to staging

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build artifacts
        run: pnpm build

      - name: Scan build artifacts
        run: |
          snyk test --severity-threshold=high
          # Fail if new HIGH/CRITICAL CVEs

      - name: Deploy to staging
        run: |
          # Deploy via your platform (Vercel, Railway, K8s, etc)
          vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}

      - name: Run smoke tests
        run: |
          npm test:e2e -- --testTimeout=60000
          # Basic: registration, login, create campaign works

      - name: Validate security headers
        run: |
          curl -I https://staging-api.example.com/health | grep "X-Content-Type-Options"

      - name: Slack notification
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          text: 'Staging deploy: ${{ job.status }}'
```

**SLA:** Deploy to staging within 5 minutes of merge

---

## Production Deployment (Manual Gate)

### Standard Production Release

**Trigger:** `gh workflow run deploy-prod.yml --ref main`

**Who:** Tech lead only

**Authentication:**
```bash
# Requires MFA + SSH key
gh auth login --web

# Verify identity
gh auth status

# Trigger deploy
gh workflow run deploy-prod.yml
```

### Step 1: Pre-deployment Verification

```bash
#!/bin/bash
set -e

# Check: Is main branch clean?
git fetch origin
COMMITS_AHEAD=$(git rev-list --count origin/main..main)
if [ "$COMMITS_AHEAD" -gt 0 ]; then
  echo "❌ Local branch ahead of origin. Push changes first."
  exit 1
fi

# Check: Are all CI checks passing?
gh pr status --json state
# Verify all recent commits have ✅ status

# Check: Latest commit message
LATEST_COMMIT=$(git log -1 --oneline)
echo "Latest commit: $LATEST_COMMIT"
read -p "Deploy this commit? (yes/no) " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi
```

### Step 2: Database Migration (if needed)

```bash
# On production database server (separate from app)
# Requires DBA authentication

DATABASE_URL=$PRODUCTION_DB_URL
MIGRATION_VERSION=$(git rev-parse --short HEAD)

# Backup database before migration
pg_dump $DATABASE_URL > /backups/bcp-pre-deploy-${MIGRATION_VERSION}.sql

# Run migrations
DATABASE_URL=$PRODUCTION_DB_URL pnpm exec prisma migrate deploy

# Verify schema
psql $DATABASE_URL -c "\d" | head -20
```

### Step 3: Blue-Green Deployment

**Current:** Version A running (blue)  
**New:** Version B deployed (green)  
**Switch:** Route traffic to B, keep A as rollback

```yaml
# Example: Vercel blue-green
- name: Blue-Green Deploy
  run: |
    # Deploy new version (not yet live)
    NEW_DEPLOYMENT=$(vercel deploy --prod --confirm)

    # Run tests against new version
    VERCEL_URL=$NEW_DEPLOYMENT npm run test:smoke

    # If tests pass: promote to production
    if [ $? -eq 0 ]; then
      vercel promote $NEW_DEPLOYMENT
      echo "✅ Promoted to production"
    else
      echo "❌ Tests failed, rolling back"
      exit 1
    fi
```

### Step 4: Monitoring (First 10 minutes)

Watch these metrics closely after deploy:

```bash
# Error rate (should be <0.1%)
curl https://monitoring.example.com/metrics/error_rate

# API latency p95 (should not spike)
curl https://monitoring.example.com/metrics/latency_p95

# Active users (should be normal)
curl https://monitoring.example.com/metrics/active_users

# Database query latency (should be normal)
curl https://monitoring.example.com/metrics/db_latency
```

If ANY metric spikes → **Immediate rollback**:

```bash
# One-click rollback
gh workflow run deploy-rollback.yml --field=from_version=current --field=to_version=previous
```

### Step 5: Validation (30 minutes)

After 30 minutes, if all metrics normal:

```bash
# Mark deployment as successful
gh run view --repo owner/repo $RUN_ID --json conclusion
# Should show "success"

# Log deployment
echo "✅ Production deploy successful at $(date)" >> DEPLOYMENT_LOG.md
```

---

## Rollback Procedure

**Trigger:** Manual OR automatic (if error rate exceeds threshold)

### Manual Rollback

```bash
# 1. Identify good version
git log --oneline | head -10

# 2. Rollback to previous commit
GOOD_COMMIT=abc1234
gh workflow run deploy-prod.yml --field=target_commit=$GOOD_COMMIT

# 3. Monitor rollback
# (same as deployment verification)
```

### Automatic Rollback (Error Rate Threshold)

```yaml
# .github/workflows/auto-rollback.yml
on:
  schedule:
    - cron: '*/5 * * * *'  # Check every 5 minutes after deploy

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Check error rate
        run: |
          ERROR_RATE=$(curl -s https://monitoring.example.com/api/error_rate)
          THRESHOLD=1.0  # 1%

          if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
            echo "⚠️  Error rate $ERROR_RATE% exceeds $THRESHOLD%"
            
            # Trigger rollback
            gh workflow run deploy-rollback.yml
          fi
```

---

## Audit Trail & Compliance

### Deployment Log

Every deployment is logged:

```markdown
# Deployment Log

## 2026-07-15 14:30 UTC - Production Deploy v1.2.3
- **Commit:** abc1234 (chore: update deps)
- **Deployed by:** Gonza Mendoza (tech lead)
- **Duration:** 5 minutes
- **Status:** ✅ Success
- **Metrics:**
  - Error rate: 0.02%
  - Latency p95: 145ms
  - Active users: 2,341
- **Incidents:** None
- **Rollback:** Not required

---

## 2026-07-14 10:15 UTC - Production Deploy v1.2.2
- **Commit:** def5678 (fix: auth middleware)
- **Deployed by:** Gonza Mendoza
- **Duration:** 8 minutes
- **Status:** ✅ Success
- **Metrics:** All normal
```

**Location:** `DEPLOYMENT_LOG.md` in repo (commit history)

**Retention:** Keep 1 year on-repo, archive older entries

### Security & Regulatory

**Who can audit deployments?**
- Tech lead ✅
- Security team ✅
- Compliance officer (on request) ✅
- Other engineers ❌ (view-only via CI logs)

**Information logged:**
- Commit hash (code version)
- Deployed by (identity)
- Timestamp (when)
- Duration (how long)
- Metrics (proof it worked)
- Any incidents (what happened)

**Never log:**
- ❌ Database passwords
- ❌ API keys
- ❌ Encryption keys
- ❌ Personally identifiable information

---

## Deployment Restrictions

### No Direct Production Changes

```bash
# ❌ FORBIDDEN: Direct access to production database
ssh prod-db.example.com
mysql -u root -p  # Not allowed

# ❌ FORBIDDEN: Manually SSH into prod server to run commands
ssh prod-api.example.com
npm start  # Not allowed

# ✅ CORRECT: Deploy via CI/CD
gh workflow run deploy-prod.yml
# Audit trail, automated testing, rollback capability
```

### Protected Branches

**main** is protected:
- ✅ Require 1 approval before merge
- ✅ Require CI to pass
- ✅ Require branch up-to-date
- ✅ Administrators also required to follow rules
- ❌ Force push disabled
- ❌ Direct commits disabled

### Change Approval (for compliance frameworks)

If your compliance framework requires Change Advisory Board (CAB) approval:

```markdown
# CAB Approval Template (add to PR description)

## Change Description
Brief description of what's changing

## Risk Assessment
- Risk level: Low / Medium / High
- Rollback time: < 5 minutes (blue-green)
- Testing performed: (what was tested)

## Approval
- [ ] Tech lead: Approved by [NAME]
- [ ] DBA (if DB changes): Approved by [NAME]
- [ ] Security (if security-related): Approved by [NAME]
- [ ] CAB chair: Approved by [NAME]

Date: 2026-07-15
```

---

## High-Risk Deployments

### Database Schema Changes

**SLA:** Friday afternoon, with DBA on-call

**Procedure:**
1. Test migration on staging (24 hours before)
2. Backup production DB
3. Run migration on production (with DBA monitoring)
4. Verify data integrity
5. Keep rollback DB snapshot for 7 days
6. Post-deployment review

### Security-Critical Changes (CVE Fix)

**SLA:** Within 24 hours of merge

**Procedure:**
1. Skip normal wait period
2. Deploy immediately (with tech lead + security lead approval)
3. Verify fix (re-run security scanner)
4. Notify stakeholders (customers, partners)
5. Post-incident review (why was this vuln not caught earlier?)

### Large Refactoring

**SLA:** During business hours (2-4pm)

**Procedure:**
1. Extended monitoring (1+ hour instead of 30 min)
2. Phased rollout (25% → 50% → 100% traffic)
3. Run extra smoke tests
4. Have senior engineer on standby

---

## Deployment Checklist

```markdown
# Production Deployment Checklist

## Pre-Deployment (Before triggering CI)
- [ ] Latest code on main branch
- [ ] All CI checks passing (lint, test, coverage)
- [ ] No new HIGH/CRITICAL security vulnerabilities
- [ ] Database migrations prepared and tested on staging
- [ ] Rollback plan documented
- [ ] On-call team notified
- [ ] Monitoring dashboards open and ready
- [ ] Change log entry created

## Deployment (Running CI/CD)
- [ ] Triggered deployment from secure terminal
- [ ] Verified identity (MFA + SSH)
- [ ] Build phase completed successfully
- [ ] Artifact scanning passed
- [ ] Staged deployment successful
- [ ] Smoke tests passed on staging

## Post-Deployment (First 30 minutes)
- [ ] Production health checks passing
- [ ] Error rate normal (<0.1%)
- [ ] Latency p95 normal (no spike)
- [ ] Database connections healthy
- [ ] User-facing functionality verified manually
- [ ] Logs reviewed (no ERROR level entries)
- [ ] Monitoring alerts configured and armed

## Closure
- [ ] Deployment marked successful
- [ ] Deployment log entry created
- [ ] Stakeholders notified
- [ ] Post-deployment review completed (if issues found)

Date: __________
Deployed by: __________
Verified by: __________
```

---

## References

- [GitHub: Deployment Security](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments)
- [NIST: Change Management](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-53r5.pdf)
- [The Phoenix Project: DevOps](https://itrevolution.com/the-phoenix-project/)

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
