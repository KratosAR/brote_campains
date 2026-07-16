# GitHub Setup Checklist

## Prerequisites

- ✅ Repository created (KratosAR/brote_campains)
- ✅ CI/CD workflows configured (.github/workflows/)
- ✅ Branches created (main, staging, development)
- ⚠️ **GitHub Pro required** for branch protection on private repos

---

## Step 1: Upgrade to GitHub Pro (if private repo)

**Required for:** Branch protection, secret management via API, more actions minutes

**Option A: Upgrade Account to GitHub Pro**
1. Go to https://github.com/settings/billing
2. Click "Upgrade"
3. Select "GitHub Pro" ($4/month)
4. Complete payment

**Option B: Make Repository Public**
1. Go to repo → Settings → General
2. Scroll to "Danger Zone"
3. Click "Make public"
4. Confirm

---

## Step 2: Manually Configure Branch Protection (GitHub UI)

### For `main` branch (Production)

1. **Go to:** Repository → Settings → Branches
2. **Click:** "Add rule"
3. **Branch name pattern:** `main`
4. **Configure:**

**Protection Rules:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (if using CODEOWNERS)
  
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - ✅ Select status checks:
    - `CI` (from .github/workflows/ci.yml)
    - `CodeQL Analysis` (from codeql.yml)
    - `Dependency scanning` (from sbom.yml)
  
- ✅ Other restrictions:
  - ✅ Include administrators
  - ❌ Allow force pushes: `Do not allow`
  - ❌ Allow deletions: `Do not allow`

5. **Save** (click "Create" or "Update")

### For `staging` branch (Pre-production)

Same as `main`, but:
- ❌ DO NOT require approvals (only CI pass)
- ✅ Require status checks pass
- ✅ Include administrators

### For `development` branch (Optional)

- ✅ Require status checks pass
- ❌ No approval required
- ❌ Don't include administrators

---

## Step 3: Configure Snyk Integration

### 3.1: Create Snyk Account
1. Go to https://snyk.io/
2. Sign up with GitHub
3. Authorize Snyk to access repositories
4. Select `brote_campains` repository

### 3.2: Generate Snyk Token
1. Go to https://app.snyk.io/account/settings/
2. Click "Generate token"
3. Copy token
4. Save to GitHub Secrets (see Step 5)

### 3.3: Snyk Configuration
In Snyk dashboard:
- [ ] Enable "Fail PR if vulnerabilities found" (HIGH+)
- [ ] Set "Only fail on fixable issues": NO (we want to know about all)
- [ ] Enable "Automatic fixes" for minor/patch (optional)

---

## Step 4: Configure Codecov Integration

### 4.1: Create Codecov Account
1. Go to https://codecov.io/
2. Sign up with GitHub
3. Authorize Codecov
4. Select `brote_campains` repository (auto-detected)

### 4.2: Configure Repository
In Codecov dashboard:
1. Go to your repo settings
2. **Coverage tolerance:** 80% (match our threshold)
3. **Fail CI if coverage drops:** YES
4. **Patch coverage requirement:** 80%
5. **Flag:** Create flag "backend" + "frontend" if multi-project

### 4.3: No token needed
Codecov auto-detects GitHub Actions, no explicit token required

### 4.4: Verify Integration
- PR should show coverage report (wait for first coverage upload)
- Codecov badge in README can be added

---

## Step 5: Add GitHub Secrets (for workflows)

Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

**Required secrets:**

| Secret | Where to get | Action |
|--------|--------------|--------|
| `SNYK_TOKEN` | https://app.snyk.io/account/settings/ | Copy token |
| `SLACK_WEBHOOK_URL` | See below | Slack webhook |
| `GH_PACKAGES_TOKEN` | https://github.com/settings/tokens (scope: repo, packages) | Generate PAT |

### Generate Slack Webhook

1. Go to Slack workspace (https://brote.slack.com or your workspace)
2. **Integrations → Custom Integrations → Incoming Webhooks**
3. **Create New Webhook for channel:** `#security`
4. Copy webhook URL
5. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

**Example Slack webhook URL:**
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 6: Create Branches

```bash
# Create staging branch (track remote)
git checkout -b staging
git push -u origin staging

# Create development branch (track remote)
git checkout -b development
git push -u origin development

# Verify
git branch -a
# Should show:
#   main
#   staging
#   development
```

---

## Step 7: First Test Run

### 7.1: Create test PR
```bash
git checkout development
git checkout -b test/ci-verification
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify CI workflow"
git push origin test/ci-verification
gh pr create --base development --head test/ci-verification --title "Test: CI verification"
```

### 7.2: Verify CI runs
- [ ] PR shows CI checks running
- [ ] Lint pass/fail
- [ ] TypeCheck pass/fail
- [ ] Tests pass/fail
- [ ] Build pass/fail
- [ ] CodeQL analysis (if configured)
- [ ] Snyk scan (if token set)

### 7.3: Merge and deploy to dev
- [ ] Get 1 approval (yourself is fine for testing)
- [ ] Merge PR
- [ ] Verify deploy workflow runs
- [ ] Check GitHub Actions → deploy.yml output

### 7.4: Clean up
```bash
git push origin --delete test/ci-verification
```

---

## Step 8: Team Access & Permissions

### Add team members
Repository → Settings → Collaborators

| Role | Permissions |
|------|-------------|
| **Developer** | Can create PRs, merge to dev/staging |
| **Tech Lead** | Can merge to main, deploy to prod, rotate secrets |
| **Security** | Can trigger security workflows, view audit logs |
| **DevOps** | Can configure deployments, manage secrets |

**Recommended setup:**
```bash
# Add developers
gh repo edit --add-topic "backend"
gh repo add-collaborator --permission=write username1
gh repo add-collaborator --permission=write username2

# Add tech lead as admin
gh repo add-collaborator --permission=admin username_techLead
```

---

## Step 9: Environment Setup (Optional but Recommended)

Go to: Repository → Settings → Environments

### Create `development` environment
- [ ] No protection rules
- [ ] Deployment branches: All branches

### Create `staging` environment
- [ ] Required reviewers: (none)
- [ ] Deployment branches: `staging` only

### Create `production` environment
- [ ] Required reviewers: 1+ (tech lead)
- [ ] Deployment branches: `main` only
- [ ] Require branch to be up-to-date before deploying

---

## Step 10: Validation Checklist

- [ ] `main` branch has protection rules
- [ ] `staging` branch has protection rules
- [ ] `development` branch created
- [ ] Snyk account created + token in GitHub Secrets
- [ ] Codecov account created (no token needed)
- [ ] Slack webhook configured
- [ ] First test PR created and merged
- [ ] CI/CD workflows ran successfully
- [ ] Team members added with correct permissions
- [ ] README.md updated with badges (coverage, CI status)

---

## Troubleshooting

### "Branch protection API not available"
→ Repository is private + account doesn't have GitHub Pro
→ Solution: Upgrade to Pro OR make repo public

### "Snyk scan failing with no token"
→ SNYK_TOKEN not set in GitHub Secrets
→ Solution: Follow Step 5, add token

### "CI checks not running"
→ Workflows may be disabled
→ Solution: Go to Actions → Enable workflows

### "Cannot merge due to 'required checks'"
→ CI hasn't completed or failed
→ Solution: Wait for CI to pass or fix failing checks

---

## Admin Tasks (Monthly)

- [ ] Review GitHub audit log for unauthorized access
- [ ] Check if any secrets need rotation (see SECRET_ROTATION_POLICY.md)
- [ ] Verify branch protection rules are still in place
- [ ] Update team permissions if needed
- [ ] Check Snyk vulnerability report

---

## References

- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [Snyk GitHub Integration](https://docs.snyk.io/integrations/git-repository-scm-integrations/github-integration)
- [Codecov GitHub Integration](https://docs.codecov.io/docs/github-integration)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

*Last updated: 2026-07-15*  
*Setup time: ~30 minutes*
