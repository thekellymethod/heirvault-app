# Environment Variable Rules

**Critical rules to prevent database connection issues.**

## The Golden Rules

1. **Do not touch** `prisma.config.ts` for database URLs
2. **Never** define database URLs in code
3. **Never** quote URLs in `.env` files
4. **Never** reuse terminal sessions after env changes
5. **One DB variable only**: `DATABASE_URL`

## File Organization

| File | Contains DATABASE_URL? | Purpose |
|------|------------------------|---------|
| `.env.local` | ✅ **YES** (exactly one line) | Local development only |
| `.env` | ❌ **NO** | Fallback/shared config (no secrets) |
| `.env.example` | ✅ Yes (example format) | Template for team |
| GitHub Secrets | ✅ Yes | CI/CD production |
| Vercel Env Vars | ✅ Yes | Production deployment |

## DATABASE_URL Format Rules

### ✅ Correct Format

```env
DATABASE_URL=postgresql://USER:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**Requirements:**
- No quotes
- No spaces
- Port **6543** (pooled connection)
- Host contains `pooler.supabase.com`
- Exactly one line in `.env.local`

### ❌ Wrong Formats

```env
# WRONG: Quoted
DATABASE_URL="postgresql://..."

# WRONG: Spaces
DATABASE_URL = postgresql://...

# WRONG: Wrong port (direct connection)
DATABASE_URL=postgresql://...:5432/...

# WRONG: Old host format
DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/...

# WRONG: Multiple database variables
DATABASE_URL=...
DIRECT_URL=...
DIRECT_DATABASE_URL=...
```

## Verification Checklist

Before running migrations or deploying:

### Step 1: Clear Session Variables

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
Get-ChildItem Env: | findstr DATABASE
# Should return nothing
```

### Step 2: Verify .env.local

- Open `.env.local`
- Should contain **exactly one** `DATABASE_URL` line
- No quotes, no spaces
- Port 6543
- Host: `pooler.supabase.com`

### Step 3: Validate Prisma

```powershell
npx prisma validate
```

Expected: No errors, no P1013, no hostname warnings

### Step 4: Test Connection

```powershell
npx prisma db pull
```

Expected: Success (reads schema, doesn't modify anything)

### Step 5: Check Migrations

```powershell
npx prisma migrate status
```

Possible outcomes:
- ✅ "Database schema is up to date!" → Done
- ⚠️ "Following migrations have not been applied" → Run `npx prisma migrate deploy`
- ❌ Connection error → Check credentials

### Step 6: Apply Migrations (if needed)

```powershell
npx prisma migrate deploy
```

**Note:** This applies existing migrations only. Does not generate new ones. Production-safe.

## Helper Scripts

- `scripts/clear-env-db-url.ps1` - Clear session variables
- `scripts/verify-env-setup.ps1` - Check env file setup
- `scripts/verify-database-connection.ps1` - Full verification (Steps 1-5)

## When Things Go Wrong

### Problem: Wrong URL in Prisma commands

**Solution:**
1. Close PowerShell completely
2. Open new PowerShell window
3. Run `.\scripts\clear-env-db-url.ps1`
4. Verify: `Get-ChildItem Env: | findstr DATABASE` (should be empty)
5. Run `npx prisma validate`

### Problem: Multiple DATABASE_URL definitions

**Solution:**
1. Keep `DATABASE_URL` **only** in `.env.local`
2. Remove from `.env`
3. Clear session: `Remove-Item Env:DATABASE_URL`
4. Restart PowerShell

### Problem: Quoted URL

**Solution:**
1. Open `.env.local`
2. Remove quotes: `DATABASE_URL=postgresql://...` (not `DATABASE_URL="postgresql://..."`)
3. Save file
4. Restart PowerShell

## What We're NOT Doing Yet

These are future optimizations, not current priorities:

- ❌ Prisma Accelerate tuning
- ❌ CI optimization
- ❌ Shadow databases
- ❌ Direct connections (use pooled)
- ❌ Multiple environments in code

**Focus on stability first.**

## Quick Reference

```powershell
# Full verification
.\scripts\verify-database-connection.ps1

# Quick check
.\scripts\verify-env-setup.ps1

# Clear session
.\scripts\clear-env-db-url.ps1

# Validate
npx prisma validate

# Test connection
npx prisma db pull

# Check migrations
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy
```

## Remember

**Environment variable precedence (highest to lowest):**
1. PowerShell session (`$env:DATABASE_URL`)
2. `.env.local`
3. `.env`
4. System environment variables

Always clear session variables when debugging!
