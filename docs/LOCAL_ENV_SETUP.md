# Local Environment Setup

Quick guide to set up your local `.env.local` file for Prisma migrations.

## Step 1: Create `.env.local` File

Create a file named `.env.local` in your project root (same directory as `package.json`).

## Step 2: Add Required Environment Variables

Add these variables to `.env.local`:

```bash
# Database Connections
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"

# Prisma Accelerate (optional)
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."

# App URL (for local development)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

## Where to Get Connection Strings

### DATABASE_URL (Pooled Connection)
1. Go to Supabase Dashboard → Your Project
2. Settings → Database
3. Connection string → Connection pooling → Transaction
4. Copy the connection string

### DIRECT_URL (Direct Connection)
1. Same page: Settings → Database
2. Connection string → Direct connection
3. Copy the connection string

**Important:** 
- `DATABASE_URL` uses port **6543** (pooled)
- `DIRECT_URL` uses port **5432** (direct)

## Step 3: Verify It Works

After creating `.env.local`, test migrations:

```bash
npx prisma migrate status
```

Should work without the "Cannot resolve environment variable" error.

## Security Note

- `.env.local` should already be in `.gitignore` (don't commit it!)
- Never commit connection strings or API keys
- Use different values for local vs production

## Quick Test

Once `.env.local` is set up:

```bash
# Check migration status
npx prisma migrate status

# If migrations are pending, deploy them
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Troubleshooting

### Still Getting "Cannot resolve environment variable"

1. Make sure `.env.local` is in the project root (same folder as `package.json`)
2. Check file name is exactly `.env.local` (not `.env.local.txt`)
3. Restart your terminal/IDE after creating the file
4. Verify the variable names match exactly (case-sensitive)

### Connection Errors

- Verify connection strings are correct
- Check Supabase project is active
- Ensure passwords don't have special characters that need URL encoding

