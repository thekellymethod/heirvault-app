# GitHub Actions Setup Guide

## Required Secrets

Your GitHub repository needs the following secrets configured:

### Required Secret

| Secret Name | Description | Format |
|-------------|-------------|--------|
| `DATABASE_URL` | Supabase pooled connection (port 6543) | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require` |

**Important:**
- ✅ Use **pooled connection** (port 6543)
- ✅ Host: `pooler.supabase.com`
- ✅ Include `?pgbouncer=true&connection_limit=1&sslmode=require`
- ❌ Do NOT use direct connection (port 5432)
- ❌ Do NOT use `DATABASE_URL_DIRECT` secret

## How to Set Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DATABASE_URL`
5. Value: Your pooled connection string from Supabase
6. Click **Add secret**

## Verifying Your Secret

The connection string should:
- Start with `postgresql://`
- Contain `pooler.supabase.com` in the host
- Use port `:6543`
- Include `pgbouncer=true&connection_limit=1&sslmode=require`

## Workflows That Use DATABASE_URL

- **`.github/workflows/prisma-migrate.yml`** - Runs migrations on push to main
- **`.github/workflows/test.yml`** - Uses `TEST_DATABASE_URL` for test database

## Troubleshooting

### Error: "Can't reach database server at `db.xxx.supabase.co:5432`"

**Cause:** The secret `DATABASE_URL_DIRECT` is being used (old direct connection)

**Solution:**
1. Update `.github/workflows/prisma-migrate.yml` to use `secrets.DATABASE_URL`
2. Make sure `DATABASE_URL` secret contains pooled connection (port 6543)
3. Remove or ignore `DATABASE_URL_DIRECT` secret

### Error: "Connection timeout"

**Possible causes:**
- Secret contains wrong connection string
- Supabase project is paused
- IP allowlist blocking GitHub Actions IPs

**Solution:**
1. Verify secret value matches Supabase dashboard
2. Check Supabase project status (should be Active)
3. Disable IP allowlist or add GitHub Actions IP ranges

## Migration from Direct to Pooled

If you previously used `DATABASE_URL_DIRECT`:

1. **Update the secret:**
   - Go to GitHub Secrets
   - Update `DATABASE_URL` with pooled connection (port 6543)
   - Delete `DATABASE_URL_DIRECT` (or leave it unused)

2. **Update workflows:**
   - Already done: `.github/workflows/prisma-migrate.yml` uses `DATABASE_URL`
   - No code changes needed

3. **Test:**
   - Push a change to trigger the workflow
   - Check workflow logs for successful connection
