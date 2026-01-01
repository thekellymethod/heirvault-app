# Security Utilities

This directory contains security utilities to prevent common attacks:

## Sanitization (`sanitize.ts`)

**Prevents XSS and code injection attacks**

### Usage Examples:

```typescript
import { sanitizeString, sanitizeSql, sanitizeEmail } from "@/lib/security/sanitize";

// Sanitize user input for display
const safeName = sanitizeString(userInput);

// Sanitize for SQL queries (use Prisma when possible, but if you must use raw SQL)
const safeSearch = sanitizeSql(searchTerm);

// Validate and sanitize email
const email = sanitizeEmail(userInput); // Returns null if invalid
```

## Validation (`validate.ts`)

**Validates input types, formats, and constraints**

### Usage Examples:

```typescript
import { validateString, validateEmail, validateFields } from "@/lib/security/validate";

// Validate a string field
const result = validateString(formData.name, "Name", {
  required: true,
  minLength: 2,
  maxLength: 100,
});

if (!result.valid) {
  return NextResponse.json({ errors: result.errors }, { status: 400 });
}

// Validate multiple fields
const validation = validateFields([
  validateString(formData.firstName, "First Name", { required: true }),
  validateString(formData.lastName, "Last Name", { required: true }),
  validateEmail(formData.email, "Email", true),
]);

if (!validation.valid) {
  return NextResponse.json({ errors: validation.errors }, { status: 400 });
}
```

## Rate Limiting (`rateLimit.ts`)

**Prevents abuse and DoS attacks**

Rate limiting is automatically applied in middleware for all API routes:
- Authenticated users: 200 requests/minute
- Anonymous users: 50 requests/minute

### Manual Usage (if needed):

```typescript
import { rateLimit, getRateLimitKey } from "@/lib/security/rateLimit";

const key = getRateLimitKey(req, userId);
const result = rateLimit(key, 100, 60_000); // 100 requests per minute

if (!result.allowed) {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    { status: 429 }
  );
}
```

## SQL Injection Prevention

**ALWAYS use Prisma's parameterized queries instead of raw SQL when possible.**

### ✅ GOOD (Prisma - automatically safe):
```typescript
const users = await prisma.user.findMany({
  where: {
    email: userInput, // Prisma automatically escapes this
  },
});
```

### ✅ ACCEPTABLE (Raw SQL with parameters):
```typescript
import { sanitizeSql } from "@/lib/security/sanitize";

const searchTerm = sanitizeSql(userInput);
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = $1`,
  searchTerm // Use parameterized queries, not string interpolation
);
```

### ❌ BAD (Never do this):
```typescript
// NEVER interpolate user input directly into SQL
const query = `SELECT * FROM users WHERE email = '${userInput}'`; // SQL INJECTION RISK!
```

## Best Practices

1. **Always sanitize user input** before storing or displaying
2. **Always validate input** before processing
3. **Use Prisma** for database queries (it prevents SQL injection automatically)
4. **Rate limit API endpoints** (already done in middleware)
5. **Never trust client-side validation** - always validate on the server
6. **Use parameterized queries** if you must use raw SQL
7. **Escape output** when rendering user-generated content

## Security Headers

Security headers are configured in `next.config.mjs`:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- And more...

These are automatically applied to all responses.
