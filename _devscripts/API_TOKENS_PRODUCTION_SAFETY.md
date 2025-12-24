# API Tokens - Production Safety Guide

## ⚠️ CRITICAL: Production Deployment Checklist

Before enabling API tokens in production, verify these safety switches are configured:

### Required Environment Variables

```env
# Admin Console (disable by default until ready)
ADMIN_CONSOLE_ENABLED=false

# API Token Authentication (disable by default until tested)
ADMIN_API_TOKEN_AUTH_ENABLED=false

# Token Prefix Environment (auto = test in dev, live in prod)
API_TOKEN_PREFIX_ENV=auto
```

### Deployment Strategy

1. **Initial Deployment**: Set both flags to `false`
   - Prevents accidental exposure of admin endpoints
   - Allows you to verify the codebase is deployed correctly

2. **Testing Phase**: Enable in staging first
   ```env
   ADMIN_CONSOLE_ENABLED=true
   ADMIN_API_TOKEN_AUTH_ENABLED=true
   ```

3. **Production Enablement**: Only enable after:
   - ✅ Verified scope enforcement works (see testing guide)
   - ✅ Tested revocation and expiry
   - ✅ Confirmed audit logs don't leak secrets
   - ✅ Reviewed which endpoints accept token auth

### What Gets Token Auth?

**Rule**: Tokens are for **machine-to-machine** operations. Clerk sessions are for **human users**.

#### ✅ Approved for Token Auth:
- **Admin Console Executor** (`/api/admin/console`)
  - Scope required: `console:exec` or `admin`
  - Use case: CI/CD, automation scripts, monitoring tools

#### ❌ NOT Approved (Clerk session only):
- User-facing endpoints
- Attorney verification endpoints (too sensitive)
- Client data access endpoints
- Any endpoint that modifies user data

#### 🤔 Consider Case-by-Case:
- Registry read/write endpoints (if needed for integrations)
- Log viewing endpoints (if needed for monitoring)

### Security Verification Steps

#### 1. Database Verification
```bash
npx prisma migrate status
npx prisma studio
```

Verify:
- `api_tokens` table exists
- Only `hash` is stored (never plaintext)
- `lastUsedAt`, `lastUsedIp`, `lastUsedPath` fields exist

#### 2. Scope Enforcement Test

Create a token with **only** `logs:read` scope (no `console:exec`):

```bash
curl -X POST http://localhost:3000/api/admin/console \
  -H "Authorization: Bearer <TOKEN_WITH_ONLY_LOGS_READ>" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"db:health","args":{}}'
```

**Expected**: `403 Missing required scope: console:exec or admin`

If it succeeds, **STOP** - scope enforcement is broken.

#### 3. Revocation Test

1. Create a working token
2. Test it works
3. Revoke it in `/admin/tokens`
4. Re-test the same token

**Expected**: `401 Token has been revoked`

#### 4. Expiry Test

1. Create a token with 1-minute expiry
2. Wait 2 minutes
3. Test the token

**Expected**: `401 Token has expired`

#### 5. Audit Log Verification

In Prisma Studio → `audit_logs`, verify:
- ✅ `API_TOKEN_CREATED` entries exist
- ✅ `API_TOKEN_USED` entries exist
- ✅ `API_TOKEN_REVOKED` entries exist
- ✅ `API_TOKEN_ROTATED` entries exist

**Critical**: Verify logs do **NOT** contain:
- ❌ Plaintext tokens
- ❌ Token hashes
- ✅ Only token IDs, paths, and scopes

### Token Rotation Best Practices

1. **Create new token** with same scopes
2. **Update your integration** to use new token
3. **Test new token** works
4. **Revoke old token** only after confirming new one works

This prevents downtime during rotation.

### Monitoring

Check `/admin/tokens` regularly for:
- Tokens that haven't been used in 90+ days (consider revoking)
- Unusual IP addresses in `lastUsedIp`
- Tokens approaching expiry
- Tokens with overly broad scopes (especially `admin`)

### Incident Response

If a token is compromised:

1. **Immediately revoke** the token in `/admin/tokens`
2. **Check audit logs** for unauthorized usage
3. **Review** `lastUsedIp` and `lastUsedPath` for suspicious activity
4. **Rotate** any related tokens
5. **Review** what scopes the token had and assess impact

### Production Defaults

**Before first production deployment**, ensure:

```env
ADMIN_CONSOLE_ENABLED=false
ADMIN_API_TOKEN_AUTH_ENABLED=false
```

Enable them intentionally after testing, not by default.

