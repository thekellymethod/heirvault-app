# Testing Documentation

This document provides a quick reference for running and understanding tests in HeirVault.

## Quick Start

```bash
# 1. Set up test database
cp .env.test.example .env.test
# Edit .env.test with your test database credentials

# 2. Run database migrations
npm run db:migrate

# 3. Run tests
npm test
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit tests |
| `npm run test:ui` | Run tests with interactive UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests with Playwright |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:all` | Run all tests (unit + E2E) |

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── integration/                # Integration tests
│   ├── policies.test.ts       # Policy API tests
│   └── beneficiaries.test.ts  # Beneficiary API tests
├── rls-verification.test.ts   # RLS policy tests
├── clerk-roles.test.ts        # Clerk role tests
└── api-security.test.ts       # API security tests

src/lib/__tests__/
├── permissions.test.ts        # Permission function tests
└── listAuthorizedRegistries.test.ts  # Database query tests

e2e/
├── client-creation.spec.ts    # E2E: Client creation
└── permissions.spec.ts        # E2E: Permission enforcement
```

## Environment Setup

### Required Environment Variables

Create `.env.test` file with:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/heirvault_test"
SUPABASE_URL="https://test-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
ADMIN_EMAILS="admin@test.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

1. **Create test database:**
   ```bash
   createdb heirvault_test
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Verify setup:**
   ```bash
   npm test
   ```

## Test Categories

### Unit Tests

Test individual functions in isolation:

- **Permission Functions**: `canAccessRegistry`, `requireAccessRegistry`
- **Database Queries**: `listAuthorizedRegistries`
- **Role Checks**: `isAdmin`, `requireAdmin`

**Location**: `src/lib/__tests__/`

### Integration Tests

Test API routes with real database:

- **Policy API**: Create, read policies
- **Beneficiary API**: Create, read beneficiaries
- **Authorization**: Verify access control

**Location**: `tests/integration/`

### E2E Tests

Test complete user flows:

- **Client Creation**: Full workflow from form to database
- **Permission Enforcement**: UI-level access control
- **Search**: End-to-end search functionality

**Location**: `e2e/`

### Security Tests

Verify security-critical functionality:

- **RLS Policies**: Database-level security
- **Clerk Roles**: Authentication enforcement
- **API Security**: Permission bypass prevention

**Location**: `tests/`

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Workflow**: `.github/workflows/test.yml`

### Required GitHub Secrets

- `TEST_DATABASE_URL`
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`
- `TEST_CLERK_SECRET_KEY`
- `TEST_CLERK_PUBLISHABLE_KEY`

## Troubleshooting

### Tests Failing

1. **Check environment variables**: Ensure `.env.test` is configured
2. **Verify database**: Ensure test database exists and is accessible
3. **Run migrations**: Ensure database schema is up to date
4. **Check logs**: Review test output for specific errors

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check database is running (if local)
- Verify network access (if remote)
- Check SSL mode matches configuration

### Clerk Authentication Errors

- Verify test API keys are correct
- Check Clerk test mode is enabled
- Ensure redirect URLs are configured

## Coverage Goals

- **Unit Tests**: 80%+ coverage for permission functions
- **Integration Tests**: All API routes covered
- **E2E Tests**: Critical user flows covered

## Additional Resources

- **Detailed Guide**: `tests/TEST_SETUP.md`
- **Test Documentation**: `tests/README.md`
- **Security Checklist**: `tests/verification-checklist.md`

