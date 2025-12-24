# Deployment Guide

## Prisma Requirements for Deployment

**Yes, you need Prisma to deploy this site**, but the setup depends on your deployment platform.

### What Prisma Does

1. **Prisma Client** (`@prisma/client`) - Required at runtime
   - Generated from your schema
   - Used by your application code to query the database
   - Already in `dependencies` in `package.json` ✅

2. **Prisma CLI** (`prisma`) - Required for migrations
   - Used to generate the client and run migrations
   - Already in `devDependencies` in `package.json` ✅

### Deployment Steps

#### Option 1: Vercel (Recommended - Automatic)

Vercel automatically:
1. Runs `prisma generate` during build
2. Can run migrations via build command

**Add to `package.json` scripts:**
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

**For migrations**, add a build command in Vercel:
- Build Command: `prisma migrate deploy && next build`
- Or use Vercel's environment variables to run migrations separately

#### Option 2: Manual Deployment

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Run Database Migrations:**
   ```bash
   npx prisma migrate deploy
   ```
   ⚠️ **Important**: Use `migrate deploy` (not `migrate dev`) in production

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

### Required Environment Variables

Make sure these are set in your deployment platform:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# App URL (your production domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email (Resend)
RESEND_API_KEY=your_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Stripe (if using billing)
STRIPE_SECRET_KEY=your_key
STRIPE_WEBHOOK_SECRET=your_secret
```

### Database Setup

1. **Create your production database** (Neon, Supabase, AWS RDS, etc.)
2. **Get the connection string** (DATABASE_URL)
3. **Run migrations** to create all tables:
   ```bash
   npx prisma migrate deploy
   ```

### Important Notes

- ✅ **Prisma Client is required** - Your code uses `prisma` to query the database
- ✅ **Migrations are required** - Your database needs the schema from `prisma/migrations`
- ⚠️ **Never run `prisma db pull`** - It overwrites your schema (see `DO_NOT_RUN_DB_PULL.md`)
- ✅ **Use `prisma generate`** - Generates the client from your schema
- ✅ **Use `prisma migrate deploy`** - Applies migrations in production (not `migrate dev`)

### Quick Deployment Checklist

- [ ] Database created and connection string ready
- [ ] Environment variables configured in deployment platform
- [ ] Prisma Client generation added to build process
- [ ] Database migrations run (`prisma migrate deploy`)
- [ ] Build succeeds (`npm run build`)
- [ ] Application starts successfully

### Troubleshooting

**Error: "Cannot find module '@prisma/client'"**
- Solution: Run `npx prisma generate` before building

**Error: "Table does not exist"**
- Solution: Run `npx prisma migrate deploy` to create tables

**Error: "The column does not exist"**
- Solution: Your Prisma client is out of sync. Run `npx prisma generate` and rebuild

