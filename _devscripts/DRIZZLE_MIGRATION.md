# Drizzle ORM Migration (ARCHIVED)

> **⚠️ ARCHIVED**: This document describes a migration that was attempted but later reversed. The project currently uses **Prisma ORM**, not Drizzle. This file is kept for historical reference only.

## Historical Context

This project was briefly migrated from Prisma to Drizzle ORM, but the migration was later reversed. The project now uses Prisma ORM as the primary database client.

## Current State

- **ORM**: Prisma ORM
- **Schema**: `prisma/schema.prisma`
- **Client**: `src/lib/prisma.ts` exports `prisma` client
- **Database Export**: `src/lib/db/index.ts` re-exports Prisma client

## For Current Development

See `README.md` for current database setup and usage instructions.

---

## Archived Migration Details (Historical Reference Only)

### What Changed (During Migration)

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
