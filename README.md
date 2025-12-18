# HeirVault

> Private, voluntary registry for life insurance policies and beneficiaries.

A secure, private registry where clients voluntarily record who insures them and who their beneficiaries are—without exposing policy amounts.

## Features

- **Private, Voluntary Registry**: Clients voluntarily record insurance companies and beneficiaries without revealing policy amounts
- **Attorney Dashboard**: Quick access to client policy and beneficiary information with tabbed views (Overview & Activity)
- **Client Portal**: Self-service portal for clients to manage their own registry
- **Access Control**: Role-based access control (OWNER, ATTORNEY, STAFF) with organization-level permissions
- **Team Management**: Invite team members, manage roles, and control access
- **Client Invites**: Secure email-based invitation system for linking clients to their registry
- **PDF Export**: Generate professional reports for probate filings, estate planning, and settlements
- **Global Search**: Search across clients and policies from anywhere in the dashboard
- **Analytics Dashboard**: Firm-level analytics showing client counts, policies, beneficiaries, and completion rates
- **Billing Integration**: Stripe integration for subscription management (FREE, SOLO, SMALL_FIRM, ENTERPRISE plans)
- **Client Limits**: Plan-based client limits enforced automatically
- **Audit Logging**: Complete audit trail of all access, changes, and views with activity feeds

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon (PostgreSQL) with Prisma ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety
- **PDF Generation**: @react-pdf/renderer
- **Email**: Resend
- **Payments**: Stripe

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Neon database (or any PostgreSQL database)
- Clerk account for authentication

### Setup

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up Database**:
   - Create a Neon database at [neon.tech](https://neon.tech) or use any PostgreSQL database
   - Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

3. **Set up Clerk Authentication**:
   - Create a Clerk account at [clerk.com](https://clerk.com)
   - Create a new application
   - Get your publishable key and secret key

4. **Configure environment variables**:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your credentials:
     - `DATABASE_URL`: Your Neon/PostgreSQL connection string
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
     - `CLERK_SECRET_KEY`: Your Clerk secret key
     - `NEXT_PUBLIC_APP_URL`: Your app URL (e.g., `http://localhost:3000`)
     - `RESEND_API_KEY`: Your Resend API key for email sending
     - `RESEND_FROM_EMAIL`: Email address for sending invites
     - `STRIPE_SECRET_KEY`: Your Stripe secret key (for billing)
     - `STRIPE_PRICE_SOLO`: Stripe Price ID for Solo plan
     - `STRIPE_PRICE_SMALL_FIRM`: Stripe Price ID for Small Firm plan
     - `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret for subscription updates

5. **Run the development server**:
```bash
npm run dev
```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Database Schema

The application uses the following main entities:

- **Users**: User accounts synced with Clerk (attorney or client role)
- **Organizations**: Law firms with billing plans and contact information
- **OrgMembers**: Links users to organizations with roles (OWNER, ATTORNEY, STAFF)
- **Clients**: Individual clients with insurance policies, scoped to organizations
- **Policies**: Insurance policies linked to insurers (no benefit amounts stored)
- **Insurers**: Insurance company information
- **Beneficiaries**: Policy beneficiaries with relationships
- **PolicyBeneficiaries**: Links beneficiaries to policies with share percentages
- **AccessGrants**: Organization-level access control to clients
- **AttorneyClientAccess**: Legacy attorney-client access relationships
- **ClientInvites**: Secure invitation system with tokens and expiry
- **AuditLogs**: Complete audit trail with actions, users, organizations, clients, and policies

See `prisma/schema.prisma` for the complete schema.

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── clients/            # Client CRUD operations
│   │   ├── policies/           # Policy management
│   │   ├── beneficiaries/     # Beneficiary management
│   │   ├── invites/           # Invite acceptance
│   │   ├── search/             # Global search
│   │   ├── billing/           # Stripe checkout
│   │   ├── org/               # Organization management
│   │   └── webhooks/          # Stripe webhooks
│   ├── dashboard/              # Attorney dashboard
│   │   ├── clients/           # Client management
│   │   ├── policies/          # Policy views
│   │   ├── beneficiaries/    # Beneficiary views
│   │   ├── team/             # Team management
│   │   ├── billing/          # Billing & subscriptions
│   │   ├── settings/         # Organization settings
│   │   └── analytics/        # Firm analytics
│   ├── client-portal/          # Client-facing portal
│   ├── invite/                # Invite acceptance flow
│   └── page.tsx               # Landing page
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── authz.ts               # Authorization helpers
│   ├── audit.ts               # Audit logging
│   ├── client-limits.ts       # Plan-based client limits
│   ├── plan.ts                # Billing plan utilities
│   ├── email.ts               # Email sending (Resend)
│   └── stripe.ts              # Stripe client
├── pdfs/                      # PDF generation components
└── components/                # Shared React components
```

## Development Roadmap

### ✅ Completed

- [x] Database schema design and migrations
- [x] Neon + Prisma setup and configuration
- [x] Clerk authentication system
- [x] Attorney dashboard with sidebar navigation
- [x] Client management (CRUD operations)
- [x] Policy management (CRUD operations)
- [x] Beneficiary management (CRUD operations)
- [x] Client invite flow with email integration
- [x] Client portal for self-service
- [x] PDF export for client summaries
- [x] Audit logging with activity feeds
- [x] Organization settings and contact information
- [x] Team management with role-based access
- [x] Billing integration with Stripe
- [x] Plan-based client limits
- [x] Global search functionality
- [x] Analytics dashboard
- [x] Role-based authorization (OWNER, ATTORNEY, STAFF)

### 🚧 In Progress / Planned

- [ ] Enhanced error handling and validation
- [ ] Email templates customization
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Export functionality (CSV, Excel)
- [ ] Mobile app or responsive improvements
- [ ] API documentation
- [ ] Unit and integration tests

## Security & Compliance

- **HTTPS-only** in production
- **Encrypted data at rest** (Neon/PostgreSQL)
- **Clerk authentication** with MFA support
- **Strong password policy** enforced by Clerk
- **Role-based access control** (OWNER, ATTORNEY, STAFF)
- **Organization-level permissions** via AccessGrants
- **Complete audit logging** of all actions, views, and changes
- **Client-controlled access** - clients grant/revoke attorney access
- **Secure invite system** with time-limited tokens
- **No policy amounts stored** - privacy by design

## Billing Plans

- **FREE**: Evaluation plan (3 clients)
- **SOLO**: $19/month (1 attorney, up to 100 clients)
- **SMALL_FIRM**: $69/month (up to 5 attorneys, up to 500 clients)
- **ENTERPRISE**: Custom pricing (unlimited, SSO, dedicated support)

## Key Features in Detail

### Client Management
- Create, view, edit, and search clients
- Client detail pages with Overview and Activity tabs
- Activity feed showing all audit events
- Invite clients via secure email links
- PDF export of client registry summaries

### Policy Management
- Link policies to insurers (auto-create if needed)
- Track policy types (TERM, WHOLE, GROUP, OTHER)
- Track policy status (ACTIVE, LAPSED, UNKNOWN)
- Link beneficiaries to policies with share percentages
- Employer group policy tracking

### Team Management
- Invite team members by email
- Role-based permissions (OWNER, ATTORNEY, STAFF)
- Only OWNERs can invite and manage team
- ATTORNEYs and OWNERs can manage clients
- STAFF have limited access

### Audit & Compliance
- All actions logged with user, organization, client, and policy context
- Activity feeds on client detail pages
- Audit actions include: CLIENT_CREATED, CLIENT_UPDATED, CLIENT_VIEWED, POLICY_CREATED, POLICY_UPDATED, BENEFICIARY_CREATED, BENEFICIARY_UPDATED, INVITE_CREATED, INVITE_ACCEPTED, CLIENT_SUMMARY_PDF_DOWNLOADED

## License

Private - All rights reserved
