# Deployment Gate Documentation

This document describes the deployment gate system that ensures clean, validated deployments to Vercel.

## Overview

The deployment gate system prevents deployments with:
- TypeScript errors
- ESLint errors
- Missing environment variables
- Database migration issues
- Missing runtime declarations

## Components

### 1. Package Scripts

Added to `package.json`:

- **`typecheck`**: Runs TypeScript compiler in check mode (`tsc --noEmit`)
- **`predeploy`**: Runs before deployment: `lint && typecheck && db:status && db:deploy`
- **`db:status`**: Checks Prisma migration status (`prisma migrate status`)
- **`db:deploy`**: Applies pending migrations (`prisma migrate deploy`)

### 2. Next.js Configuration

Updated `next.config.mjs` to enforce strict checks:

```javascript
typescript: {
  ignoreBuildErrors: false,  // Fail build on TS errors
},
eslint: {
  ignoreDuringBuilds: false, // Fail build on lint errors
},
```

### 3. Environment Validation

Created `src/lib/env.ts` with:

- **`validateEnv()`**: Validates all required environment variables
- **`getRequiredEnv()`**: Gets required env var or throws
- **`getOptionalEnv()`**: Gets optional env var safely

**Required Variables:**
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

**Validation Behavior:**
- Automatically validates in production
- Can be enabled in dev with `VALIDATE_ENV=true`
- Throws on missing variables to prevent deployment

### 4. Runtime Declarations

All API routes using Prisma or Node.js crypto must declare:

```typescript
export const runtime = "nodejs";
```

**Routes Updated:**
- `/api/policies`
- `/api/qr-update/[token]`
- `/api/invite/[token]/update-client`
- `/api/policy-intake/submit`
- `/api/invite/[token]/upload-policy`
- `/api/invite/[token]/process-update-form`
- All admin routes (already had it)
- `/api/health` (new)

### 5. GitHub Actions CI

Created `.github/workflows/ci.yml` that runs on every push/PR:

1. **Install dependencies** (`npm ci`)
2. **Run ESLint** (`npm run lint`)
3. **Type check** (`npm run typecheck`)
4. **Validate Prisma schema** (`prisma validate`)
5. **Generate Prisma Client** (`prisma generate`)
6. **Build Next.js** (`npm run build`)

All steps must pass for CI to succeed.

### 6. Health Check Endpoint

Created `/api/health` route:

- **Runtime**: `nodejs`
- **Checks**: Prisma database connection
- **Response**: 
  - `200 OK` with `{ ok: true, status: "healthy" }` if healthy
  - `503 Service Unavailable` with error details if unhealthy

Use this endpoint for:
- Vercel health checks
- Monitoring/alerting
- Load balancer health checks

## Usage

### Pre-Deployment Checklist

Before deploying to Vercel:

1. ✅ Run `npm run predeploy` locally
2. ✅ Ensure all environment variables are set in Vercel
3. ✅ Verify migrations are up to date
4. ✅ Check that CI passes on GitHub

### Vercel Configuration

In Vercel dashboard:

1. Set **Build Command**: `npm run build` (default)
2. Set **Install Command**: `npm ci` (recommended)
3. Configure all required environment variables
4. Enable **Health Check**: `/api/health`

### Environment Variables

Required in production:

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Optional but recommended:

```bash
HEIRVAULT_TOKEN_SECRET=...
PRISMA_ACCELERATE_URL=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
```

### Manual Validation

To manually validate environment:

```bash
VALIDATE_ENV=true npm run build
```

This will throw if any required variables are missing.

## Troubleshooting

### Build Fails with TypeScript Errors

1. Run `npm run typecheck` locally
2. Fix all TypeScript errors
3. Ensure all imports are correct

### Build Fails with ESLint Errors

1. Run `npm run lint` locally
2. Fix all linting errors
3. Check for accessibility issues

### Build Fails with Missing Env Vars

1. Check Vercel environment variables
2. Ensure all required vars are set
3. Run `VALIDATE_ENV=true npm run build` locally

### Database Migration Issues

1. Run `npm run db:status` to check migration state
2. Run `npm run db:deploy` to apply pending migrations
3. Ensure `DATABASE_URL` is correct

### Health Check Fails

1. Check `/api/health` endpoint
2. Verify Prisma connection
3. Check database is accessible from Vercel

## Best Practices

1. **Always run `predeploy` before pushing to main**
2. **Never ignore TypeScript or ESLint errors**
3. **Keep environment variables documented**
4. **Test health endpoint after deployment**
5. **Monitor CI status on all PRs**

## Related Files

- `package.json` - Scripts and dependencies
- `next.config.mjs` - Build configuration
- `src/lib/env.ts` - Environment validation
- `src/app/api/health/route.ts` - Health check endpoint
- `.github/workflows/ci.yml` - CI pipeline
- `prisma/schema.prisma` - Database schema

