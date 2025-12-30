# Verify Production Database Connection

Since local connection is failing, let's check if production can connect to verify the database is actually accessible.

## Test Production Connection

Visit your production site:
```
https://heirvault.app/api/debug/env-health
```

**What to check:**

1. **Database connection status:**
   ```json
   {
     "database": {
       "urlConfigured": true,
       "directUrlConfigured": true,
       "accelerateUrlConfigured": true,
       "accelerateUrlValid": true,
       "urlsMatch": true
     }
   }
   ```

2. **If production shows all `true`:**
   - ✅ Database is accessible (not paused)
   - ✅ Issue is with your local network/firewall
   - ✅ Connection strings are correct

3. **If production also shows connection errors:**
   - ❌ Database might be paused
   - ❌ Connection strings might be wrong in Vercel
   - ❌ Need to check Supabase project status

---

## What This Tells Us

### Scenario 1: Production Works, Local Fails
- Database is active and accessible
- Issue is local network/firewall blocking port 5432
- **Solutions:**
  - Try different network (mobile hotspot)
  - Check local firewall settings
  - Use VPN or different location

### Scenario 2: Both Production and Local Fail
- Database is likely paused or having issues
- **Solutions:**
  - Check Supabase dashboard for project status
  - Restore project if paused
  - Check Supabase status page for outages

---

## Next Steps Based on Results

**If production works:**
- Focus on local network/firewall issues
- Try from different network
- Check Windows Firewall settings

**If production also fails:**
- Check Supabase project status
- Verify connection strings in Vercel
- Contact Supabase support if needed

---

## Quick Test

Run this to check production:
```bash
# In browser, visit:
https://heirvault.app/api/debug/env-health

# Or use curl:
curl https://heirvault.app/api/debug/env-health
```

This will tell us if the issue is local or affects production too.

