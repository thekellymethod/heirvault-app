# Pre-Deployment Checklist

**Purpose**: Reusable checklist to verify production readiness before each deployment.

**Last Updated**: 2025-01-XX

---

## ✅ Pre-Deployment Verification

### 1. Environment Variables

- [ ] All required environment variables are set in production (Vercel/your hosting platform)
- [ ] `.env.example` is up to date with all required variables
- [ ] No secrets are committed to version control
- [ ] Run `npm run validate:env` locally to verify env structure

**Required Variables**:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `HEIRVAULT_TOKEN_SECRET`

### 2. Code Quality

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run typecheck` - review TypeScript errors (note: pre-existing type errors don't block deployment, but should be addressed)
- [ ] All tests pass: `npm run test:all` (if applicable)
- [ ] CI pipeline passes on GitHub (build step should pass even with type errors)
- [ ] **Note**: TypeScript errors are non-blocking for deployment. The `build` command succeeds despite type errors. Consider fixing incrementally in future iterations.

### 3. Build Verification

- [ ] Run `npm ci` to install dependencies
- [ ] Run `npm run build` - build succeeds
- [ ] Build output is clean (no warnings about missing env vars)
- [ ] Production build size is reasonable

### 4. Supabase Database

- [ ] All migrations are applied to production database
- [ ] Migration files are in `supabase/migrations/` directory
- [ ] RLS policies are enabled on sensitive tables
- [ ] Storage buckets exist:
  - [ ] `heirvault-files` (or configured bucket name)
  - [ ] `heirvault-registry` (if used)
  - [ ] `policy-submissions` (if used)
- [ ] Storage bucket policies are configured (private by default)
- [ ] Test database connection: `supabase db ping` (if CLI configured)

### 5. Security Checks

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client code
- [ ] Service role key is only used in server-side API routes
- [ ] No hardcoded secrets in codebase
- [ ] RLS is enabled on all user-facing tables
- [ ] CORS is properly configured (not wildcarded for sensitive endpoints)
- [ ] Security headers are configured in `next.config.mjs`

### 6. Health Check

- [ ] `/api/health` endpoint returns 200 OK
- [ ] Health check verifies:
  - [ ] Database connectivity
  - [ ] Supabase API connectivity
  - [ ] Environment variables are set

### 7. Documentation

- [ ] `README.md` is up to date
- [ ] `DEPLOYMENT_REPORT.md` has latest deployment steps
- [ ] Environment variable documentation is accurate

### 8. Monitoring & Observability

- [ ] Sentry is configured (if using)
- [ ] Error tracking is working
- [ ] Health check endpoint is accessible
- [ ] Logging is configured appropriately

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run checks
npm run lint
npm run typecheck
npm run validate:env

# 4. Build locally (verify it works)
npm run build
```

### Step 2: Supabase Migrations

```bash
# Option A: Using Supabase CLI (recommended)
# Ensure you're logged in: supabase login
# Link project: supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option B: Manual migration via Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Run each migration file in order from supabase/migrations/
```

**Migration Order**:
1. `create_policy_submissions_table.sql`
2. `add_registry_permissions.sql`
3. `add_organization_scope_to_registry_permissions.sql`
4. `security_hardening_registry_permissions.sql`

### Step 3: Deploy Application

**Vercel**:
```bash
# Via CLI
vercel --prod

# Or push to main branch (if auto-deploy is enabled)
git push origin main
```

**Other Platforms**: Follow platform-specific deployment instructions.

### Step 4: Post-Deployment Verification

```bash
# 1. Check health endpoint
curl https://your-domain.com/api/health

# 2. Verify environment variables
# Check Vercel dashboard → Settings → Environment Variables

# 3. Test critical flows:
# - Sign up / Sign in
# - Create client
# - Upload document
# - Generate receipt
```

---

## 🔄 Rollback Procedure

If deployment fails:

1. **Revert code**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Revert database migrations** (if needed):
   - ⚠️ **Warning**: Database rollbacks are not always reversible
   - Review migration files to determine if rollback is safe
   - If rollback is needed, create reverse migration SQL
   - Apply via Supabase Dashboard → SQL Editor

3. **Redeploy previous version**:
   - Vercel: Go to Deployments → Select previous deployment → Promote to Production

---

## 📋 Quick Reference

### Required Commands

```bash
# Pre-deploy checks
npm run lint && npm run typecheck && npm run validate:env && npm run build

# Supabase migrations
supabase db push

# Health check
curl https://your-domain.com/api/health
```

### Critical Files

- `.env.example` - Environment variable template
- `src/lib/env.ts` - Environment validation
- `supabase/migrations/` - Database migrations
- `src/app/api/health/route.ts` - Health check endpoint
- `next.config.mjs` - Next.js configuration

---

## ⚠️ Common Issues

### Build Fails with Missing Env Vars

- Ensure all required env vars are set in Vercel/hosting platform
- Run `npm run validate:env` locally to check

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check if using connection pooling (port 6543) vs direct (port 5432)
- Ensure database is accessible from hosting platform

### Supabase Storage Errors

- Verify storage buckets exist in Supabase Dashboard
- Check bucket names match environment variables
- Ensure `SUPABASE_SERVICE_ROLE_KEY` has storage access

### RLS Policy Errors

- Review RLS policies in Supabase Dashboard
- Ensure service role is used for server-side operations
- Check that policies allow necessary operations

---

**Note**: This checklist should be reviewed and updated before each major deployment.
