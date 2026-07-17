# Secret Rotation Policy

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Política vigente de rotación de secretos.


## Overview

Secrets (API keys, passwords, tokens, encryption keys) must be rotated regularly to limit the blast radius of a potential compromise. This document defines rotation schedules, procedures, and verification.

---

## Secrets Inventory

### Application Secrets (Rotated)

| Secret | Current Value | Rotation | SLA | Owner |
|--------|---------------|----------|-----|-------|
| JWT_SECRET | (redacted) | Every 90 days | Critical | Tech Lead |
| JWT_REFRESH_SECRET | (redacted) | Every 90 days | Critical | Tech Lead |
| ENCRYPTION_KEY | (redacted) | Every 180 days | High | Tech Lead |
| DATABASE_PASSWORD | (redacted) | Every 180 days | High | DBA |
| REDIS_PASSWORD | (redacted) | Every 180 days | High | DevOps |

### Third-Party Secrets (External SLA)

| Secret | Provider | Rotation | Owner | Notes |
|--------|----------|----------|-------|-------|
| SNYK_TOKEN | Snyk.io | As needed | Security Team | Revoke if compromised |
| GITHUB_TOKEN | GitHub | Per workflow | Automation | Ephemeral, short-lived |
| META_ACCESS_TOKEN | Meta (WhatsApp) | Per Meta policy | Integrations Lead | Vendor controls |
| EVOLUTION_API_KEY | Evolution API | Per contract | Integrations Lead | Vendor controls |

### CI/CD Secrets

| Secret | Service | Rotation | Owner |
|--------|---------|----------|-------|
| CODECOV_TOKEN | Codecov | Yearly | DevOps |
| SLACK_WEBHOOK_URL | Slack | On webhook recreation | Security |
| GH_PACKAGES_TOKEN | GitHub Packages | Yearly | DevOps |

---

## Rotation Schedule

### Phase 1: Planning (2 weeks before SLA)

- [x] Schedule rotation date
- [x] Notify all teams using the secret
- [x] Prepare new secret value
- [x] Plan rollback strategy (old secret active during transition)

### Phase 2: Deployment (SLA date)

- [x] Generate new secret value
  ```bash
  # For JWT/Encryption secrets:
  openssl rand -hex 32
  ```
- [x] Update in GitHub Secrets (GitHub UI or `gh` CLI)
- [x] Update in production environment
- [x] Verify services still work with new secret
- [x] Keep old secret in place (grace period: 24 hours)

### Phase 3: Verification (24 hours after)

- [x] Confirm all services working with new secret
- [x] Check logs for auth failures
- [x] Monitor error rates
- [x] If all clear: deactivate old secret

### Phase 4: Cleanup (48 hours after)

- [x] Remove old secret from environment
- [x] Delete from GitHub Secrets (if dual-store)
- [x] Document in changelog
- [x] Archive old value (encrypted, 1 year retention)

---

## JWT Secret Rotation (Most Common)

### Why JWT Rotation Matters

JWT tokens are signed with `JWT_SECRET`. If secret is compromised:
- Attacker can create valid tokens
- Attacker can impersonate any user
- **Mitigation:** Rotate secret, force all users to re-login

### Rotation Procedure

**1. Generate new secret:**
```bash
NEW_SECRET=$(openssl rand -hex 32)
echo "New JWT_SECRET: $NEW_SECRET"
```

**2. Update in staging first:**
```bash
# In .env.staging:
JWT_SECRET=$NEW_SECRET

# Test
pnpm test --testPathPattern="auth"
```

**3. Update in production:**
```bash
# GitHub Secrets → JWT_SECRET → Update value

# Or via gh CLI:
gh secret set JWT_SECRET --body "$NEW_SECRET" --visibility all
```

**4. Redeploy API:**
```bash
# Trigger CD pipeline (automatic)
git push origin main

# Verify:
curl -H "Authorization: Bearer $OLD_TOKEN" https://api.example.com/me
# Should fail (unauthorized) if old tokens are invalidated

# Refresh token should work (uses refresh token rotation)
```

**5. Invalidate existing tokens (optional):**

If you want to force all users to re-login immediately:
```typescript
// src/auth/InvalidateTokensCommand.ts (rarely used)
export class InvalidateOldTokensCommand {
  execute(): Result<void> {
    // Option 1: Blacklist all tokens issued before rotation time
    // Option 2: Increment token version number (stored in JWT)
    // Option 3: Force re-login for all users
    return Result.ok()
  }
}
```

**Most applications:** New secret only affects NEW tokens. Existing tokens remain valid until they expire. This is less disruptive.

---

## Encryption Key Rotation (Sensitive)

**Used for:** Encrypting provider credentials (Meta, Evolution API keys) in database

### Rotation (180-day SLA)

```typescript
// src/infrastructure/CryptoService.ts
// Maintain old + new keys during transition

const ENCRYPTION_KEYS = {
  current: process.env.ENCRYPTION_KEY, // New key
  previous: process.env.ENCRYPTION_KEY_PREV // Old key (grace period)
};

export class EncryptionService {
  encrypt(plaintext: string): string {
    return encrypt(plaintext, ENCRYPTION_KEYS.current);
  }

  decrypt(ciphertext: string): string {
    try {
      return decrypt(ciphertext, ENCRYPTION_KEYS.current);
    } catch {
      // Fall back to old key during grace period
      return decrypt(ciphertext, ENCRYPTION_KEYS.previous);
    }
  }
}
```

### During Rotation:

1. **Day 0:** Set new key as "current", old as "previous"
2. **Days 0-7:** Grace period (both keys active)
3. **Day 7:** Re-encrypt all provider credentials with new key
   ```sql
   -- After deployment
   UPDATE channel_connections
   SET credentials = re_encrypt(credentials, old_key, new_key)
   WHERE created_at < NOW() - INTERVAL '24 hours';
   ```
4. **Day 8:** Remove old key from config

---

## Database Password Rotation

**SLA:** 180 days

### Procedure (with zero downtime)

1. **Create new DB user:**
   ```sql
   -- New user with new password
   CREATE USER bcp_app_new WITH PASSWORD 'new_secure_password_here';
   GRANT CONNECT ON DATABASE bcp TO bcp_app_new;
   GRANT USAGE ON SCHEMA public TO bcp_app_new;
   -- ... grant all necessary permissions
   ```

2. **Verify new user works:**
   ```bash
   psql -h localhost -U bcp_app_new -d bcp -c "SELECT NOW();"
   ```

3. **Update production connection strings:**
   ```bash
   # GitHub Secrets → DATABASE_PASSWORD → Update value
   # Or in RDS parameter group
   ```

4. **Redeploy with new password:**
   - Services auto-reconnect with new credentials

5. **Monitor:**
   - Check connection pool (max_connections still healthy)
   - Check error logs (no auth failures)
   - After 48 hours: Drop old user

---

## Audit Trail

### Rotation Log

Create `SECURITY_ROTATION_LOG.md`:

```markdown
# Secret Rotation Log

## 2026-07-15: JWT_SECRET Rotation (90-day cycle)
- **Date:** 2026-07-15 14:00 UTC
- **Secret:** JWT_SECRET
- **Action:** Full rotation
- **Verified:** All tests pass, users auto-logged-in
- **Status:** Complete ✅
- **Auditor:** Gonza Mendoza

## 2026-04-15: JWT_SECRET Rotation (90-day cycle)
- **Date:** 2026-04-15 14:00 UTC
- **Secret:** JWT_SECRET
- **Action:** Full rotation
- **Status:** Complete ✅

... (historical entries)
```

**Storage:** Commit to repo (redacted), archive encrypted off-repo

---

## Automated Rotation (Future)

### GitHub Actions Scheduler

```yaml
name: Automatic Secret Rotation

on:
  schedule:
    - cron: '0 2 15 * *'  # 15th of each month, 2am UTC

jobs:
  rotate_jwt:
    runs-on: ubuntu-latest
    steps:
      - name: Generate new JWT_SECRET
        run: |
          NEW_SECRET=$(openssl rand -hex 32)
          echo "::add-mask::$NEW_SECRET"
          echo "NEW_JWT_SECRET=$NEW_SECRET" >> $GITHUB_ENV

      - name: Update GitHub Secret
        run: |
          gh secret set JWT_SECRET --body "${{ env.NEW_JWT_SECRET }}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Trigger deployment
        run: |
          gh workflow run deploy.yml

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'JWT_SECRET rotated automatically. New secret deployed.'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Status:** Planned for Q4 2026 (after manual process is stable)

---

## Emergency Secret Rotation

**If a secret is compromised:**

### Immediate (within 1 hour):

1. **Revoke old secret immediately**
2. **Generate new secret**
3. **Deploy new secret** (bypass normal approval process)
4. **Monitor for unusual activity:**
   - Unauthorized API calls
   - Unexpected database access
   - Token misuse

### Within 24 hours:

1. **Incident review:** How was secret compromised?
2. **Scan logs:** Check for attacker activity
3. **Audit trail:** What did the attacker access?
4. **Communication:** Notify affected users/customers

### Documentation:

- Create GitHub issue: `[SECURITY] Emergency rotation: SECRET_NAME`
- Log in `SECURITY_ROTATION_LOG.md`
- Post-incident review (why did this happen?)

---

## Secrets NOT to Rotate (Immutable)

- **API Keys for read-only services:** (if key rotation breaks integrations)
- **SSH keys for VCS (GitHub Deploy Keys):** (tied to specific repositories)
- **Vendor-managed secrets:** (e.g., OAuth callback secrets — vendor controls)

For immutable secrets: Document why in `[CURRENT].SECRET_ROTATION_POLICY.md` and schedule periodic audits instead of rotations.

---

## Verification Checklist

After each rotation:

- [ ] New secret is in GitHub Secrets
- [ ] New secret is in production environment
- [ ] Services restarted/redeployed with new secret
- [ ] No error logs with "unauthorized" or "authentication failed"
- [ ] Integration tests pass (if applicable)
- [ ] Old secret remains active for 24-hour grace period
- [ ] Monitoring dashboards normal (no spike in auth errors)
- [ ] Team notified rotation is complete
- [ ] Entry added to `SECURITY_ROTATION_LOG.md`

---

## References

- [OWASP: Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Vault by HashiCorp](https://www.vaultproject.io/) (enterprise rotation)

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
