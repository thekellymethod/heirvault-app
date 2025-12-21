# Error / Access Denied Pages

## Overview

The Error / Access Denied Pages serve a defensive function. They prevent information leakage while clearly explaining why access failed—expired authorization, insufficient role, invalid QR token, or revoked credentials—without revealing underlying data.

## Centralized Error Page

**Route:** `/error`

**Query Parameters:**
- `type` - Error type (see Error Types below)
- `reason` - Optional additional context (sanitized, not exposed to users)

## Error Types

### 1. `expired_authorization`
- **Title**: "Authorization Expired"
- **Message**: Explains that authorization has expired
- **Details**: Access links are time-limited for security
- **Icon**: Clock (amber)
- **Use Case**: Expired invitation links, expired tokens

### 2. `insufficient_role`
- **Title**: "Access Denied"
- **Message**: User lacks required permissions
- **Details**: Requires administrator privileges
- **Icon**: Shield (red)
- **Use Case**: Non-admin trying to access admin pages

### 3. `invalid_token` / `invalid_qr`
- **Title**: "Invalid Access Code"
- **Message**: Access code or QR code is invalid or revoked
- **Details**: Codes may expire or be revoked for security
- **Icon**: Key (red)
- **Use Case**: Invalid invitation tokens, invalid QR codes

### 4. `revoked_credentials`
- **Title**: "Access Revoked"
- **Message**: Access credentials have been revoked
- **Details**: Contact attorney/admin to restore access
- **Icon**: Lock (red)
- **Use Case**: Revoked attorney credentials, revoked access

### 5. `unauthorized`
- **Title**: "Unauthorized Access"
- **Message**: Must be signed in to access resource
- **Details**: Sign in with attorney account
- **Icon**: Shield (blue)
- **Use Case**: Unauthenticated access attempts

### 6. `forbidden`
- **Title**: "Access Forbidden"
- **Message**: No permission to access resource
- **Details**: Resource is restricted
- **Icon**: AlertTriangle (amber)
- **Use Case**: Insufficient permissions, access denied

### 7. `not_found`
- **Title**: "Resource Not Found"
- **Message**: Requested resource could not be found
- **Details**: Link may be incorrect or resource removed
- **Icon**: XCircle (gray)
- **Use Case**: 404 errors, missing resources

### 8. `access_denied` (default)
- **Title**: "Access Denied"
- **Message**: Generic access denied message
- **Icon**: Shield (red)
- **Use Case**: Fallback for unknown errors

## Usage

### In Server Components

```typescript
import { redirect } from "next/navigation";

// Redirect to error page
if (!hasAccess) {
  redirect("/error?type=forbidden");
}

// With specific error type
if (tokenExpired) {
  redirect("/error?type=expired_authorization");
}
```

### Using Error Handler Utility

```typescript
import { redirectToError, handleAccessError } from "@/lib/error-handler";

// Redirect with error type
try {
  await requireAdmin();
} catch (error) {
  redirectToError("insufficient_role");
}

// Auto-detect error type
try {
  await someOperation();
} catch (error) {
  handleAccessError(error); // Automatically detects and redirects
}
```

## Defensive Features

### 1. **No Information Leakage**
- Does not expose:
  - Database structure
  - Internal IDs or tokens
  - System architecture
  - User existence (for invalid tokens)
  - Specific error details

### 2. **Clear User Messages**
- Explains why access failed
- Provides actionable next steps
- Uses plain language
- No technical jargon

### 3. **Consistent Design**
- Unified error page design
- Consistent messaging
- Professional appearance
- Branded with logo

### 4. **Security Best Practices**
- Generic error messages
- No stack traces
- No internal details
- Rate limiting friendly

## Integration Points

### Pages Using Error Handler

- `/invite/[token]` - Invalid/expired tokens
- `/qr-update/[token]` - Invalid QR codes
- `/dashboard/clients/[id]` - Forbidden access
- `/dashboard/admin/compliance` - Insufficient role
- API routes - Return appropriate error types

### Error Boundary

The `ErrorBoundary` component catches React errors and displays a defensive error page without leaking information.

## Error Handler Utility

**File:** `src/lib/error-handler.ts`

### Functions

- `redirectToError(type, reason?)` - Redirect to error page
- `handleAccessError(error)` - Auto-detect and redirect
- `getErrorType(error)` - Extract error type from error
- `isAccessError(error)` - Check if error is access-related

## Redirect Pages

- `/unauthorized` → `/error?type=unauthorized`
- `/forbidden` → `/error?type=forbidden`

These provide convenient redirects for common error scenarios.

## Security Considerations

1. **No Token Exposure**: Error pages never display tokens, IDs, or sensitive data
2. **Generic Messages**: Messages don't reveal whether resources exist
3. **Consistent Timing**: Error responses have consistent timing (prevents timing attacks)
4. **Rate Limiting**: Error pages don't reveal rate limit status
5. **Logging**: Errors are logged server-side but not exposed to clients

## Examples

### Invalid QR Code
```
User scans invalid QR code
→ Redirects to /error?type=invalid_qr
→ Shows: "Invalid Access Code - The access code or QR code you used is invalid or has been revoked."
```

### Expired Authorization
```
User accesses expired invitation link
→ Redirects to /error?type=expired_authorization
→ Shows: "Authorization Expired - Your authorization has expired. Please request a new access link."
```

### Insufficient Role
```
Non-admin tries to access admin page
→ Redirects to /error?type=insufficient_role
→ Shows: "Access Denied - You do not have the required permissions to access this resource."
```

### Revoked Credentials
```
Attorney with revoked credentials tries to access
→ Redirects to /error?type=revoked_credentials
→ Shows: "Access Revoked - Your access credentials have been revoked."
```

