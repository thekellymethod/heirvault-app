# Administration & Compliance Page

## Overview

The Administration & Compliance page is an internal-only system governance interface for monitoring usage, enforcing compliance rules, managing attorney credentials, handling takedowns or corrections, and maintaining statutory alignment.

## Access Control

The compliance page is **intentionally invisible** to standard users and is only accessible to administrators.

### Admin Configuration

Admin access is controlled via environment variable. Add the following to your `.env.local`:

```env
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

**Important**: Use comma-separated email addresses (case-insensitive). Only users with emails listed in this variable can access the compliance page.

## Page Location

The compliance page is located at:
```
/dashboard/admin/compliance
```

**Note**: This page is NOT listed in the sidebar navigation. Users must navigate directly to the URL or have it bookmarked.

## Features

### 1. Overview Tab
- System-wide usage statistics
- Quick status indicators
- Key metrics dashboard

### 2. Usage Monitoring
- Total users, clients, policies, and organizations
- Active attorney count
- Recent activity (last 24 hours)
- Activity log access

### 3. Compliance Rules
- View and manage compliance rules
- Rule status (active/inactive)
- Rule descriptions and last update timestamps
- **Note**: Rule storage is currently placeholder - implement database storage as needed

### 4. Attorney Credentials Management
- View all attorney accounts
- Search by name, email, or bar number
- Verify attorney credentials
- Revoke credentials if needed
- Status tracking (verified/pending/revoked)

### 5. Takedowns & Corrections
- View pending takedown requests
- Approve or reject requests
- Track request status
- **Note**: Takedown request storage is currently placeholder - implement database storage as needed

### 6. Statutory Alignment
- Compliance status overview
- Regulatory compliance indicators
- Data privacy (GDPR/CCPA) status
- Attorney-client privilege enforcement
- Audit trail requirements

## API Endpoints

All compliance API endpoints require admin access:

- `GET /api/admin/compliance/usage` - Get usage statistics
- `GET /api/admin/compliance/rules` - Get compliance rules
- `POST /api/admin/compliance/rules` - Create/update compliance rule
- `GET /api/admin/compliance/credentials` - Get attorney credentials
- `POST /api/admin/compliance/credentials` - Update attorney credential
- `GET /api/admin/compliance/takedowns` - Get takedown requests
- `POST /api/admin/compliance/takedowns` - Process takedown request

## Security

- All endpoints check admin status via `requireAdmin()` function
- Non-admin users are automatically redirected to `/dashboard`
- Admin status is checked on both page load and API requests
- Admin emails are case-insensitive for matching

## Future Enhancements

1. **Compliance Rules Storage**: Implement database table for compliance rules
2. **Takedown Requests Storage**: Implement database table for takedown requests
3. **Audit Logging**: Enhanced audit logging for compliance actions
4. **Email Notifications**: Notify admins of compliance issues
5. **Reporting**: Export compliance reports
6. **Rule Enforcement**: Automated rule enforcement mechanisms

## Implementation Notes

- The page uses the same design system as the rest of the dashboard
- All database queries use raw SQL for consistency with existing admin endpoints
- The page is fully responsive and works on mobile devices
- Error handling is implemented for all API calls

