# Attorney Sign-In Flow Test Plan

## Overview
This document outlines how to test the attorney sign-in and role assignment flow.

## Test Flow

### 1. Test New User Sign-Up
1. Navigate to `/attorney/sign-up`
2. Fill out the sign-up form
3. Complete email verification (if required by Clerk)
4. **Expected**: User is redirected to `/attorney/sign-up/complete`
5. **Expected**: Page shows "Setting up your attorney account..."
6. **Expected**: After role is set, user is redirected to `/dashboard`
7. **Verify**: User can access dashboard features

### 2. Test Existing User Sign-In (No Role)
1. Navigate to `/attorney/sign-in`
2. Sign in with an existing account that doesn't have "attorney" role
3. **Expected**: User is redirected to `/attorney/sign-in/complete`
4. **Expected**: Page shows "Checking your account..." then "Setting up your attorney account..."
5. **Expected**: Role is set to "attorney" in both Clerk metadata and database
6. **Expected**: User is redirected to `/dashboard`
7. **Verify**: User can access dashboard features

### 3. Test Existing User Sign-In (With Role)
1. Navigate to `/attorney/sign-in`
2. Sign in with an account that already has "attorney" role
3. **Expected**: User is redirected to `/attorney/sign-in/complete`
4. **Expected**: Page shows "Checking your account..."
5. **Expected**: Page quickly redirects to `/dashboard` (no role setting needed)
6. **Verify**: User can access dashboard features immediately

### 4. Test API Endpoints

#### Test `/api/user/check-role`
```bash
# While signed in, make a GET request
curl http://localhost:3000/api/user/check-role \
  -H "Cookie: [your-session-cookie]"

# Expected response:
{
  "clerkRole": "attorney" | null,
  "dbRole": "attorney" | "client" | null,
  "hasAttorneyRole": true | false
}
```

#### Test `/api/user/set-role`
```bash
# While signed in, make a POST request
curl -X POST http://localhost:3000/api/user/set-role \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"role": "attorney"}'

# Expected response:
{
  "success": true,
  "role": "attorney"
}
```

### 5. Test Error Scenarios

#### Network Error Handling
1. Disconnect internet
2. Try to sign in
3. **Expected**: Error message shows "Unable to connect to server..."
4. **Expected**: Retry buttons are available

#### Unauthorized Access
1. Try to access `/dashboard` without signing in
2. **Expected**: Redirected to `/attorney/sign-in`

#### Role Mismatch
1. Sign in as a user with "client" role
2. Try to access `/dashboard`
3. **Expected**: Redirected to `/attorney/sign-in/complete` to set role

### 6. Test Redirect Loop Prevention
1. Sign in and go through the complete flow
2. Manually navigate to `/attorney/sign-in/complete` again
3. **Expected**: Page checks role and redirects immediately (no loop)
4. **Expected**: `redirected` flag prevents multiple redirects

## Manual Testing Checklist

- [ ] New user sign-up flow works
- [ ] Existing user sign-in (no role) sets role correctly
- [ ] Existing user sign-in (with role) redirects quickly
- [ ] API `/api/user/check-role` returns correct data
- [ ] API `/api/user/set-role` updates both Clerk and DB
- [ ] Error handling works for network failures
- [ ] Redirect loop prevention works
- [ ] Dashboard access is properly protected
- [ ] Role persists after page refresh
- [ ] Multiple sign-ins don't cause issues

## Browser Console Checks

When testing, check the browser console for:
- ✅ No "Failed to fetch" errors
- ✅ No redirect loops
- ✅ Successful API calls to `/api/user/check-role` and `/api/user/set-role`
- ✅ Proper error messages if something fails

## Database Verification

After sign-in, verify in database:
```sql
SELECT id, email, role, "clerkId" 
FROM users 
WHERE email = 'test@example.com';
```

Should show `role = 'attorney'`

## Clerk Dashboard Verification

1. Go to Clerk Dashboard
2. Find the user
3. Check `publicMetadata.role` should be `"attorney"`

## Common Issues & Solutions

### Issue: Redirect Loop
**Solution**: Check that `redirected` flag is working and `router.replace()` is used

### Issue: Role Not Set
**Solution**: Check API logs, verify Clerk metadata update, check database

### Issue: "Failed to fetch"
**Solution**: Check network connection, verify API routes are accessible, check middleware configuration

### Issue: 401 Unauthorized
**Solution**: Verify user is signed in, check Clerk session, verify middleware allows the route

