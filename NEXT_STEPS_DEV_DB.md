# Next Steps: DEV Database Setup

## Current Status ✅
- ✅ Schema configured correctly (Prisma 7 uses `prisma.config.ts`)
- ✅ `.env.local` file exists
- ✅ Migration files ready

## Action Required: Create New DEV Database

**You need to create a new PostgreSQL database for development.** 

### Quick Options:

1. **Prisma Postgres** (Easiest - same provider you're using)
   - Go to: https://console.prisma.io/
   - Create new database project: `heirvault_dev`
   - Copy connection string

2. **Neon** (Free tier, fast setup)
   - Go to: https://neon.tech/
   - Create new project: `heirvault_dev`
   - Copy connection string

3. **Supabase** (Free tier, includes other features)
   - Go to: https://supabase.com/
   - Create new project: `heirvault_dev`
   - Copy connection string from Settings > Database

## Once You Have the Connection String:

1. **Update `.env.local`** with the new DEV database:
   ```bash
   DATABASE_URL="postgresql://user:password@host:5432/heirvault_dev?sslmode=require"
   ```

2. **Then run these commands:**
   ```bash
   # Try to apply existing migrations
   npx prisma migrate deploy
   
   # Check status
   npx prisma migrate status
   
   # If successful, generate client
   npx prisma generate --no-engine
   ```

3. **If migrations fail** (due to ordering), we'll squash them:
   ```bash
   # Backup migrations
   mv prisma/migrations prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)
   
   # Create fresh baseline
   npx prisma migrate dev --name init
   
   # Generate client
   npx prisma generate --no-engine
   ```

## After Database is Ready:

1. Start dev server: `npm run dev`
2. Sign in with `admin@heirvault.app`
3. Verify admin role in database using `npx prisma studio`

---

**Ready to proceed?** Once you've created the new DEV database and updated `.env.local`, let me know and I'll run the migration commands.

