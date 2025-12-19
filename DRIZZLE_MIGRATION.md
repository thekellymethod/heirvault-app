# Drizzle ORM Migration

This project has been migrated from Prisma to Drizzle ORM.

## What Changed

### Dependencies
- ✅ Removed: `@prisma/client`, `@prisma/adapter-pg`, `prisma`
- ✅ Added: `drizzle-orm`, `drizzle-kit`

### Files Migrated
1. **Database Schema**: `src/lib/db/schema.ts` - Complete Drizzle schema definition
2. **Database Client**: `src/lib/db/index.ts` - Drizzle client setup
3. **User Management**: `src/lib/utils/clerk.ts` - `getCurrentUser()` migrated
4. **Authorization**: `src/lib/authz.ts` - `getCurrentUserWithOrg()` migrated
5. **API Routes**: `src/app/api/clients/[id]/route.ts` - Client GET endpoint migrated

### Configuration
- **Drizzle Config**: `drizzle.config.ts` - Configuration for Drizzle Kit
- **Database Export**: `src/lib/db.ts` - Exports Drizzle client as `db` and `prisma` (for compatibility)

## Usage

### Database Queries

```typescript
import { db, users, eq } from '@/lib/db';

// Find user
const [user] = await db.select()
  .from(users)
  .where(eq(users.clerkId, userId))
  .limit(1);

// Create user
const [newUser] = await db.insert(users)
  .values({ clerkId, email, firstName, lastName, role: 'attorney' })
  .returning();

// Update user
const [updated] = await db.update(users)
  .set({ firstName, lastName, updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();
```

### Available Query Helpers

Exported from `@/lib/db`:
- `eq`, `and`, `or`, `inArray` - Where conditions
- `asc`, `desc` - Ordering
- `sql` - Raw SQL when needed

## Migration Commands

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## Remaining Prisma References

Some files may still reference Prisma. These need to be migrated:
- Other API routes in `src/app/api/`
- Any files importing from `@/lib/db` that use Prisma syntax

## Benefits

1. **No Code Generation**: Drizzle doesn't require code generation step
2. **Better TypeScript**: Full type inference without generation
3. **More Control**: Direct SQL when needed, type-safe queries otherwise
4. **Smaller Bundle**: No generated client code
5. **Faster**: No client generation step in build process

