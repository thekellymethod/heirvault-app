# Test Setup Guide

This guide walks you through setting up the test environment for HeirVault.

## Prerequisites

- Node.js 20+
- PostgreSQL database (local or managed)
- Clerk account (for authentication testing)
- Supabase account (for registry tests)

## Step 1: Create Test Database

### Option A: Local PostgreSQL

```bash
# Create test database
createdb heirvault_test

# Or using psql
psql -U postgres -c "CREATE DATABASE heirvault_test;"
```

### Option B: Managed Database (Neon, Supabase, etc.)

1. Create a new project/database in your provider
2. Copy the connection string
3. Use it in `.env.test` (see Step 2)

## Step 2: Configure Environment Variables

1. Copy `.env.test.example` to `.env.test`:
   ```bash
   cp .env.test.example .env.test
   ```

2. Fill in your test database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/heirvault_test"
   ```

3. Configure Clerk test keys:
   - Go to Clerk Dashboard → Your App → API Keys
   - Copy the test publishable key and secret key
   - Add them to `.env.test`:
     ```env
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
     CLERK_SECRET_KEY="sk_test_..."
     ```

4. Configure Supabase (for registry tests):
   ```env
   SUPABASE_URL="https://your-test-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-test-service-role-key"
   ```

5. Set admin emails for testing:
   ```env
   ADMIN_EMAILS="admin@test.com,test-admin@example.com"
   ```

## Step 3: Run Database Migrations

### Using the setup script:

**Linux/Mac:**
```bash
chmod +x scripts/setup-test-db.sh
./scripts/setup-test-db.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\setup-test-db.ps1
```

### Manual setup:

```bash
# Load test environment
export $(cat .env.test | xargs)

# Run migrations
npm run db:migrate
```

## Step 4: Verify Setup

Run a simple test to verify everything works:

```bash
# Load test environment variables
export $(cat .env.test | xargs)

# Run unit tests
npm test
```

You should see tests passing. If you see errors, check:
- Database connection string is correct
- Database exists and is accessible
- Migrations have been run

## Step 5: Run All Tests

```bash
# Unit tests
npm test

# Integration tests (requires database)
npm test -- tests/integration

# E2E tests (requires running app)
npm run test:e2e

# All tests
npm run test:all
```

## Clerk Test Mode

For E2E tests, you have two options:

### Option A: Use Clerk Test Mode (Recommended)

1. In Clerk Dashboard, enable test mode
2. Use test API keys in `.env.test`
3. Tests will use real Clerk authentication

### Option B: Mock Authentication

The test setup includes Clerk mocks. For E2E tests, you may need to:

1. Use Playwright's authentication state storage
2. Sign in once and save the session
3. Reuse the session for subsequent tests

See `e2e/auth.setup.ts` (create this file) for an example.

## Troubleshooting

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check database is running (if local)
- Verify network access (if remote)
- Check SSL mode matches your database configuration

### Clerk Authentication Errors

- Verify test API keys are correct
- Check Clerk test mode is enabled
- Ensure redirect URLs are configured in Clerk Dashboard

### Migration Errors

- Ensure database is empty or migrations are idempotent
- Check migration files are in `supabase/migrations/`
- Verify database user has CREATE/ALTER permissions

### Test Failures

- Check test output for specific error messages
- Verify environment variables are loaded
- Ensure test data is cleaned up between tests
- Check for race conditions in parallel tests

## CI/CD Setup

The GitHub Actions workflow (`.github/workflows/test.yml`) is configured to:

1. Run unit tests
2. Set up PostgreSQL service for integration tests
3. Run integration tests
4. Run E2E tests
5. Run security tests

### Required Secrets

Add these secrets to your GitHub repository:

- `TEST_DATABASE_URL` - Test database connection string
- `TEST_SUPABASE_URL` - Test Supabase project URL
- `TEST_SUPABASE_SERVICE_ROLE_KEY` - Test Supabase service role key
- `TEST_CLERK_SECRET_KEY` - Clerk test secret key
- `TEST_CLERK_PUBLISHABLE_KEY` - Clerk test publishable key

### Adding Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with the value from your `.env.test` file

## Best Practices

1. **Separate Test Database**: Always use a separate database for tests
2. **Clean Up**: Tests should clean up after themselves
3. **Isolation**: Each test should be independent
4. **Mock External Services**: Don't make real API calls in unit tests
5. **Use Test Data**: Create test data in `beforeAll`, clean up in `afterAll`

## Next Steps

- Review `tests/README.md` for detailed test documentation
- Check `tests/verification-checklist.md` for security verification
- Run `npm run test:coverage` to see code coverage
- Set up pre-commit hooks to run tests automatically

