# Password Policy

## Overview

All user passwords in BCP (BROTE Communication Platform) must meet strict complexity requirements to ensure account security.

## Requirements

Every password must contain ALL of the following:

| Rule | Requirement | Example |
|------|-------------|---------|
| **Minimum Length** | At least 8 characters | `Password` ✓ |
| **Uppercase** | At least 1 uppercase letter (A-Z) | `Password` ✓ |
| **Lowercase** | At least 1 lowercase letter (a-z) | `Password` ✓ |
| **Number** | At least 1 digit (0-9) | `Password1` ✓ |
| **Special Character** | At least 1 special char (!@#$%^&*) | `Password1!` ✓ |

## Valid Examples

✅ `MyPassword123!`
✅ `Secure@2025`
✅ `Admin#Demo99`
✅ `WorkSpace$1st`

## Invalid Examples

❌ `password123!` — no uppercase
❌ `PASSWORD123!` — no lowercase
❌ `MyPassword!` — no number
❌ `MyPassword123` — no special character
❌ `Pass1!` — too short (< 8 chars)

## Special Characters Allowed

```
! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " \ | , . < > / ?
```

## Where Policy Applies

The password policy is enforced on:
1. **User Registration** — `/auth/register` endpoint
2. **Invitation Acceptance** — `/invitations/{token}/accept` endpoint

## Configuration

Password hashing is configured via environment variables:

```bash
# Number of bcrypt rounds (cost factor)
# Development: 6 (faster, ~50ms per hash)
# Production: 12+ (secure, ~250ms+ per hash)
BCRYPT_ROUNDS="12"
```

## Error Messages

When a password fails validation, users receive specific error messages:

- "Password must be at least 8 characters"
- "Password must contain at least one uppercase letter"
- "Password must contain at least one lowercase letter"
- "Password must contain at least one number"
- "Password must contain at least one special character (!@#$%^&*...)"

## Implementation

Password complexity validation is implemented in:
- **Backend**: `packages/application/src/auth/security/passwordValidator.ts`
- **API Routes**: 
  - `apps/api/src/routes/auth.ts` (register)
  - `apps/api/src/routes/invitations.ts` (accept)
- **Domain Commands**:
  - `RegisterWorkspaceCommand`
  - `AcceptInvitationCommand`
