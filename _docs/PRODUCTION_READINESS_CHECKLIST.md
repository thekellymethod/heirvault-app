# Production Readiness Checklist

**Last Updated:** January 2025  
**Status:** Pre-Launch Review

This checklist covers all remaining steps before going live with HeirVault.

---

## 🔴 CRITICAL (Must Complete Before Launch)

### 1. Environment Variables Configuration

#### Production Environment (Vercel)
- [ ] **Database**
  - [ ] `DATABASE_URL` - Production Supabase pooled connection (port 6543)
  - [ ] `PRISMA_ACCELERATE_URL` - Production Prisma Accelerate URL (optional but recommended)
  
- [ ] **Authentication (Clerk)**
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk publishable key
  - [ ] `CLERK_SECRET_KEY` - Production Clerk secret key
  - [ ] Configure production domain in Clerk dashboard
  - [ ] Add production domain to Clerk allowed origins

- [ ] **Application URLs**
  - [ ] `NEXT_PUBLIC_APP_URL` - Production domain (e.g., `https://heirvault.app`)
  - [ ] `APP_URL` - Production domain (same as above)

- [ ] **Email (Resend)**
  - [ ] `RESEND_API_KEY` - Production Resend API key
  - [ ] `RESEND_FROM_EMAIL` - Production sender email (e.g., `noreply@heirvault.app`)
  - [ ] Verify domain in Resend dashboard
  - [ ] Set up SPF/DKIM records for email deliverability

- [ ] **Admin Access**
  - [ ] `ADMIN_EMAILS` - Comma-separated list of admin emails
  - [ ] `BOOTSTRAP_ADMIN_EMAIL` - Initial admin email (optional)
  - [ ] `ADMIN_USER_IDS` - Comma-separated list of admin user IDs (optional)

- [ ] **Security**
  - [ ] `HEIRVAULT_TOKEN_SECRET` - Long random string for HMAC signing (32+ characters)

- [ ] **Stripe (if billing enabled)**
  - [ ] `STRIPE_SECRET_KEY` - Production Stripe secret key (starts with `sk_live_`)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production Stripe publishable key (starts with `pk_live_`)
  - [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
  - [ ] Configure webhook endpoint in Stripe dashboard
  - [ ] Test webhook delivery

- [ ] **Optional Services**
  - [ ] `SENTRY_DSN` - Sentry error tracking (already configured)
  - [ ] `SENTRY_AUTH_TOKEN` - For source map uploads
  - [ ] `SENTRY_ORG` - Sentry organization slug
  - [ ] `SENTRY_PROJECT` - Sentry project slug
  - [ ] `OPENAI_API_KEY` - If using AI features (optional)

### 2. Database Setup

- [ ] **Production Database**
  - [ ] Create production Supabase project
  - [ ] Run all Prisma migrations: `npx prisma migrate deploy`
  - [ ] Verify schema matches: `npx prisma migrate status`
  - [ ] Generate Prisma Client: `npx prisma generate`
  - [ ] Test database connection from production environment

- [ ] **Database Backups**
  - [ ] Enable automatic backups in Supabase
  - [ ] Test backup restoration process
  - [ ] Document backup retention policy

- [ ] **Database Security**
  - [ ] Enable Row Level Security (RLS) if using Supabase
  - [ ] Review and test database connection security
  - [ ] Verify SSL/TLS is enforced

### 3. Domain & SSL Configuration

- [ ] **Domain Setup**
  - [ ] Purchase/configure production domain (e.g., `heirvault.app`)
  - [ ] Configure DNS records in Vercel
  - [ ] Verify domain ownership
  - [ ] Set up custom domain in Vercel project settings

- [ ] **SSL/TLS**
  - [ ] Verify SSL certificate is automatically provisioned by Vercel
  - [ ] Test HTTPS enforcement
  - [ ] Verify HSTS header is working

### 4. Legal & Compliance

- [ ] **Legal Pages** ✅ (Already Created)
  - [x] Privacy Policy (`/legal/privacy`)
  - [x] Terms of Service (`/legal/terms`)
  - [x] Legal Disclaimers (`/legal/disclaimers`)
  - [x] Acceptable Use Policy (`/legal/acceptable-use`)
  - [x] Attorney Agreement (`/legal/attorney-agreement`)
  - [x] Information Release Policy (`/legal/information-release`)
  - [x] Compliance Page (`/legal/compliance`)

- [ ] **Legal Review**
  - [ ] Have attorney review all legal pages
  - [ ] Update contact information in legal pages
  - [ ] Verify all disclaimers are accurate
  - [ ] Ensure GDPR compliance language is correct (if serving EU users)

### 5. Security Hardening

- [ ] **Security Headers** ✅ (Already Configured)
  - [x] Content-Security-Policy
  - [x] X-Frame-Options
  - [x] X-Content-Type-Options
  - [x] HSTS
  - [x] Referrer-Policy

- [ ] **Security Review**
  - [ ] Review all API endpoints for proper authentication
  - [ ] Verify rate limiting is working
  - [ ] Test SQL injection prevention
  - [ ] Test XSS prevention
  - [ ] Review admin access controls
  - [ ] Verify audit logging is working

- [ ] **Secrets Management**
  - [ ] Verify no secrets are committed to git
  - [ ] Review `.gitignore` includes `.env*` files
  - [ ] Ensure all secrets are in Vercel environment variables (not code)

### 6. Testing & Quality Assurance

- [ ] **Critical User Flows**
  - [ ] Attorney sign-up and onboarding
  - [ ] Attorney sign-in
  - [ ] Admin sign-in
  - [ ] Client invitation creation
  - [ ] Client policy upload via invite
  - [ ] QR code update flow
  - [ ] Document upload and storage
  - [ ] Receipt generation and download
  - [ ] Contract acceptance flow (Base Tier)
  - [ ] Tier upgrade flows

- [ ] **API Testing**
  - [ ] Test all API endpoints with proper authentication
  - [ ] Test error handling and edge cases
  - [ ] Verify rate limiting works
  - [ ] Test file upload limits and validation

- [ ] **Database Testing**
  - [ ] Test database migrations on production-like environment
  - [ ] Verify data integrity constraints
  - [ ] Test backup and restore procedures

- [ ] **Performance Testing**
  - [ ] Load test critical endpoints
  - [ ] Verify database query performance
  - [ ] Test file upload/download speeds
  - [ ] Check page load times

### 7. Monitoring & Observability

- [ ] **Error Tracking** ✅ (Sentry Configured)
  - [x] Sentry DSN configured
  - [ ] Verify Sentry is capturing errors in production
  - [ ] Set up error alerts/notifications
  - [ ] Configure error sampling rate for production

- [ ] **Application Monitoring**
  - [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
  - [ ] Configure health check endpoint (`/api/health`)
  - [ ] Set up performance monitoring
  - [ ] Configure log aggregation (if needed)

- [ ] **Database Monitoring**
  - [ ] Set up database connection monitoring
  - [ ] Configure slow query alerts
  - [ ] Monitor database size and growth

### 8. Deployment Configuration

- [ ] **Vercel Setup**
  - [ ] Connect GitHub repository to Vercel
  - [ ] Configure build command: `prisma generate && next build`
  - [ ] Configure install command: `npm install`
  - [ ] Set up production environment variables
  - [ ] Configure preview deployments (staging)
  - [ ] Set up deployment protection rules

- [ ] **CI/CD Pipeline**
  - [ ] Verify GitHub Actions workflows are working
  - [ ] Test deployment process
  - [ ] Configure automatic migrations (if using)
  - [ ] Set up deployment notifications

- [ ] **Build Verification**
  - [ ] Run `npm run build` locally and verify no errors
  - [ ] Run `npm run typecheck` and verify no TypeScript errors
  - [ ] Run `npm run lint` and fix any linting errors
  - [ ] Verify Prisma Client generates correctly

---

## 🟡 IMPORTANT (Should Complete Before Launch)

### 9. Content & Copy Review

- [ ] **Marketing Copy**
  - [ ] Review all public-facing copy for accuracy
  - [ ] Verify all links work correctly
  - [ ] Check for typos and grammar errors
  - [ ] Ensure compliance language is correct (NAIC/MIB disclaimers)

- [ ] **User-Facing Messages**
  - [ ] Review error messages for clarity
  - [ ] Review success messages
  - [ ] Review email templates
  - [ ] Test email deliverability

### 10. Documentation

- [ ] **User Documentation**
  - [ ] Create user guide for attorneys
  - [ ] Create client-facing instructions
  - [ ] Document common workflows

- [ ] **Technical Documentation**
  - [x] README.md exists
  - [x] Deployment documentation exists
  - [ ] API documentation (if exposing APIs)
  - [ ] Database schema documentation

### 11. Backup & Disaster Recovery

- [ ] **Backup Strategy**
  - [ ] Configure automated database backups
  - [ ] Test backup restoration
  - [ ] Document backup procedures
  - [ ] Set backup retention policy

- [ ] **Disaster Recovery Plan**
  - [ ] Document recovery procedures
  - [ ] Test recovery scenarios
  - [ ] Identify recovery time objectives (RTO)
  - [ ] Identify recovery point objectives (RPO)

### 12. Performance Optimization

- [ ] **Frontend Performance**
  - [ ] Optimize images (Next.js Image component)
  - [ ] Enable Next.js production optimizations
  - [ ] Test page load speeds
  - [ ] Verify Core Web Vitals

- [ ] **Backend Performance**
  - [ ] Review database query performance
  - [ ] Add database indexes where needed
  - [ ] Optimize API response times
  - [ ] Configure caching where appropriate

### 13. Billing & Payments (If Enabled)

- [ ] **Stripe Configuration**
  - [ ] Set up production Stripe account
  - [ ] Configure products and pricing
  - [ ] Test payment flows
  - [ ] Verify webhook handling
  - [ ] Test subscription management
  - [ ] Test upgrade/downgrade flows

- [ ] **Billing Features**
  - [ ] Test contract acceptance flow
  - [ ] Test tier upgrade modals
  - [ ] Verify billing events ledger is working
  - [ ] Test active estate counting

---

## 🟢 NICE TO HAVE (Can Complete Post-Launch)

### 14. Analytics & Tracking

- [ ] Set up Google Analytics or similar
- [ ] Configure conversion tracking
- [ ] Set up user behavior analytics
- [ ] Configure privacy-compliant tracking (GDPR)

### 15. SEO Optimization ✅ (Already Implemented)

- [x] Meta tags and descriptions
- [x] Open Graph tags
- [x] Twitter Cards
- [x] Structured data (JSON-LD)
- [x] Sitemap (`/sitemap.xml`)
- [x] Robots.txt
- [ ] Verify sitemap is accessible
- [ ] Submit sitemap to search engines

### 16. Additional Features

- [ ] Email templates customization
- [ ] Custom branding/white-labeling
- [ ] Advanced search features
- [ ] Export functionality (CSV, Excel)
- [ ] Bulk operations
- [ ] Mobile app (future)

### 17. Support Infrastructure

- [ ] Set up support email/help desk
- [ ] Create support documentation
- [ ] Set up FAQ page
- [ ] Configure contact forms

---

## 📋 Pre-Launch Verification

### Final Checks (24-48 Hours Before Launch)

- [ ] **Environment Verification**
  ```bash
  # Run these commands to verify setup:
  npm run typecheck      # No TypeScript errors
  npm run lint           # No linting errors
  npm run build          # Successful build
  npx prisma migrate status  # All migrations applied
  ```

- [ ] **Security Audit**
  - [ ] Review all environment variables
  - [ ] Verify no test credentials in production
  - [ ] Check for exposed secrets
  - [ ] Review access logs

- [ ] **Performance Check**
  - [ ] Run Lighthouse audit
  - [ ] Test on multiple devices/browsers
  - [ ] Verify mobile responsiveness
  - [ ] Check page load times

- [ ] **User Acceptance Testing**
  - [ ] Test complete user journey
  - [ ] Verify all features work as expected
  - [ ] Test error scenarios
  - [ ] Verify email delivery

---

## 🚀 Launch Day Checklist

### Launch Day (Day 0)

- [ ] **Pre-Launch (Morning)**
  - [ ] Final environment variable check
  - [ ] Run final database migrations
  - [ ] Verify all services are connected
  - [ ] Test critical paths one more time

- [ ] **Launch (Afternoon)**
  - [ ] Deploy to production
  - [ ] Verify deployment succeeded
  - [ ] Test production site functionality
  - [ ] Monitor error logs
  - [ ] Verify email delivery

- [ ] **Post-Launch (Evening)**
  - [ ] Monitor error rates
  - [ ] Check performance metrics
  - [ ] Review user activity
  - [ ] Address any immediate issues

### Post-Launch (Week 1)

- [ ] Monitor error rates daily
- [ ] Review user feedback
- [ ] Address critical bugs
- [ ] Optimize based on usage patterns
- [ ] Review security logs

---

## 📞 Emergency Contacts

Document key contacts for production issues:
- [ ] Database administrator
- [ ] Hosting provider support
- [ ] Payment processor support
- [ ] Email service support
- [ ] Legal counsel

---

## 🔗 Quick Reference Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Sentry Dashboard**: https://sentry.io
- **Resend Dashboard**: https://resend.com

---

## ✅ Completion Status

**Critical Items:** 0/8 completed  
**Important Items:** 0/5 completed  
**Nice to Have:** 0/4 completed

**Estimated Time to Launch:** 2-4 weeks (depending on testing and legal review)

---

## 📝 Notes

- Most infrastructure is already in place
- Focus on environment configuration and testing
- Legal review may take 1-2 weeks
- Testing should be thorough before launch
- Consider a soft launch with limited users first
