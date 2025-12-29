# Supabase Quick Reference

Quick checklist for Supabase setup and connection string configuration.

## Connection Strings Cheat Sheet

### Production Database

**Pooled Connection (`DATABASE_URL`):**
- Location: Supabase Dashboard → Settings → Database → Connection pooling → Transaction
- Port: `6543`
- Must include: `pgbouncer=true&connection_limit=1`
- Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

**Direct Connection (`DIRECT_URL`):**
- Location: Supabase Dashboard → Settings → Database → Direct connection
- Port: `5432`
- Must include: `sslmode=require`
- Format: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require`

### Staging Database

Same format as Production, but from your staging project.

---

## Vercel Environment Variables Setup

### Production (Vercel → Settings → Environment Variables)

```
DATABASE_URL = [Production pooled connection]
DIRECT_URL = [Production direct connection]
PRISMA_ACCELERATE_URL = [Production Accelerate URL]
```

**Apply to:** Production only

### Preview (Vercel → Settings → Environment Variables)

```
DATABASE_URL = [Staging pooled connection]
DIRECT_URL = [Staging direct connection]
PRISMA_ACCELERATE_URL = [Staging Accelerate URL]
```

**Apply to:** Preview, Development

---

## Verification Commands

### Test Connection Locally

```bash
# Set in .env.local
DATABASE_URL="[your-connection-string]"
DIRECT_URL="[your-direct-connection-string]"

# Test connection
npx prisma db pull

# Run migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Test via API

Visit: `https://[your-domain]/api/debug/env-health`

Check:
- ✅ `database.urlConfigured: true`
- ✅ `database.directUrlConfigured: true`
- ✅ `database.accelerateUrlValid: true`
- ✅ `database.urlsMatch: true`

---

## Common Mistakes to Avoid

❌ **Don't use pooled connection for migrations**
- Always use `DIRECT_URL` for `prisma migrate deploy`

❌ **Don't mix connection types**
- `DATABASE_URL` should be pooled (port 6543)
- `DIRECT_URL` should be direct (port 5432)

❌ **Don't use same database for Production and Preview**
- Create separate Supabase projects

❌ **Don't commit connection strings**
- Always use environment variables

✅ **Do verify connections match**
- Check `database.urlsMatch: true` in env-health endpoint
- Verify fingerprints are different between Production and Staging

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Use `DIRECT_URL` (not `DATABASE_URL`) |
| Connection timeout | Check port (6543 for pooled, 5432 for direct) |
| Accelerate invalid | Verify URL starts with `prisma://` |
| URLs don't match | Ensure both point to same Supabase project |

---

## Full Documentation

For detailed setup instructions, see: `docs/SUPABASE_SETUP.md`

