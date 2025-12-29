# Prisma 7 Configuration Migration

## What Changed

Prisma 7 moved connection URLs from `schema.prisma` to `prisma.config.ts`.

## Updated Files

### `prisma/schema.prisma`

**Before (Prisma 6):**
```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  accelerateUrl = env("PRISMA_ACCELERATE_URL")
}
```

**After (Prisma 7):**
```prisma
datasource db {
  provider = "postgresql"
  // Connection URLs are now in prisma.config.ts
}
```

### `prisma.config.ts`

**Updated configuration:**
```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For migrations, use DIRECT_URL (direct connection)
    adapter: {
      url: env("DIRECT_URL"),
    },
  },
});
```

## Environment Variables

You still need all three environment variables:

- `DATABASE_URL` - Used by PrismaClient for runtime queries (Supabase pooled)
- `DIRECT_URL` - Used for migrations (Supabase direct connection)
- `PRISMA_ACCELERATE_URL` - Passed to PrismaClient constructor in code

## How It Works

1. **Migrations** use `DIRECT_URL` from `prisma.config.ts` → `adapter.url`
2. **Runtime queries** use `DATABASE_URL` or `PRISMA_ACCELERATE_URL` (passed to PrismaClient constructor)
3. **Accelerate** is configured in your code (`src/lib/prisma.ts`), not in config files

## Verification

After updating, test migrations:

```bash
npx prisma migrate status
```

Should work without errors about datasource properties.

