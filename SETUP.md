# HeirVault Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database (Neon)

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy your connection string
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

### 3. Set Up Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your publishable key and secret key from the dashboard

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Neon Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Clerk Redirect URLs (Important for fixing redirect issues)
# These tell Clerk where your custom auth pages are located
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/attorney/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/attorney/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/attorney/sign-in/complete
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/attorney/sign-up/complete

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend) - For client invites
# Note: Clerk authentication emails are configured in Clerk Dashboard, not here
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What's Been Built

### ✅ Completed Features

1. **Database Schema** (`prisma/schema.prisma`)
   - Complete PostgreSQL schema with all tables
   - User + Organization + OrgMember structure
   - Indexes for performance
   - Audit logging structure

2. **Authentication System**
   - Clerk integration
   - Role-based access control (attorney/client)
   - Middleware for route protection
   - User sync with database

3. **Landing Page** (`/`)
   - Marketing content
   - Feature highlights
   - Call-to-action sections

4. **Dashboard**
   - Attorney dashboard with client list
   - Client dashboard view
   - Policy and beneficiary counts

5. **Invite System**
   - Create invites (API endpoint)
   - Accept invites (UI + API)
   - Secure token-based invitations

6. **API Routes**
   - `/api/clients` - Create and list clients
   - `/api/invites` - Create invites
   - `/api/invites/[token]` - Get invite details
   - `/api/invites/[token]/accept` - Accept invites

7. **Utilities**
   - Clerk authentication helpers
   - Invite management
   - Audit logging functions

### 🚧 Next Steps (To Be Built)

1. **Client Management UI**
   - Add client form
   - Edit client details
   - Client detail view

2. **Policy Management**
   - Add/edit policies
   - Link policies to beneficiaries
   - Policy detail view

3. **Beneficiary Management**
   - Add/edit beneficiaries
   - Link beneficiaries to policies
   - Beneficiary detail view

4. **Access Management**
   - Grant/revoke attorney access
   - Client consent UI

5. **PDF Export**
   - Generate Policy & Beneficiary Summary PDFs
   - Export for probate filings

6. **Email Integration**
   - Send invite emails
   - Email notifications

## Database Tables

- `users` - User accounts (synced with Clerk)
- `organizations` - Law firms
- `org_members` - Links users to organizations
- `clients` - Client records
- `attorney_client_access` - Access control
- `invites` - Invitation system
- `insurers` - Insurance companies
- `policies` - Insurance policies (no amounts)
- `beneficiaries` - Policy beneficiaries
- `policy_beneficiaries` - Many-to-many relationship
- `audit_logs` - Complete audit trail

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to git
2. **HTTPS**: Ensure HTTPS in production
3. **Clerk Security**: Clerk handles password policy and MFA
4. **Database**: Use SSL connections (sslmode=require)
5. **Audit Logging**: Complete audit trail of all operations

## Testing the Application

1. **Create an Account**:
   - Go to `/sign-in` (Clerk's default sign-in page)
   - Sign up for a new account
   - Complete the sign-up flow

2. **Create an Organization** (for attorneys):
   - After signing up, create an organization
   - Add organization members

3. **Create a Client**:
   - As attorney, use the API or dashboard
   - Or use the invite system

4. **Accept an Invite**:
   - As attorney, create an invite via API
   - Use the invite URL to accept as client

## Troubleshooting

### "User not found" error
- Make sure Clerk is properly configured
- Check that the user was created in the database (auto-synced on first access)

### Database connection errors
- Verify your DATABASE_URL in `.env.local`
- Check that Prisma migrations have been run
- Ensure SSL is enabled (sslmode=require)

### Authentication issues
- Verify Clerk keys are correct in `.env.local`
- Check Clerk dashboard for application status
- Clear browser cookies and try again

## Next Development Priorities

1. Build out client CRUD UI
2. Build out policy management UI
3. Build out beneficiary management UI
4. Implement PDF export
5. Add email sending for invites
6. Add client access management UI
