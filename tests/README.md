# Testing Guide

This directory contains comprehensive tests for the HeirVault application, including unit tests, integration tests, E2E tests, and security verification tests.

## Test Structure

```
tests/
├── setup.ts                    # Test environment setup
├── integration/                # Integration tests
│   ├── policies.test.ts       # Policy API tests
│   └── beneficiaries.test.ts  # Beneficiary API tests
├── rls-verification.test.ts   # RLS policy verification
├── clerk-roles.test.ts        # Clerk role enforcement
└── api-security.test.ts       # API security tests

src/lib/__tests__/
├── permissions.test.ts        # Permission function unit tests
└── listAuthorizedRegistries.test.ts  # Database query tests

e2e/
├── client-creation.spec.ts    # E2E: Client creation flow
└── permissions.spec.ts        # E2E: Permission enforcement
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Integration Tests

Integration tests require a test database. Set up a test database and configure `DATABASE_URL` in your `.env.test` file:

```bash
# Create .env.test file
DATABASE_URL="postgresql://user:password@localhost:5432/heirvault_test"
SUPABASE_URL="https://test.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="test-key"
ADMIN_EMAILS="admin@test.com"

# Run integration tests
npm test -- tests/integration
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npx playwright test --headed
```

### All Tests

```bash
# Run unit, integration, and E2E tests
npm run test:all
```

## Test Categories

### 1. Unit Tests

**Location**: `src/lib/__tests__/`

Tests individual functions in isolation with mocked dependencies:

- **`permissions.test.ts`**: Tests `canAccessRegistry`, `requireAccessRegistry`
- **`listAuthorizedRegistries.test.ts`**: Tests database query logic

**Key Test Cases**:
- Admin can access all registries
- Attorney can only access authorized registries
- System role has full access
- Unauthorized access returns 403
- Unknown roles are denied

### 2. Integration Tests

**Location**: `tests/integration/`

Tests API routes with real database interactions:

- **`policies.test.ts`**: Tests `/api/policies` route
- **`beneficiaries.test.ts`**: Tests `/api/beneficiaries` route

**Key Test Cases**:
- Policy creation with valid data
- Policy creation with missing fields (validation)
- Beneficiary creation and retrieval
- Authorization checks in API routes

### 3. E2E Tests

**Location**: `e2e/`

Tests complete user flows in a real browser:

- **`client-creation.spec.ts`**: Full client creation workflow
- **`permissions.spec.ts`**: Permission enforcement in UI

**Key Test Cases**:
- Create client → Create policy → Create beneficiary
- Unauthorized access prevention
- Search result filtering
- Form validation

### 4. Security Tests

**Location**: `tests/`

Tests security-critical functionality:

- **`rls-verification.test.ts`**: Verifies Supabase RLS policies
- **`clerk-roles.test.ts`**: Verifies Clerk role enforcement
- **`api-security.test.ts`**: Verifies API permission checks

**Key Test Cases**:
- RLS policies are enabled
- Unique constraints prevent duplicates
- `user_has_registry_permission` function works correctly
- `ADMIN_EMAILS` is respected
- Permission bypass attempts fail

## Test Data Management

### Setup and Teardown

Tests use `beforeAll` and `afterAll` hooks to:
1. Create test data (users, clients, registries, permissions)
2. Run tests
3. Clean up test data

### Test Isolation

Each test should be independent:
- Use unique identifiers (timestamps, UUIDs)
- Clean up after each test
- Don't rely on test execution order

## Mocking

### Clerk Authentication

```typescript
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
```

### Database

For unit tests, mock database functions:
```typescript
vi.mock("@/lib/db", () => ({
  listAuthorizedRegistries: vi.fn(),
  getRegistryById: vi.fn(),
}));
```

For integration tests, use a real test database.

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    npm install
    npm run test
    npm run test:e2e
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for permission functions
- **Integration Tests**: All API routes covered
- **E2E Tests**: Critical user flows covered

## Troubleshooting

### Tests failing due to database connection

Ensure test database is running and `DATABASE_URL` is set correctly.

### Clerk mocks not working

Check that Clerk mocks are set up before tests run. Use `vi.doMock` for dynamic imports.

### RLS tests failing

RLS policies use service role, which bypasses RLS. Tests verify structure and constraints, not RLS enforcement (which requires Supabase Auth).

## Best Practices

1. **Test one thing per test**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should clearly describe what they test
3. **Clean up**: Always clean up test data in `afterAll`
4. **Mock external services**: Don't make real API calls in tests
5. **Test edge cases**: Include tests for error conditions and boundary cases

