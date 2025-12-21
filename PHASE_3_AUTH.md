# Phase 3 — Attorney Auth + Protected Shell

## ✅ Implementation Checklist

### 1. Login Page ✓
**Location: `/app/(auth)/login/page.tsx`**

- Uses Clerk `SignIn` component
- Client component with `useAuth()` hook
- Handles redirect after sign-in:
  - Uses `redirect_url` query parameter if provided
  - Defaults to `/dashboard` if not provided
- Auto-redirects if already signed in
- Shows loading state while checking auth
- Styled with Logo and consistent UI
- Links to sign-up page

**Provider Components:**
- ClerkProvider is in root layout (`src/app/layout.tsx`)
- SignIn component handles all authentication UI
- No additional provider components needed

### 2. Middleware ✓
**Location: `/middleware.ts`**

**Allow public routes:**
- `isPublicRoute` matcher includes:
  - `/` (root)
  - `/intake(.*)` (policy intake)
  - `/update(.*)` (QR update)
  - `/sign-in(.*)`, `/sign-up(.*)` (auth routes)
  - `/(auth)/login(.*)` (login page)
  - `/error(.*)`, `/unauthorized(.*)`, `/forbidden(.*)` (error pages)
  - Public API routes

**Require auth for (protected):**
- `isProtectedRoute` matcher includes:
  - `/dashboard(.*)` (attorney dashboard)
  - `/records(.*)` (registry records)
  - `/search(.*)` (search)
  - `/audit(.*)` (audit trail)
  - `/admin(.*)` (admin pages)
  - Protected API routes

**Authentication Flow:**
1. Check if route is public → Allow through
2. Check if route is protected:
   - Get `userId` from Clerk auth
   - If no `userId` → Redirect to `/login?redirect_url={pathname}`
   - Fetch user from database via `getUser()`
   - If user not in DB → Redirect to `/login?redirect_url={pathname}`
   - Attach user + role to request headers
   - For admin routes → Check admin status, redirect if not admin

**Request Headers (for protected routes):**
- `x-user-id` - User ID from database
- `x-user-email` - User email
- `x-user-role` - User role (always "attorney")
- `x-user-is-admin` - "true" if admin (only for admin routes)

### 3. Auth Library ✓
**Location: `/lib/auth.ts`**

**Functions:**

#### `getUser(): Promise<User | null>`
- Gets current authenticated user from database
- Returns `null` if not authenticated
- Creates or updates user record as needed
- All users are attorneys by default
- Handles Clerk → Database sync

#### `requireAttorney(): Promise<User>`
- Requires attorney authentication
- Throws `Error("Unauthorized")` if not authenticated
- Ensures role is "attorney" (updates if needed)
- Fail fast if role mismatch
- Returns authenticated attorney user

#### `requireAdmin(): Promise<User>`
- Requires admin authentication
- First calls `requireAttorney()` to ensure attorney role
- Checks admin status via `ADMIN_EMAILS` environment variable
- Throws `Error("Forbidden: Admin access required")` if not admin
- Fail fast if role mismatch
- Returns authenticated admin user

**User Type:**
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

## Exit Criteria ✓

✅ **Visiting `/dashboard` redirects to login if not authenticated**

**Test Flow:**
1. Visit `/dashboard` while not authenticated
2. Middleware detects no `userId` from Clerk
3. Redirects to `/login?redirect_url=/dashboard`
4. User signs in via Clerk SignIn component
5. After sign-in, redirects to `/dashboard` (from `redirect_url` parameter)
6. Middleware verifies authentication and allows access

## Authentication Flow Diagram

```
User visits /dashboard
  ↓
Middleware checks route
  ↓
Route is protected → Check auth
  ↓
No userId from Clerk?
  ↓ YES
Redirect to /login?redirect_url=/dashboard
  ↓
User signs in via Clerk
  ↓
Clerk authenticates user
  ↓
Redirect to /dashboard (from redirect_url)
  ↓
Middleware checks auth again
  ↓
userId exists → Fetch user from DB
  ↓
User exists in DB?
  ↓ YES
Attach user + role to headers
  ↓
Allow access to /dashboard
```

## Security Features

1. **Global Gate Middleware**
   - Ensures pages cannot accidentally leak data
   - Even if page code is mis-coded, middleware blocks unauthenticated access

2. **Fail-Fast Role Checking**
   - `requireAttorney()` and `requireAdmin()` throw immediately if not authorized
   - No partial data exposure

3. **Database User Sync**
   - Clerk users automatically synced to database
   - User records created/updated on first access
   - Ensures consistency between Clerk and database

4. **Request Header Attachment**
   - User data attached to request headers
   - Available to all downstream components
   - Prevents accidental data leakage

5. **Redirect URL Preservation**
   - Original destination preserved in `redirect_url` parameter
   - User returns to intended page after login
   - Better UX

## Testing

### Manual Test Flow

1. **Not Authenticated:**
   - Visit `/dashboard`
   - Should redirect to `/login?redirect_url=/dashboard`
   - Sign in via Clerk
   - Should redirect back to `/dashboard`
   - Should see dashboard content

2. **Already Authenticated:**
   - Visit `/login` while signed in
   - Should auto-redirect to `/dashboard`

3. **Protected API Route:**
   - Visit `/api/records` without auth
   - Should redirect to `/login?redirect_url=/api/records`
   - After sign-in, should access API

4. **Public Route:**
   - Visit `/intake` without auth
   - Should allow access (no redirect)

### API Test

```bash
# Without authentication
curl http://localhost:3000/api/records
# Should redirect to /login

# With authentication (after getting session cookie)
curl -H "Cookie: __session=..." http://localhost:3000/api/records
# Should return data or proper response
```

## Files Modified/Created

- ✅ `src/app/(auth)/login/page.tsx` - Login page with Clerk SignIn component
- ✅ `src/middleware.ts` - Updated to redirect to `/login` instead of `/sign-in`
- ✅ `src/lib/auth.ts` - Already existed with all required functions
- ✅ `PHASE_3_AUTH.md` - This documentation

## Key Implementation Details

### Route Groups

- `(auth)` - Authentication routes (doesn't appear in URL)
  - `/login` - Login page (accessible at `/login`, not `/(auth)/login`)

- `(protected)` - Protected routes (doesn't appear in URL)
  - `/dashboard` - Dashboard (accessible at `/dashboard`, not `/(protected)/dashboard`)
  - `/records` - Records
  - `/search` - Search
  - `/audit` - Audit

- `(public)` - Public routes (doesn't appear in URL)
  - `/intake` - Intake
  - `/update/[token]` - Update

### Clerk Configuration

ClerkProvider is configured in root layout:
```typescript
<ClerkProvider 
  signInUrl="/sign-in"  // Note: Still uses /sign-in for Clerk routing
  signUpUrl="/sign-up"
  signOutUrl="/sign-in"
  afterSignOutUrl="/sign-in"
>
```

The SignIn component uses `path="/login"` to handle routing within the component.

### Middleware Redirect Logic

The middleware redirects to `/login` (not `/sign-in`) for consistency with the route group structure. The Clerk SignIn component handles the actual authentication flow.

## Next Steps

Phase 3 is complete. The authentication and protected shell are fully functional:
- Login page at `/login`
- Middleware protects all `(protected)` routes
- Public routes remain accessible
- Attorney authentication enforced
- Admin authentication available
- Redirect URL preservation

Ready for Phase 4 implementation.

