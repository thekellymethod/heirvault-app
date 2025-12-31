# Environment Variable Precedence Guide

## The Core Truth

Your computer has **multiple places** where `DATABASE_URL` can exist. Prisma loads them in a specific order, and **higher-priority sources override lower ones**.

## Precedence Order (Highest to Lowest)

1. **PowerShell Session Environment** (`$env:DATABASE_URL`)
   - Lives in memory for the current session
   - Highest priority - overrides everything
   - Cleared when you close the terminal

2. **`.env.local`** (Local development only)
   - Highest file priority
   - Never committed to git
   - Use this for your local `DATABASE_URL`

3. **`.env`** (Fallback)
   - Lower file priority
   - Can be committed (but shouldn't contain secrets)
   - Should NOT contain `DATABASE_URL` if `.env.local` exists

4. **System Environment Variables**
   - Windows system-wide settings
   - Rarely used for development

## Quick Fix Checklist

When `DATABASE_URL` shows the wrong value:

### Step 1: Clear PowerShell Session
```powershell
Remove-Item Env:DATABASE_URL
$env:DATABASE_URL  # Should return nothing
```

Or use the helper script:
```powershell
.\scripts\clear-env-db-url.ps1
```

### Step 2: Verify File Setup
```powershell
.\scripts\verify-env-setup.ps1
```

### Step 3: Clean Up Files

**`.env.local`** should have:
```env
DATABASE_URL=postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**`.env`** should NOT have `DATABASE_URL` (remove it if present)

### Step 4: Restart Shell
1. Close PowerShell completely
2. Open a new PowerShell window
3. Verify: `$env:DATABASE_URL` (should be empty)
4. Test: `npx prisma migrate status`

## Critical Rules

### ❌ Never Do This
```env
DATABASE_URL="postgresql://..."  # Quotes are wrong
```

### ✅ Always Do This
```env
DATABASE_URL=postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**No quotes** unless the value contains spaces (URLs never do).

## File Organization

| File | Purpose | Contains DATABASE_URL? |
|------|---------|------------------------|
| `.env.local` | Local dev only | ✅ **YES** (your local connection) |
| `.env` | Fallback/shared | ❌ **NO** (remove if present) |
| `.env.example` | Template | ✅ Yes (example format only) |
| GitHub Secrets | CI/CD | ✅ Yes (production connection) |
| Vercel Env Vars | Production | ✅ Yes (production connection) |

## Why This Happens

You:
- Previously had `DATABASE_URL` defined
- Changed files
- But **did not clear the active shell environment**

Windows keeps the old value in memory like leftovers in a fridge. Prisma didn't do anything wrong - it trusted what the OS gave it.

## Prevention

1. **Always use `.env.local`** for local `DATABASE_URL`
2. **Never put `DATABASE_URL` in `.env`** (it's a fallback)
3. **Clear session variables** when debugging: `Remove-Item Env:DATABASE_URL`
4. **Restart shell** after changing env files
5. **Use helper scripts** to verify setup

## Helper Scripts

- `scripts/clear-env-db-url.ps1` - Clear session variable
- `scripts/verify-env-setup.ps1` - Diagnose env setup

## When You're Ready

We can:
- Lock this into a **repeatable checklist**
- Cleanly separate **local / CI / prod**
- Make sure you never see this class of problem again
