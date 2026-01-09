# TypeScript Fixes Round 2 - Type Drift Issues

**Date**: 2025-01-XX  
**Status**: ✅ Major Type Drift Issues Fixed

---

## ✅ Fixed Issues

### 1. hash.test.ts - Uint8Array Not Assignable to Buffer ✅
**Fixed**: Converted Uint8Array to ArrayBuffer properly
- **Before**: `new TextEncoder().encode("hello world")` returns Uint8Array
- **After**: Extract underlying ArrayBuffer using `buffer.slice()`

### 2. supabaseServer Missing Export ✅
**Fixed**: Added `supabaseServer()` function to `src/lib/supabase.ts`
- Creates server-side Supabase client with service role or anon key
- Used by tests and server-side code

### 3. logAccess Missing from @/lib/db ✅
**Fixed**: Updated import to use `@/lib/audit` instead
- `logAccess` is exported from `src/lib/audit.ts`, not `@/lib/db`
- Updated parameter names to match actual function signature

### 4. orgMember Missing from Union Type ✅
**Fixed**: Added `orgMember` to return type in `getCurrentUserWithOrg()`
- **Before**: `{ user, org: null, role: null }` or `{ user, org, role }`
- **After**: `{ user, org: null, role: null, orgMember: null }` or `{ user, org, role, orgMember }`

### 5. DocumentCategory Missing OTHER ✅
**Fixed**: Added `OTHER` category to `CATEGORY_DEFINITIONS`
- Matches the enum definition in `src/lib/db/enums.ts`

### 6. Duplicate AppUser Types ✅
**Fixed**: Created canonical `AppUser` type in `src/lib/auth/types.ts`
- `src/lib/auth/CurrentUser.ts` now re-exports from types.ts
- `src/lib/auth.ts` keeps its own AppUser for legacy compatibility
- `src/lib/permissions.ts` now imports from `@/lib/auth/CurrentUser`

### 7. ChangeRequestType Enum Issues ✅
**Fixed**: 
- Added missing enum keys: `ID_UPDATE`, `POLICY_UPDATE`, `BENEFICIARY_UPDATE`, `TAX_UPDATE`, `ADDRESS_UPDATE`
- Exported type derived from const object: `export type ChangeRequestType = typeof ChangeRequestType[keyof typeof ChangeRequestType]`
- Updated `src/lib/db/index.ts` to re-export the type

### 8. Stripe apiVersion Mismatch ✅
**Fixed**: Updated to match Stripe types
- **Before**: `"2024-06-20"`
- **After**: `"2025-12-15.clover" as Stripe.LatestApiVersion`

### 9. React-PDF Issues ✅
**Fixed**:
- Removed `alt` prop from `Image` components (not supported in React-PDF)
  - `src/pdfs/ClientBallotPDF.tsx`
  - `src/pdfs/InvitePDF.tsx`
- Changed `null` to `undefined` for style prop in `PolicyRegistrySummaryPDF.tsx`

---

## 📊 Results

### Before Fixes
- Multiple type drift errors
- Missing exports
- Duplicate type definitions
- Enum mismatches

### After Fixes
- ✅ All critical type drift issues resolved
- ✅ Single source of truth for AppUser (with legacy compatibility)
- ✅ All missing exports added
- ✅ All enum issues fixed

---

## 📝 Files Modified

1. `src/lib/__tests__/hash.test.ts`
2. `src/lib/supabase.ts`
3. `src/lib/audit-access.ts`
4. `src/lib/authz.ts`
5. `src/lib/documents/taxonomy.ts`
6. `src/lib/auth/types.ts` (new)
7. `src/lib/auth/CurrentUser.ts`
8. `src/lib/auth.ts`
9. `src/lib/permissions.ts`
10. `src/lib/db/enums.ts`
11. `src/lib/db/index.ts`
12. `src/lib/stripe.ts`
13. `src/pdfs/ClientBallotPDF.tsx`
14. `src/pdfs/InvitePDF.tsx`
15. `src/pdfs/PolicyRegistrySummaryPDF.tsx`

---

## ⚠️ Remaining Issues

### Non-Critical
1. **@tanstack/react-query** - Package not installed but used in `src/lib/react-query/provider.tsx`
   - **Options**: Install package or remove/comment out provider
   - **Recommendation**: Install if using React Query, otherwise remove

2. **Next.js metadata typing** - Minor warnings (non-blocking)

3. **Props serialization warnings** - Can be fixed by renaming props to end with `Action` or ensuring parent is client component

---

## ✅ Next Steps

1. Install `@tanstack/react-query` and `@tanstack/react-query-devtools` if using React Query
2. Or remove/comment out `src/lib/react-query/provider.tsx` if not using it
3. Fix remaining metadata and serialization warnings (optional)

---

**Status**: All critical type drift issues fixed. Build should be significantly cleaner now.
