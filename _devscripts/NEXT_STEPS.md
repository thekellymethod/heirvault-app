# Next Steps for HeirVault

## 🎯 Immediate Priorities

### 1. **Set Up Clerk Authentication** (Required to test)
- [ ] Create Clerk account at [clerk.com](https://clerk.com)
- [ ] Create new application
- [ ] Add keys to `.env.local`:
  ```env
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- [ ] Test sign-in/sign-up flow
- [ ] Verify user sync to database works

### 2. **Build Client Management UI** (Core Feature)
- [ ] Create `/dashboard/clients/new` - Add client form
- [ ] Create `/dashboard/clients/[id]` - Client detail view
- [ ] Create `/dashboard/clients/[id]/edit` - Edit client form
- [ ] Add client list with search/filter
- [ ] Add "Invite Client" button/flow

### 3. **Build Policy Management UI** (Core Feature)
- [ ] Create `/dashboard/policies/new` - Add policy form
- [ ] Create `/dashboard/policies/[id]` - Policy detail view
- [ ] Create `/dashboard/policies/[id]/edit` - Edit policy form
- [ ] Link policies to beneficiaries
- [ ] Add insurer selection/creation

### 4. **Build Beneficiary Management UI** (Core Feature)
- [ ] Create `/dashboard/beneficiaries/new` - Add beneficiary form
- [ ] Create `/dashboard/beneficiaries/[id]` - Beneficiary detail view
- [ ] Create `/dashboard/beneficiaries/[id]/edit` - Edit beneficiary form
- [ ] Link beneficiaries to policies
- [ ] Show which policies have this beneficiary

## 🚀 Secondary Priorities

### 5. **Organization Management**
- [ ] Create organization setup flow
- [ ] Add organization members management
- [ ] Add role management (owner, admin, member)
- [ ] Organization settings page

### 6. **Improve Dashboard**
- [ ] Add navigation sidebar/header
- [ ] Add quick stats (total clients, policies, beneficiaries)
- [ ] Add recent activity feed
- [ ] Add search functionality
- [ ] Improve client cards with more info

### 7. **PDF Export** (MVP Requirement)
- [ ] Create PDF generation service
- [ ] Build Policy & Beneficiary Summary template
- [ ] Add export button to client detail page
- [ ] Format for probate/estate planning use

### 8. **Email Integration**
- [ ] Set up email service (Resend, SendGrid, etc.)
- [ ] Send invite emails with secure links
- [ ] Email notifications for updates
- [ ] Email templates

## 🔧 Technical Improvements

### 9. **Error Handling & Validation**
- [ ] Add form validation (Zod schemas)
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Add toast notifications

### 10. **UI/UX Enhancements**
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Improve responsive design
- [ ] Add dark mode toggle
- [ ] Add accessibility improvements

### 11. **Testing & Quality**
- [ ] Add unit tests for utilities
- [ ] Add integration tests for API routes
- [ ] Add E2E tests for critical flows
- [ ] Set up CI/CD

## 📋 Recommended Order

**Phase 1: Foundation (Week 1)**
1. Set up Clerk ✅
2. Build Client Management UI
3. Test end-to-end client flow

**Phase 2: Core Features (Week 2)**
4. Build Policy Management UI
5. Build Beneficiary Management UI
6. Link policies to beneficiaries

**Phase 3: Polish (Week 3)**
7. PDF Export
8. Organization Management
9. Email Integration

**Phase 4: Enhancement (Week 4+)**
10. UI/UX improvements
11. Testing
12. Performance optimization

## 🎨 Quick Wins

These can be done quickly to improve the app:

- [ ] Add a proper navigation header/sidebar
- [ ] Add loading states to all pages
- [ ] Add error messages for failed operations
- [ ] Add success toasts for completed actions
- [ ] Add empty states ("No clients yet", etc.)
- [ ] Add search/filter to client list
- [ ] Add pagination for large lists

## 📝 Notes

- All database operations use Prisma
- All authentication uses Clerk
- All API routes are in `/app/api/`
- All pages are in `/app/` using App Router
- TypeScript types are in `/src/types/`

## 🚨 Blockers

Before building UI, make sure:
- ✅ Database is set up (Neon)
- ✅ Prisma migrations are run
- ⚠️ Clerk is configured (needs keys)
- ✅ Environment variables are set

---

**Ready to start?** I recommend beginning with **Client Management UI** as it's the foundation for everything else. Should I start building that?

