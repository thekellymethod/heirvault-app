# Verify Prisma Accelerate Setup

Quick steps to verify your Accelerate configuration is working.

## Step 1: Check Environment Health

Visit your production site:
```
https://heirvault.app/api/debug/env-health
```

Look for these fields in the response:

```json
{
  "database": {
    "accelerateUrlConfigured": true,    // ✅ Should be true
    "accelerateUrlValid": true          // ✅ Should be true
  }
}
```

**If both are `true`, Accelerate is configured correctly!**

---

## Step 2: Verify the URL Format

The Accelerate URL should:
- ✅ Start with `prisma://`
- ✅ Contain `accelerate.prisma-data.net`
- ✅ Have an `api_key` parameter

**Example format:**
```
prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

---

## Step 3: Test Database Connection

If the health check shows `accelerateUrlValid: true`, your connection is working!

You can also test locally:

```bash
# Set in .env.local
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=..."

# Test connection
npx prisma db pull
```

---

## Common Issues

### `accelerateUrlValid: false`

**Possible causes:**
1. URL doesn't start with `prisma://`
2. Accelerate project is paused
3. Accelerate project not linked to database
4. API key is invalid

**Solutions:**
- Verify URL format in Vercel environment variables
- Check Accelerate dashboard - project should be "Active"
- Re-link Accelerate project to your database
- Regenerate API key if needed

### `accelerateUrlConfigured: false`

**Cause:** `PRISMA_ACCELERATE_URL` not set in environment

**Solution:** Add the variable in Vercel (Production and/or Preview)

---

## What Success Looks Like

✅ `accelerateUrlConfigured: true`  
✅ `accelerateUrlValid: true`  
✅ Database queries work normally  
✅ No connection errors in logs  

---

## Next Steps

Once verified:
1. ✅ Test in Preview environment (if you have staging)
2. ✅ Monitor Accelerate dashboard for usage
3. ✅ Continue with full test suite: `docs/TEST_SETUP.md`

