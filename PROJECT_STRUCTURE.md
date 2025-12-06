# HeirVault Project Structure

Complete project structure documentation for the HeirVault application.

## Overview

HeirVault is a Next.js 16 application built with the App Router, using TypeScript, Prisma, Clerk authentication, and Tailwind CSS. The application provides a secure registry for attorneys and clients to manage life insurance and beneficiary information.

## Root Directory Structure

```
heir-vault/
├── .env.local                 # Environment variables (not in git)
├── .gitignore
├── next.config.mjs            # Next.js configuration with Sentry & security headers
├── package.json               # Dependencies and scripts
├── package-lock.json
├── prisma/                    # Database schema and migrations
├── public/                    # Static assets
├── README.md                  # Project documentation
├── SETUP.md                   # Setup instructions
├── NEXT_STEPS.md              # Development roadmap
├── PROJECT_STRUCTURE.md       # This file
├── sentry.client.config.ts    # Sentry client configuration
├── sentry.edge.config.ts      # Sentry edge configuration
├── sentry.server.config.ts    # Sentry server configuration
├── src/                       # Source code
└── supabase/                  # Supabase schema (legacy reference)
```

## Source Code Structure (`src/`)

### Application Routes (`src/app/`)

```
src/app/
├── api/                       # API routes (REST endpoints)
│   ├── beneficiaries/
│   │   └── route.ts          # POST: Create beneficiary
│   ├── billing/
│   │   └── checkout/
│   │       └── route.ts      # POST: Create Stripe checkout session
│   ├── clients/
│   │   ├── [id]/
│   │   │   ├── invite/
│   │   │   │   └── route.ts  # POST: Send client invitation
│   │   │   ├── route.ts      # GET, PUT: Client CRUD
│   │   │   └── summary-pdf/
│   │   │       └── route.ts # GET: Generate client summary PDF
│   │   └── route.ts          # GET, POST: List/create clients
│   ├── invites/
│   │   ├── [token]/
│   │   │   ├── accept/
│   │   │   │   └── route.ts  # POST: Accept invitation
│   │   │   └── route.ts      # GET: Get invite details
│   │   ├── accept/
│   │   │   └── route.ts      # POST: Accept invitation (alternative)
│   │   └── route.ts          # GET, POST: List/create invites
│   ├── org/
│   │   └── team/
│   │       └── invite/
│   │           └── route.ts  # POST: Invite team member
│   ├── organizations/
│   │   └── [id]/
│   │       └── route.ts      # GET, PUT: Organization CRUD
│   ├── policies/
│   │   ├── [id]/
│   │   │   ├── beneficiaries/
│   │   │   │   └── route.ts  # POST, DELETE: Link/unlink beneficiaries
│   │   │   └── route.ts      # GET, PUT, DELETE: Policy CRUD
│   │   └── route.ts          # GET, POST: List/create policies
│   ├── search/
│   │   └── route.ts          # GET: Global search (clients, policies)
│   ├── subscriptions/
│   │   └── create-checkout/
│   │       └── route.ts      # POST: Create subscription checkout
│   ├── team/
│   │   └── [id]/
│   │       └── route.ts      # PUT: Update team member role
│   └── webhooks/
│       └── stripe/
│           └── route.ts      # POST: Stripe webhook handler
│
├── client-portal/            # Client-facing portal
│   ├── layout.tsx            # Client portal layout with navigation
│   ├── page.tsx              # Client overview page
│   └── policies/
│       ├── NewClientPolicyForm.tsx  # Client-side policy form
│       └── page.tsx          # Client policies list
│
├── dashboard/                # Attorney dashboard
│   ├── _components/          # Private: Dashboard components
│   │   └── SidebarNav.tsx    # Sidebar navigation component
│   ├── analytics/
│   │   └── page.tsx          # Firm analytics dashboard
│   ├── billing/
│   │   ├── BillingActions.tsx # Billing plan selection component
│   │   └── page.tsx          # Billing & subscription page
│   ├── clients/
│   │   ├── [id]/
│   │   │   ├── _components/  # Private: Client-specific components
│   │   │   │   └── InviteClientButton.tsx
│   │   │   ├── ClientActivityFeed.tsx  # Client activity log component
│   │   │   ├── edit/
│   │   │   │   └── page.tsx  # Edit client form
│   │   │   ├── page.tsx      # Client detail page (Overview/Activity tabs)
│   │   │   └── policies/
│   │   │       └── new/
│   │   │           └── page.tsx  # Add policy form
│   │   └── page.tsx          # Clients list page
│   ├── GlobalSearch.tsx      # Global search component
│   ├── layout.tsx            # Dashboard layout (sidebar + top bar)
│   ├── page.tsx              # Dashboard home page
│   ├── settings/
│   │   └── org/
│   │       ├── OrgSettingsForm.tsx  # Organization settings form
│   │       └── page.tsx      # Organization settings page
│   └── team/
│       ├── TeamManagement.tsx  # Team management component
│       └── page.tsx          # Team management page
│
├── invite/                   # Client invitation flow
│   └── [token]/
│       ├── InvitePortal.tsx  # Invite acceptance portal (client component)
│       └── page.tsx          # Invite acceptance page
│
├── sign-in/                  # Clerk sign-in page
│   └── [[...sign-in]]/
│       └── page.tsx          # Clerk SignIn component
│
├── sign-up/                  # Clerk sign-up page
│   └── [[...sign-up]]/
│       └── page.tsx          # Clerk SignUp component
│
├── favicon.ico               # Site favicon
├── global-error.tsx          # Global error boundary
├── globals.css               # Global styles (Tailwind)
├── layout.tsx                # Root layout (ClerkProvider, fonts)
└── page.tsx                  # Landing page (marketing)
```

### Library Utilities (`src/lib/`)

```
src/lib/
├── audit.ts                  # Audit logging utilities
├── authz.ts                  # Authorization helpers (requireOrgRole, requireAttorneyOrOwner)
├── client-limits.ts          # Plan-based client limit enforcement
├── db.ts                     # Prisma client export (alias for prisma.ts)
├── email.ts                  # Email sending (Resend integration)
├── http.ts                   # HTTP response helpers (jsonOk, jsonError)
├── logger.ts                 # Structured logging utilities
├── plan.ts                   # Billing plan utilities (getClientLimitForPlan)
├── prisma.ts                 # Prisma client instance
├── rate-limit.ts             # Rate limiting utility
├── stripe.ts                 # Stripe client initialization
└── utils/                    # Additional utilities
    ├── clerk.ts              # Clerk-specific utilities
    └── invites.ts            # Invite management utilities
```

### PDF Generation (`src/pdfs/`)

```
src/pdfs/
└── ClientRegistrySummary.tsx  # React-PDF component for client summary PDFs
```

### Types (`src/types/`)

```
src/types/
└── index.ts                  # TypeScript type definitions
```

### Configuration Files

```
src/
├── instrumentation.ts        # Sentry instrumentation (server)
├── instrumentation-client.ts  # Sentry instrumentation (client)
└── proxy.ts                  # Next.js proxy for Clerk authentication
```

## Database Structure (`prisma/`)

```
prisma/
├── schema.prisma             # Prisma schema definition
└── migrations/               # Database migrations
    ├── 20251206003916_init/
    ├── 20251206054415_add_client_invite/
    ├── 20251206054848_access_grant_unique/
    ├── 20251206060000_org_contact_fields/
    ├── 20251206060234_add_billing_fields/
    ├── 20251206060320_org_billing_fields/
    ├── 20251206064201_make_slug_required/
    ├── 20251206070000_audit_log_and_org_role/
    ├── 20251206095202_audit_read_actions/
    └── migration_lock.toml
```

## Key Models (from `schema.prisma`)

- **User**: User accounts synced with Clerk
- **Organization**: Law firms with billing plans and contact info
- **OrgMember**: Links users to organizations with roles (OWNER, ATTORNEY, STAFF)
- **Client**: Individual clients scoped to organizations
- **Policy**: Insurance policies (no amounts stored)
- **Insurer**: Insurance company information
- **Beneficiary**: Policy beneficiaries
- **PolicyBeneficiary**: Links beneficiaries to policies
- **AccessGrant**: Organization-level client access control
- **ClientInvite**: Secure invitation system
- **AuditLog**: Complete audit trail

## Route Organization

### Public Routes
- `/` - Landing page
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/invite/[token]` - Client invitation acceptance

### Protected Routes (Require Authentication)

#### Client Portal
- `/client-portal` - Client overview
- `/client-portal/policies` - Client's policies

#### Attorney Dashboard
- `/dashboard` - Dashboard home
- `/dashboard/clients` - Client list
- `/dashboard/clients/[id]` - Client detail (Overview/Activity tabs)
- `/dashboard/clients/[id]/edit` - Edit client
- `/dashboard/clients/[id]/policies/new` - Add policy
- `/dashboard/analytics` - Firm analytics
- `/dashboard/billing` - Billing & subscriptions
- `/dashboard/team` - Team management
- `/dashboard/settings/org` - Organization settings

## API Endpoints

### Clients
- `GET /api/clients` - List clients (filtered by organization)
- `POST /api/clients` - Create client
- `GET /api/clients/[id]` - Get client details
- `PUT /api/clients/[id]` - Update client
- `POST /api/clients/[id]/invite` - Send client invitation
- `GET /api/clients/[id]/summary-pdf` - Download client summary PDF

### Policies
- `GET /api/policies` - List policies (filtered by clientId)
- `POST /api/policies` - Create policy
- `GET /api/policies/[id]` - Get policy details
- `PUT /api/policies/[id]` - Update policy
- `DELETE /api/policies/[id]` - Delete policy
- `POST /api/policies/[id]/beneficiaries` - Link beneficiary to policy
- `DELETE /api/policies/[id]/beneficiaries` - Unlink beneficiary from policy

### Beneficiaries
- `POST /api/beneficiaries` - Create beneficiary

### Invites
- `GET /api/invites` - List invites
- `POST /api/invites` - Create invite
- `GET /api/invites/[token]` - Get invite details
- `POST /api/invites/accept` - Accept invitation

### Search
- `GET /api/search?q=...` - Global search (clients, policies)

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Team Management
- `POST /api/org/team/invite` - Invite team member
- `PUT /api/team/[id]` - Update team member role

## Key Features by Directory

### Authentication & Authorization
- **Clerk Integration**: `src/app/layout.tsx`, `src/proxy.ts`
- **Authorization Helpers**: `src/lib/authz.ts`
- **Role-Based Access**: OWNER, ATTORNEY, STAFF roles

### Client Management
- **Client CRUD**: `src/app/api/clients/`
- **Client UI**: `src/app/dashboard/clients/`
- **Client Portal**: `src/app/client-portal/`

### Policy Management
- **Policy CRUD**: `src/app/api/policies/`
- **Policy Forms**: `src/app/dashboard/clients/[id]/policies/new/`

### Invitation System
- **Invite Creation**: `src/app/api/clients/[id]/invite/`
- **Invite Acceptance**: `src/app/invite/[token]/`
- **Email Sending**: `src/lib/email.ts`

### Billing & Subscriptions
- **Stripe Integration**: `src/lib/stripe.ts`
- **Checkout**: `src/app/api/billing/checkout/`
- **Webhooks**: `src/app/api/webhooks/stripe/`
- **Plan Limits**: `src/lib/plan.ts`, `src/lib/client-limits.ts`

### Audit & Logging
- **Audit Logging**: `src/lib/audit.ts`
- **Activity Feeds**: `src/app/dashboard/clients/[id]/ClientActivityFeed.tsx`
- **Structured Logging**: `src/lib/logger.ts`

### PDF Generation
- **PDF Component**: `src/pdfs/ClientRegistrySummary.tsx`
- **PDF Route**: `src/app/api/clients/[id]/summary-pdf/`

### Security
- **Rate Limiting**: `src/lib/rate-limit.ts`
- **Security Headers**: `next.config.mjs`
- **Error Monitoring**: Sentry integration

## Environment Variables

Required environment variables (see `.env.local`):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_APP_URL` - Application URL
- `RESEND_API_KEY` - Resend API key for emails
- `RESEND_FROM_EMAIL` - Email sender address
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PRICE_SOLO` - Stripe price ID for Solo plan
- `STRIPE_PRICE_SMALL_FIRM` - Stripe price ID for Small Firm plan
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Neon (PostgreSQL) with Prisma ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **PDF Generation**: @react-pdf/renderer
- **Email**: Resend
- **Payments**: Stripe
- **Error Monitoring**: Sentry
- **Validation**: Zod

## Notes

- All API routes use server-side authentication via Clerk
- Authorization is enforced using `requireOrgRole()` and `requireAttorneyOrOwner()` helpers
- Client limits are enforced based on billing plans
- All actions are logged to the audit trail
- PDF exports are generated server-side using React-PDF
- Rate limiting is available for API routes via `rateLimit()` utility
