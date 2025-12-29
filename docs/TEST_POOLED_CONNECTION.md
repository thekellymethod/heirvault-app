# Test with Pooled Connection

If direct connection isn't working, let's test if the pooled connection works to isolate the issue.

## Temporary Test: Use DATABASE_URL

This is just for testing - we'll switch back to DIRECT_URL after.

### Step 1: Temporarily Change prisma.config.ts

Change this line in `prisma.config.ts`:

**From:**
```typescript
datasource: {
  url: env("DIRECT_URL"),
},
```

**To:**
```typescript
datasource: {
  url: env("DATABASE_URL"),  // Temporarily use pooled connection
},
```

### Step 2: Test Migration

```bash
npx prisma migrate status
```

**What this tells us:**
- ✅ **If it works:** The issue is specific to direct connection (might be network/firewall)
- ❌ **If it fails:** The issue is broader (project paused, wrong credentials, etc.)

### Step 3: Switch Back

After testing, change back to:
```typescript
datasource: {
  url: env("DIRECT_URL"),  // Back to direct connection
},
```

**Note:** For production migrations, always use DIRECT_URL. This is just for testing.

---

## Alternative: Check Supabase Project Status

The connection error suggests the database server isn't reachable. This could mean:

1. **Project is Paused**
   - Go to Supabase Dashboard
   - Check if project shows "Paused"
   - Click "Restore" if paused

2. **Network/Firewall Issue**
   - Your network might be blocking port 5432
   - Try from a different network
   - Check if VPN is interfering

3. **IP Allowlist**
   - Supabase might have IP allowlist enabled
   - Go to Settings → Database → Connection Pooling
   - Check IP allowlist settings

4. **Wrong Connection String**
   - Verify you copied the exact string from Supabase
   - Check password is correct
   - Make sure project reference matches

---

## Next Steps

1. Try the pooled connection test above
2. Check Supabase dashboard for project status
3. Verify connection strings match exactly
4. Check network/firewall settings

