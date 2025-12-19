# Deployment Readiness Checklist

## ✅ Completed Features

### Database & Data Separation
- [x] Client fingerprinting system to prevent duplicates
- [x] Unique constraints on email and fingerprint
- [x] Address fields for proper data separation
- [x] Composite indexes for efficient searching
- [x] Raw SQL fallbacks for all Prisma operations

### Navigation & UI
- [x] Removed "Policies" tab from sidebar
- [x] Combined beneficiaries with client policies page
- [x] Beneficiaries shown per policy on policies page
- [x] Beneficiaries page shows policies for each beneficiary

### Search & Access
- [x] Global client search (all attorneys can search all clients)
- [x] Global policy search
- [x] Global beneficiary search
- [x] All attorneys have global access to all client data

### API Routes
- [x] All routes use raw SQL first with Prisma fallback
- [x] Error handling for database operations
- [x] Global access checks implemented

## 🔧 Pre-Deployment Steps

### 1. Environment Variables
Ensure these are set in your deployment platform:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Stripe (if using billing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### 2. Database Setup
1. Create production database (Neon, Supabase, AWS RDS, etc.)
2. Get connection string (DATABASE_URL)
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### 3. Build Configuration
The `package.json` already includes:
- `postinstall: "prisma generate"` - Auto-generates Prisma client
- `build: "prisma generate && next build"` - Ensures client is generated before build

### 4. Migration Files
All migrations are in `prisma/migrations/`:
- Initial schema
- Client identity fields
- Document model
- Client fingerprint and separation (newest)

**Important**: Run `npx prisma migrate deploy` in production (NOT `migrate dev`)

## 🚀 Deployment Platforms

### Vercel (Recommended)
1. Connect your Git repository
2. Set environment variables in Vercel dashboard
3. Add build command: `prisma generate && next build`
4. Add install command: `npm install && prisma generate`
5. Deploy

### Other Platforms
1. Set environment variables
2. Run `npx prisma migrate deploy` (one-time, or in build script)
3. Run `npm run build`
4. Start with `npm start`

## ✅ Final Checks

- [ ] All environment variables configured
- [ ] Database migrations applied (`prisma migrate deploy`)
- [ ] Prisma client generated (`prisma generate`)
- [ ] Build succeeds (`npm run build`)
- [ ] Application starts without errors
- [ ] Authentication works (Clerk)
- [ ] Client search works globally
- [ ] Beneficiaries display correctly with policies
- [ ] Policies show beneficiaries inline

## 📝 Notes

- **Prisma Client**: Required at runtime, auto-generated via `postinstall` script
- **Migrations**: Must be run before first deployment
- **Raw SQL Fallbacks**: All critical routes have raw SQL fallbacks for reliability
- **Global Access**: All attorneys can view all clients globally
- **Data Separation**: Client fingerprinting prevents duplicates while allowing legitimate duplicates

## 🐛 Troubleshooting

**Build fails with "Cannot find module '@prisma/client'"**
- Solution: Ensure `postinstall` script runs: `npm install` should auto-generate

**Database errors after deployment**
- Solution: Run `npx prisma migrate deploy` to apply all migrations

**Search not working**
- Solution: Check that global search routes use raw SQL (already implemented)

**Beneficiaries not showing with policies**
- Solution: Verify `policy_beneficiaries` table exists and has data

