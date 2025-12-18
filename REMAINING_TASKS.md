# Remaining Tasks & Improvements

## 🔴 High Priority (Core Features)

### 1. **OCR/Document Extraction** ⚠️ Placeholder
- **Status**: Currently returns empty data
- **Location**: `src/app/api/documents/extract-policy/route.ts`
- **Action Needed**: 
  - Choose OCR solution (Tesseract.js, Google Cloud Vision, AWS Textract, or pdf-parse)
  - Implement text extraction from PDFs/images
  - Parse extracted text to extract: name, email, phone, DOB, policy number, insurer name
  - See `OCR_IMPLEMENTATION.md` for detailed guide

### 2. **Email Sending for Invites** ⚠️ TODO
- **Status**: Invite creation works, but emails aren't sent
- **Location**: `src/app/api/invites/route.ts` (line 24)
- **Action Needed**:
  - Set up Resend or email service
  - Create email template for client invites
  - Send email with invite link when invite is created
  - Add email notifications for other events (policy updates, etc.)

## 🟡 Medium Priority (Enhancements)

### 3. **Test/Debug Pages Cleanup**
- **Status**: Debug pages exist in production code
- **Location**: 
  - `src/app/test-auth/page.tsx`
  - `src/app/api/debug/` (if exists)
- **Action Needed**:
  - Remove or protect with environment check (`process.env.NODE_ENV === 'development'`)
  - Update middleware to only allow in dev mode

### 4. **Billing - Contact Sales**
- **Status**: Shows "coming soon"
- **Location**: `src/app/dashboard/billing/BillingActions.tsx` (line 90)
- **Action Needed**:
  - Add contact form or link to sales email/calendar
  - Or remove if not needed

## 🟢 Low Priority (Nice to Have)

### 5. **Error Handling & User Feedback**
- Add toast notifications for success/error messages
- Improve error messages throughout the app
- Add loading skeletons instead of just "Loading..." text

### 6. **Data Validation**
- Add client-side validation to all forms
- Add better error messages for validation failures
- Add input sanitization

### 7. **UI/UX Improvements**
- Add empty states with helpful messages
- Add pagination for large lists (clients, policies, beneficiaries)
- Improve responsive design for mobile
- Add keyboard shortcuts for common actions

### 8. **Performance Optimizations**
- Add pagination to API endpoints that return lists
- Implement caching where appropriate
- Optimize database queries (add indexes if needed)

### 9. **Testing**
- Add unit tests for utilities
- Add integration tests for API routes
- Add E2E tests for critical flows (client creation, policy creation)

### 10. **Documentation**
- API documentation
- User guide/documentation
- Deployment guide

## ✅ Recently Completed

- ✅ Client creation with insurer selection and policy input
- ✅ Document upload UI (OCR extraction pending)
- ✅ Beneficiary creation on policy pages
- ✅ Date of birth timezone fixes
- ✅ Policy locator page
- ✅ NAIC insurance company search

## 📋 Quick Wins (Can be done quickly)

1. **Remove/Protect Debug Pages** (5 min)
   - Add environment check to test-auth page
   - Update middleware

2. **Add Toast Notifications** (30 min)
   - Install react-hot-toast or similar
   - Add success/error toasts to key actions

3. **Improve Empty States** (1 hour)
   - Add helpful messages and CTAs
   - Add illustrations/icons

4. **Add Form Validation** (2 hours)
   - Add Zod validation to client-side forms
   - Show inline error messages

## 🎯 Recommended Next Steps

1. **Implement OCR** - This is a key feature that's currently non-functional
2. **Set up Email Service** - Invites won't work properly without email
3. **Clean up Debug Code** - Security/cleanliness
4. **Add User Feedback** - Toast notifications for better UX

