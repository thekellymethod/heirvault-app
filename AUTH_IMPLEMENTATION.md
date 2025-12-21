# Authentication and Role Enforcement Implementation

## Overview

Authentication and role enforcement is wired using Clerk as the auth provider. The system ensures attorneys-only access with fail-fast role checking.

## Auth Provider: Clerk

Clerk is used for authentication. All authenticated users are attorneys.

## Library: `/lib/auth.ts`

### Functions

#### `getUser(): Promise<User | null>`
- Gets the current authenticated user from the database
- Returns `null` if user is not authenticated
- Creates or updates user record as needed
- All users are attorneys by default

#### `requireAttorney(): Promise<User>`
- Requires attorney authentication
- Throws `Error("Unauthorized")` if not authenticated
- Throws if role mismatch (fail fast)
- Ensures only attorneys can access

#### `requireAdmin(): Promise<User>`
- Requires admin authentication
- First calls `requireAttorney()` to ensure attorney role
- Then checks admin status via `isAdmin()`
- Throws `Error("Forbidden: Admin access required")` if not admin
- Fail fast if role mismatch

### User Type

```typescript
type User = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "attorney";
};
```

## Middleware: `/middleware.ts`

### Global Gate Function

The middleware serves as a global gate that ensures pages cannot accidentally leak data, even if mis-coded.

### Route Protection

#### Public Routes (Always Allowed)
- `/(public)` route group (paths: `/`, `/intake`, `/update/[token]`)
- `/intake(.*)` - Policy Intake
- `/update(.*)` - QR Re-submission
- `/sign-in(.*)`, `/sign-up(.*)` - Authentication
- `/error(.*)`, `/unauthorized(.*)`, `/forbidden(.*)` - Error pages
- Public API routes: `/api/intake(.*)`, `/api/invite(.*)`, etc.

#### Protected Routes (Require Authentication)
- `/(protected)` route group (paths: `/dashboard`, `/records`, `/search`, `/audit`, `/admin`)
- `/dashboard(.*)` - Attorney Dashboard
- `/records(.*)` - Registry Records
- `/search(.*)` - Search
- `/audit(.*)` - Audit Trail
- `/admin(.*)` - Administration (requires admin role)
- Protected API routes: `/api/documents(.*)`, `/api/records(.*)`, etc.

### Authentication Flow

1. **Public Route**: Allow through immediately
2. **Protected Route**:
   - Check Clerk authentication (`userId`)
   - If not authenticated → Redirect to `/sign-in` with `redirect_url`
   - Fetch user from database via `getUser()`
   - If user not in DB → Redirect to `/sign-in`
   - Attach user + role to request headers
   - For admin routes → Check admin status, redirect if not admin

### Request Headers

For protected routes, middleware attaches:
- `x-user-id` - User ID from database
- `x-user-email` - User email
- `x-user-role` - User role (always "attorney")
- `x-user-is-admin` - "true" if admin (only for admin routes)

These headers ensure pages cannot accidentally leak data, even if mis-coded.

### Admin Route Protection

Admin routes (`/admin(.*)`) have additional protection:
- User must be authenticated (attorney)
- User must be admin (checked via `isAdmin()`)
- If not admin → Redirect to `/error?type=insufficient_role`

## Usage Examples

### In Server Components

```typescript
import { requireAttorney, requireAdmin } from "@/lib/auth";

// Require attorney
export default async function DashboardPage() {
  const user = await requireAttorney();
  // User is guaranteed to be authenticated attorney
  return <div>Welcome {user.email}</div>;
}

// Require admin
export default async function AdminPage() {
  const user = await requireAdmin();
  // User is guaranteed to be authenticated admin
  return <div>Admin Panel</div>;
}
```

### In API Routes

```typescript
import { requireAttorney, requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// Require attorney
export async function GET(req: NextRequest) {
  try {
    const user = await requireAttorney();
    // User is authenticated attorney
    return NextResponse.json({ data: "..." });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Require admin
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    // User is authenticated admin
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

### Accessing Request Headers

```typescript
import { headers } from "next/headers";

export default async function Page() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userEmail = headersList.get("x-user-email");
  const userRole = headersList.get("x-user-role");
  const isAdmin = headersList.get("x-user-is-admin") === "true";
  
  // Use headers for additional checks
}
```

## Security Features

### 1. Fail Fast
- Role checks happen immediately
- Errors thrown before any data access
- Prevents partial execution

### 2. No Data Leakage
- Middleware blocks unauthenticated access
- Headers attached for downstream use
- Pages cannot accidentally leak data

### 3. Route Group Protection
- `(public)` routes: Always allowed
- `(protected)` routes: Always blocked unless authenticated
- Explicit route matching for clarity

### 4. Admin Protection
- Admin routes checked at middleware level
- Additional check in `requireAdmin()`
- Double protection against unauthorized access

## Route Group Notes

**Important**: Next.js route groups like `(public)` and `(protected)` don't appear in URL paths.

- `/(public)/page.tsx` → URL: `/`
- `/(public)/intake/page.tsx` → URL: `/intake`
- `/(protected)/dashboard/page.tsx` → URL: `/dashboard`
- `/(protected)/admin/page.tsx` → URL: `/admin`

Middleware matches actual URL paths, not route group names.

## Migration Notes

### From Old Auth System

- Replace `getCurrentUser()` → `getUser()`
- Replace `requireAuth()` → `requireAttorney()`
- Replace `requireAdmin()` → `requireAdmin()` (same function, now in `/lib/auth.ts`)

### Backward Compatibility

The old functions in `/lib/utils/clerk.ts` can remain for now, but new code should use `/lib/auth.ts`.

## Testing

1. **Public Routes**: Should load without authentication
2. **Protected Routes**: Should redirect to `/sign-in` if not authenticated
3. **Admin Routes**: Should redirect to `/error?type=insufficient_role` if not admin
4. **Request Headers**: Should be present on protected routes

## Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Admin Emails (comma-separated)
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

