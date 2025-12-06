# Project Structure Analysis

Based on [Next.js project structure conventions](https://nextjs.org/docs/app/getting-started/project-structure), here's the current structure and recommendations.

## Current Structure

```
heir-registry/
├── src/
│   ├── app/                    # App Router (routing)
│   │   ├── api/                # API routes
│   │   │   ├── clients/
│   │   │   └── invites/
│   │   ├── auth/               # ⚠️ Old auth pages (should use Clerk)
│   │   ├── dashboard/
│   │   ├── invite/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/                    # Shared utilities
│   │   ├── supabase/           # ⚠️ Old Supabase code (can be removed)
│   │   └── utils/
│   ├── types/
│   └── middleware.ts
├── prisma/
└── public/
```

## Recommended Improvements

### 1. Clean Up Old Code

**Remove Supabase files** (no longer needed):
- `src/lib/supabase/` - Entire directory
- `src/lib/utils/auth.ts` - Old Supabase auth
- `src/app/auth/` - Replace with Clerk components

### 2. Use Route Groups for Organization

According to Next.js docs, route groups `(folderName)` help organize routes without affecting URLs:

```
src/app/
├── (auth)/              # Route group for auth-related pages
│   └── sign-in/         # Clerk's sign-in (or custom)
│   └── sign-up/         # Clerk's sign-up (or custom)
├── (dashboard)/         # Route group for dashboard
│   ├── layout.tsx       # Dashboard-specific layout
│   ├── dashboard/
│   │   ├── clients/
│   │   ├── policies/
│   │   └── beneficiaries/
│   └── invite/
└── (marketing)/         # Route group for public pages
    └── page.tsx         # Landing page
```

### 3. Use Private Folders for Non-Routable Code

Use `_folder` prefix for internal utilities that shouldn't be routes:

```
src/app/
├── (dashboard)/
│   ├── _components/     # Private: dashboard-specific components
│   ├── _lib/            # Private: dashboard utilities
│   └── dashboard/
```

### 4. Colocate Route-Specific Code

Next.js allows colocating files in route segments:

```
src/app/(dashboard)/dashboard/clients/
├── _components/         # Client-specific components
│   ├── ClientForm.tsx
│   └── ClientList.tsx
├── [id]/
│   ├── page.tsx
│   └── _components/
│       └── ClientDetails.tsx
└── page.tsx
```

## Recommended Structure

```
heir-registry/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Route group: auth pages
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx     # Clerk SignIn component
│   │   │   └── sign-up/
│   │   │       └── page.tsx     # Clerk SignUp component
│   │   │
│   │   ├── (dashboard)/         # Route group: protected routes
│   │   │   ├── layout.tsx       # Dashboard layout with nav
│   │   │   ├── dashboard/
│   │   │   │   ├── clients/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── policies/
│   │   │   │   └── beneficiaries/
│   │   │   └── invite/
│   │   │       └── [token]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (marketing)/         # Route group: public pages
│   │   │   └── page.tsx         # Landing page
│   │   │
│   │   ├── api/                 # API routes (not in route groups)
│   │   │   ├── clients/
│   │   │   └── invites/
│   │   │
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css
│   │   └── favicon.ico
│   │
│   ├── lib/                    # Shared utilities (outside app)
│   │   ├── prisma.ts
│   │   ├── audit.ts
│   │   └── utils/
│   │       ├── clerk.ts
│   │       └── invites.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── middleware.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── public/
```

## Benefits of This Structure

1. **Route Groups**: Organize routes logically without affecting URLs
2. **Private Folders**: Clearly mark non-routable code with `_` prefix
3. **Colocation**: Keep related code together (components, utils near routes)
4. **Clear Separation**: Marketing, auth, and dashboard are clearly separated

## Next Steps

1. ✅ Keep current structure working
2. Create route groups for better organization
3. Remove old Supabase code
4. Replace `/auth/*` pages with Clerk components
5. Add dashboard layout with navigation
6. Colocate route-specific components

## References

- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Private Folders](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)
- [Colocation](https://nextjs.org/docs/app/getting-started/project-structure#colocation)

