# DEV Database Setup Guide

## STEP 1 — Create a new DEV Postgres database

### Option A: Prisma Postgres (Recommended)
1. Go to https://console.prisma.io/
2. Create a new database project
3. Name it: `heirvault_dev`
4. Copy the connection string (it will look like: `postgresql://user:password@host:5432/database?sslmode=require`)

### Option B: Neon (Free tier available)
1. Go to https://neon.tech/
2. Create a new project
3. Name it: `heirvault_dev`
4. Copy the connection string from the dashboard

### Option C: Supabase (Free tier available)
1. Go to https://supabase.com/
2. Create a new project
3. Name it: `heirvault_dev`
4. Go to Settings > Database
5. Copy the connection string (use the "Connection string" under "Connection pooling")

## STEP 2 — Update local environment

Create or update `.env.local` in the project root:

```bash
# Database connection (NEW DEV DATABASE)
DATABASE_URL="postgresql://user:password@host:5432/heirvault_dev?sslmode=require"

# Prisma Accelerate (keep existing if you have one)
PRISMA_ACCELERATE_URL="prisma://..."

# Admin bootstrap email
BOOTSTRAP_ADMIN_EMAIL="admin@heirvault.app"

# Clerk (keep existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
```

**Important**: Make sure `.env.local` is in `.gitignore` (it should be by default).

## STEP 3 — Schema configuration ✅

The schema is already configured correctly:
- `prisma.config.ts` reads `DATABASE_URL` from environment
- `prisma/schema.prisma` doesn't need the `url` line (Prisma 7 uses config file)

## STEP 4 — Apply migrations to NEW DEV database

Once you've updated `.env.local` with the new DEV database connection string, run:

```bash
# Deploy all migrations to the new database
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# If status shows "up to date", generate client
npx prisma generate --no-engine
```

## STEP 5 — If deploy fails (migration ordering issues)

If `migrate deploy` fails with errors about missing tables or out-of-order migrations:

```bash
# Backup existing migrations
mv prisma/migrations prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)

# Create fresh baseline migration
npx prisma migrate dev --name init

# Generate client
npx prisma generate --no-engine

# Verify
npx prisma migrate status
```

## STEP 6 — Verify auth gates

After the database is set up:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Sign in with Clerk using:** `admin@heirvault.app`
   - Make sure `BOOTSTRAP_ADMIN_EMAIL=admin@heirvault.app` is in `.env.local`

3. **Verify admin role in database:**
   ```bash
   npx prisma studio
   ```
   - Open the `User` table
   - Find the user with email `admin@heirvault.app`
   - Verify `roles` array contains `"ADMIN"`

4. **Verify registry permissions use clerkId:**
   - Check that `listAuthorizedRegistries()` calls use `user.clerkId`
   - Already verified in:
     - `src/app/(protected)/records/page.tsx`
     - `src/app/api/search/route.ts`
     - `src/lib/permissions.ts`

## Troubleshooting

### If migrations fail with "relation does not exist"
- This means migration history is broken
- Follow STEP 5 to squash migrations

### If Prisma client generation fails
- Make sure you're using `--no-engine` flag for Accelerate
- Check that `PRISMA_ACCELERATE_URL` is set if using Accelerate

### If admin role not appearing
- Check `BOOTSTRAP_ADMIN_EMAIL` matches the email you're signing in with
- Check console logs for "[AUDIT] Admin user bootstrapped" message
- Verify in Prisma Studio that the user was created/updated

