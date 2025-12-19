# HeirVault

> Locate your clients' life insurance relationships in one place.

A secure, private registry where attorneys can manage client life insurance policies and beneficiaries. Clients upload information via secure invitation links without needing accounts.

## 🎯 Key Features

### For Attorneys
- **Attorney-Only Accounts**: Only verified attorneys can create accounts
- **Global Client Access**: All attorneys can view and manage all clients globally
- **Client Invitation System**: Invite clients via secure email links with customizable tokens
- **Test Code System**: Automatic test code generation (any code starting with `TEST-`)
- **Client Management**: Complete CRUD operations for clients, policies, and beneficiaries
- **QR Code Updates**: Clients can update information by scanning QR codes from receipts
- **Receipt Generation**: Automatic receipt generation with PDF download and print
- **Email Notifications**: Confirmation emails sent to both clients and attorneys
- **Global Search**: Search across all clients and policies from anywhere
- **Analytics Dashboard**: Firm-level analytics and insights
- **PDF Export**: Generate professional client summary PDFs
- **Audit Logging**: Complete audit trail of all actions

### For Clients
- **No Account Required**: Clients access via secure invitation links
- **Policy Upload**: Upload policy documents via invitation portal
- **Information Updates**: Update information via QR code scan or receipt number
- **Confirmation Codes**: Email/phone verification for secure updates
- **Receipt Access**: View and download receipts after submission

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (attorney-only)
- **Styling**: Tailwind CSS 4
- **TypeScript**: Full type safety
- **PDF Generation**: @react-pdf/renderer
- **Email**: Resend
- **QR Code Scanning**: jsQR
- **OCR**: Tesseract.js for document extraction
- **Payments**: Stripe (optional)
- **Error Monitoring**: Sentry

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Clerk account for authentication
- Resend account for email (optional)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/thekellymethod/heirvault-app.git
cd heir-vault
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up Database**:
   - Create a PostgreSQL database
   - Run Drizzle migrations:
   ```bash
   npm run db:migrate
   ```
   - Or push schema directly (development):
   ```bash
   npm run db:push
   ```

4. **Set up Clerk Authentication**:
   - Create a Clerk account at [clerk.com](https://clerk.com)
   - Create a new application
   - Get your publishable key and secret key

5. **Configure environment variables**:
   Create a `.env.local` file with:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/database"
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/attorney/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/attorney/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/attorney/onboard"
   
   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   
   # Email (Resend)
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="noreply@yourdomain.com"
   
   # Stripe (optional, for billing)
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

6. **Run the development server**:
```bash
npm run dev
```

7. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                          # API routes
│   │   ├── clients/                  # Client CRUD operations
│   │   │   ├── [id]/                 # Individual client operations
│   │   │   │   ├── route.ts          # GET, PUT, DELETE
│   │   │   │   ├── policies/         # Client policies
│   │   │   │   └── summary-pdf/      # PDF generation
│   │   │   └── invite/               # Client invitation creation
│   │   ├── invite/[token]/           # Invitation portal routes
│   │   │   ├── upload-policy/         # Policy upload
│   │   │   ├── update-client/        # Client updates
│   │   │   ├── receipt/              # Receipt viewing
│   │   │   └── receipt-pdf/           # Receipt PDF
│   │   ├── policies/                 # Policy management
│   │   ├── beneficiaries/           # Beneficiary management
│   │   ├── insurers/                # Insurer management
│   │   ├── search/                    # Global search
│   │   ├── user/profile/             # User profile updates
│   │   └── organizations/           # Organization management
│   ├── dashboard/                    # Attorney dashboard
│   │   ├── clients/                  # Client management
│   │   │   ├── [id]/                 # Client detail pages
│   │   │   │   └── policies/         # Client policies view
│   │   │   └── invite/               # Client invitation page
│   │   ├── beneficiaries/           # Beneficiaries view
│   │   ├── team/                     # Team management
│   │   ├── analytics/                # Analytics dashboard
│   │   ├── billing/                 # Billing & subscriptions
│   │   └── settings/                 # Settings pages
│   ├── invite/[token]/               # Client invitation portal
│   │   ├── page.tsx                  # Initial policy upload
│   │   └── update/                   # Update portal
│   ├── update-policy/                 # Policy update flow
│   │   └── [token]/                  # Update by token
│   │       └── receipt/              # Receipt display
│   └── attorney/                     # Attorney onboarding
├── lib/
│   ├── db/
│   │   ├── index.ts                  # Drizzle database client
│   │   ├── schema.ts                 # Drizzle schema definitions
│   │   └── enums.ts                  # Database enums
│   ├── db.ts                         # Database client export
│   ├── utils/
│   │   └── clerk.ts                  # Clerk utilities & auth
│   ├── authz.ts                      # Authorization helpers
│   ├── audit.ts                      # Audit logging
│   ├── email.ts                      # Email sending
│   ├── ocr.ts                        # OCR extraction
│   ├── test-invites.ts               # Test code system
│   ├── invite-lookup.ts              # Invite lookup helpers
│   └── client-fingerprint.ts         # Client deduplication
├── components/
│   ├── ui/                           # UI components
│   └── QRScanner.tsx                 # QR code scanner
└── pdfs/                             # PDF generation components
```

## 🗄️ Database Schema

### Key Models

- **User**: Attorney accounts (attorney-only role)
- **Organizations**: Law firms with billing plans
- **OrgMembers**: Links users to organizations
- **Clients**: Client records with fingerprinting for deduplication
- **Policies**: Insurance policies linked to insurers
- **Beneficiaries**: Policy beneficiaries with relationships
- **PolicyBeneficiaries**: Links beneficiaries to policies
- **ClientInvites**: Secure invitation system with tokens
- **Insurers**: Insurance company information
- **AuditLogs**: Complete audit trail

### Key Features

- **Client Fingerprinting**: SHA-256 hash prevents duplicate clients
- **Unique Constraints**: Email, fingerprint, and composite indexes
- **Cascade Deletes**: Automatic cleanup of related records
- **Address Fields**: Separate address fields for clients, beneficiaries, and attorneys
- **Composite Indexes**: Optimized for name/DOB and address searches

See `src/lib/db/schema.ts` for the complete Drizzle schema.

## 🔐 Security & Data Protection

- **Attorney-Only Accounts**: Only verified attorneys can create accounts
- **No Client Accounts**: Clients access via secure invitation links only
- **Client Fingerprinting**: Prevents duplicate client records
- **Secure Invites**: Time-limited tokens with expiration
- **Confirmation Codes**: Email/phone verification for updates
- **Global Access Control**: All attorneys can view all clients (by design)
- **Audit Logging**: Complete audit trail of all actions
- **HTTPS-only** in production
- **Encrypted data at rest** (PostgreSQL)
- **Clerk authentication** with MFA support

## 📋 CRUD Operations

### ✅ Complete CRUD Support

- **Clients**: CREATE, READ, UPDATE, DELETE
- **Policies**: CREATE, READ, UPDATE, DELETE
- **Beneficiaries**: CREATE, READ, DELETE (UPDATE via recreation)
- **Insurers**: CREATE, READ, UPDATE, DELETE
- **Users**: CREATE, READ, UPDATE (DELETE via Clerk)
- **Organizations**: CREATE, READ, UPDATE

All operations use **Drizzle ORM with raw SQL fallback** for maximum reliability.

## 🎫 Client Invitation System

### Features

- **Secure Token-Based**: Each invite has a unique, time-limited token
- **Test Code Support**: Any code starting with `TEST-` is automatically created
- **Email Integration**: Automatic email sending via Resend
- **QR Code Support**: Receipts include QR codes for easy updates
- **Confirmation Codes**: Email/phone verification for secure updates
- **Receipt Generation**: Automatic receipt generation with PDF download

### Test Codes

Test codes are automatically created when accessed. Format:
- `TEST-001`, `TEST-002`, etc. (numbered)
- `TEST-JOHN-DOE` (name-based)
- `TEST-CODE-001` (custom format)

No pre-population needed - the system handles it automatically.

## 🔍 Global Search

- **Global Client Search**: Search across all clients in the system
- **Global Policy Search**: Search across all policies
- **Name/DOB Matching**: Composite index optimization
- **Address Matching**: Address-based searches
- **Fast Queries**: Optimized with database indexes

## 📊 Analytics & Reporting

- **Firm Analytics**: Client counts, policies, beneficiaries
- **Activity Feeds**: Audit logs on client detail pages
- **PDF Export**: Professional client summary PDFs
- **Receipt Generation**: Automatic receipts for all submissions

## 🚢 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

### Quick Deploy Checklist

1. ✅ Set up PostgreSQL database
2. ✅ Configure environment variables
3. ✅ Run Drizzle migrations: `npm run db:migrate`
4. ✅ Build the application: `npm run build`
5. ✅ Deploy to your hosting platform (Vercel, Railway, etc.)

### Important Notes

- **Database Migrations**: Use `npm run db:migrate` for production migrations
- **Schema Management**: Schema is defined in `src/lib/db/schema.ts` using Drizzle ORM
- **Development**: Use `npm run db:push` to sync schema changes during development

## 📚 Documentation

- **`DEPLOYMENT.md`**: Deployment instructions
- **`DEPLOYMENT_CHECKLIST.md`**: Deployment checklist
- **`DATABASE_SEPARATION.md`**: Database architecture and conflict prevention
- **`SYSTEM_VERIFICATION.md`**: Complete system verification report

## 🔄 Recent Updates

### Database Migration
- Migrated from Prisma ORM to Drizzle ORM for better type safety and performance
- Schema is now defined in `src/lib/db/schema.ts`
- All database queries use Drizzle ORM with raw SQL fallback

### Authentication Flow
- Fixed dashboard layout to properly check organization membership
- Improved sign-up flow: `/attorney/sign-up` → `/attorney/sign-up/complete` → `/attorney/onboard` → `/dashboard`
- All attorney accounts require organization membership before accessing dashboard

## 🧪 Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production (includes prisma generate)
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management

```bash
npm run db:generate           # Generate Drizzle migrations
npm run db:migrate            # Run database migrations
npm run db:push               # Push schema changes (development)
npm run db:studio             # Open Drizzle Studio (database GUI)
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**: Verify `DATABASE_URL` in `.env.local`
2. **Schema Mismatches**: Check `src/lib/db/schema.ts` matches database
3. **Build Errors**: Clear `.next` folder and rebuild: `Remove-Item -Recurse -Force .next && npm run build`
4. **Migration Errors**: Run `npm run db:push` to sync schema during development

### Error Handling

The system uses **Drizzle ORM with raw SQL fallback** for maximum reliability. If you encounter database errors:

1. Check database connection
2. Verify schema matches database: `npm run db:push`
3. Check error logs for specific issues
4. Use Drizzle Studio to inspect database: `npm run db:studio`

## 🎯 Roadmap

### ✅ Completed

- [x] Attorney-only account system
- [x] Client invitation system with test codes
- [x] QR code scanning for updates
- [x] Complete CRUD operations
- [x] Global client access
- [x] Client fingerprinting (deduplication)
- [x] Receipt generation with PDF
- [x] Email notifications
- [x] Confirmation codes
- [x] Audit logging
- [x] Database separation and conflict prevention
- [x] Migration from Prisma to Drizzle ORM
- [x] Fixed dashboard routing and authentication flow

### 🚧 Planned

- [ ] Enhanced beneficiary update endpoint
- [ ] Bulk operations
- [ ] Advanced filtering
- [ ] Export functionality (CSV, Excel)
- [ ] Mobile app
- [ ] API documentation
- [ ] Unit and integration tests

## 📄 License

Private - All rights reserved

## 🤝 Support

For issues and questions, please open an issue on GitHub or contact support.

---

**Built with ❤️ for attorneys managing client life insurance relationships**
