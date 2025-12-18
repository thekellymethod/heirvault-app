# ⚠️ CRITICAL: DO NOT RUN `prisma db pull`

## The Problem

Running `npx prisma db pull` **OVERWRITES** the `prisma/schema.prisma` file and changes:
- `model User` → `model users` (lowercase)
- Removes all `@map` directives
- Breaks the Prisma client generation

## The Solution

**NEVER run `prisma db pull`** unless you want to completely break the schema.

Instead:
1. Make changes directly in `prisma/schema.prisma`
2. Run `npx prisma migrate dev` to create migrations
3. Run `npx prisma generate` to regenerate the client

## If You Accidentally Ran `db pull`

1. Restore the schema from git: `git checkout prisma/schema.prisma`
2. Run `npx prisma generate`
3. Clear all caches and restart

