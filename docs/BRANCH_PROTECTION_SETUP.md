# Branch Protection Setup Guide

## How to Enable Branch Protection for `main`

Branch protection rules prevent accidental or malicious changes to the main branch. Follow these steps to configure them in GitHub.

---

## Prerequisites

- Admin access to the repository
- GitHub CLI (optional, for automation)

---

## Manual Setup (GitHub Web UI)

### Step 1: Navigate to Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. In left sidebar, click **Branches**

### Step 2: Add Branch Protection Rule

1. Click **Add rule** button
2. In "Branch name pattern" field, enter: `main`

### Step 3: Configure Protection Rules

Enable the following settings:

#### ✅ Require a pull request before merging
- [x] Require pull request reviews before merging
- [x] Require approvals: `1`
- [x] Require review from Code Owners: (if CODEOWNERS file exists)
- [x] Dismiss stale pull request approvals when new commits are pushed

#### ✅ Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Select status checks that must pass:
  - `ci / Lint / TypeCheck / Test / Build` (all jobs from `.github/workflows/ci.yml`)
  - Specifically:
    - `ci (Lint / TypeCheck / Test / Build)` — the main CI job
    - Any additional checks (Snyk, CISA KEV once fully integrated)

#### ✅ Other Settings
- [x] Require code reviews: `1`
- [x] Restrict who can push to matching branches: (optional)
- [x] Include administrators: ✅ (important: leaders follow rules too)
- [ ] Allow force pushes: ❌ (must be OFF)
- [ ] Allow deletions: ❌ (must be OFF)

### Step 4: Save Rules

Click **Create** button at the bottom.

---

## Automated Setup (GitHub CLI)

If you prefer command line:

```bash
# Install GitHub CLI
# https://cli.github.com

# Authenticate
gh auth login

# Create branch protection rule for main
gh api repos/OWNER/brote_campains/branches/main/protection \
  --input protection.json
```

**protection.json:**
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci (Lint / TypeCheck / Test / Build)"
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": false,
    "dismiss_stale_reviews": true
  },
  "enforce_admins": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false
}
```

Run:
```bash
gh api repos/OWNER/brote_campains/branches/main/protection \
  -f required_status_checks.strict=true \
  -f "required_status_checks.contexts[]=ci (Lint / TypeCheck / Test / Build)" \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f enforce_admins=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

---

## Verification

### Verify Protection is Active

1. In **Settings > Branches**, check that `main` shows:
   - ✅ Pull Request required
   - ✅ Status checks required
   - ✅ Require 1 approval

2. Try to push directly to main (should fail):
   ```bash
   git push origin main
   # Error: refusing to allow you to update a protected branch
   ```

3. Try to merge PR without passing CI (should block):
   - Open a PR with failing tests
   - Try to merge
   - GitHub will show "Merging is blocked"

---

## Handling Emergency Fixes

### If Production Issue Requires Bypass

**NEVER** disable branch protection. Instead:

1. **Create emergency hotfix branch:**
   ```bash
   git checkout -b hotfix/production-issue
   git push origin hotfix/production-issue
   ```

2. **Open emergency PR:**
   - Label: `🚨 emergency`
   - Title: `HOTFIX: [issue description]`
   - Description: Explain why normal review process cannot wait

3. **Fast-track approval:**
   - Requires 2 approvals (instead of 1) for safety
   - Same CI checks must pass
   - Can be merged immediately upon approval

4. **Post-incident:**
   - Document in `SECURITY_INCIDENTS.md`
   - Root cause analysis in next retro
   - Prevent recurrence

---

## FAQ

### Q: Can I bypass protection for my own changes?
**A:** No. Branch protection applies to everyone, including admins.

### Q: What if CI is failing?
**A:** Fix the code. Don't bypass CI. The check exists for your safety.

### Q: My PR is approved but merge is blocked. Why?
**A:** Status check failed. Check the CI logs, fix the code, and re-run tests.

### Q: How long does CI take?
**A:** Usually 5-10 minutes. Check `.github/workflows/ci.yml` for timing.

### Q: Can I force push to main?
**A:** No. Use `git revert` or create a new PR instead.

---

## Troubleshooting

### CI Won't Pass

Check in order:
1. **Linting:** `pnpm lint` locally
2. **Types:** `pnpm typecheck` locally  
3. **Tests:** `pnpm test` locally (must have ≥80% coverage)
4. **Build:** `pnpm build` locally
5. **Dependencies:** `npm audit` or Snyk scan

If local tests pass but CI fails:
- Check `.github/workflows/ci.yml` for environment setup differences
- Check for secrets/env vars not available in CI
- Check for platform-specific issues (Windows vs Linux)

### Branch Protection Misconfigured

If you see unexpected behavior:
1. Go back to **Settings > Branches**
2. Delete the rule for `main`
3. Create a new rule with correct settings (above)
4. Verify against Verification section

### Can't Merge Despite All Checks Passing

Possible causes:
1. **Stale branch:** Click "Update branch" in PR
2. **Missing approval:** Add 1+ review approval
3. **Protected status:** Verify branch protection rule exists
4. **Caching:** Refresh page (Ctrl+Shift+R or Cmd+Shift+R)

---

## Related Documentation

- [CI_CD_RULES.md](./CI_CD_RULES.md) — Policy for all CI/CD gates
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — CI pipeline definition
- [commitlint config](../commitlint.config.js) — Commit message format

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
