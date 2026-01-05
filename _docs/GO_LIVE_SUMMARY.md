# Go-Live Summary: Remaining Steps

**Quick Reference for Launch Preparation**

---

## 🎯 Top Priority (Do These First)

### 1. **Fix DATABASE_URL Configuration** ⚠️ URGENT
**Current Issue:** Your `.env.local` has an invalid DATABASE_URL with:
- Wrong host: `127.0.0.1` (localhost) instead of Supabase host
- Invalid port: `:54322:5432` (double port)

**Action Required:**
1. Go to Supabase Dashboard → Settings → Database
2. Copy the **Connection pooling** → **Transaction** connection string
3. Update `.env.local` with correct connection string
4. Update Vercel production environment variables

**Expected Format:**
```
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

### 2. **Configure Production Environment Variables**
Set these in **Vercel → Settings → Environment Variables → Production**:

**Required:**
- `DATABASE_URL` - Production Supabase connection
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk key
- `CLERK_SECRET_KEY` - Production Clerk secret
- `NEXT_PUBLIC_APP_URL` - Your production domain
- `RESEND_API_KEY` - Production Resend key
- `RESEND_FROM_EMAIL` - Verified sender email
- `ADMIN_EMAILS` - Your admin email(s)
- `HEIRVAULT_TOKEN_SECRET` - Random 32+ character string

**Optional but Recommended:**
- `PRISMA_ACCELERATE_URL` - For better performance
- `SENTRY_DSN` - Error tracking (already configured)
- `STRIPE_SECRET_KEY` - If using billing
- `STRIPE_WEBHOOK_SECRET` - If using billing

### 3. **Domain & DNS Setup**
- [ ] Purchase/configure production domain
- [ ] Add domain to Vercel project
- [ ] Configure DNS records
- [ ] Verify SSL certificate is active

### 4. **Database Migrations**
- [ ] Run migrations on production database:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify all migrations applied successfully
- [ ] Test database connection from production

### 5. **Email Configuration**
- [ ] Verify domain in Resend dashboard
- [ ] Set up SPF/DKIM records for email deliverability
- [ ] Test email sending from production
- [ ] Verify email templates render correctly

---

## ✅ Already Complete (No Action Needed)

- ✅ Security headers configured
- ✅ Legal pages created (Privacy, Terms, Disclaimers)
- ✅ SEO optimization implemented
- ✅ Sitemap and robots.txt created
- ✅ Compliance documentation exists
- ✅ Incident response playbook created
- ✅ Admin sign-in page created
- ✅ Contract-driven infrastructure implemented
- ✅ Document taxonomy and permissions
- ✅ Billing events ledger
- ✅ Active estate counter

---

## 🧪 Testing (Before Launch)

### Critical User Flows to Test:
1. **Attorney Onboarding**
   - Sign up → Organization creation → Contract acceptance → Dashboard access

2. **Admin Access**
   - Admin sign-in at `/admin/sign-in`
   - Admin dashboard access
   - Admin-only features

3. **Client Management**
   - Create client → Send invite → Client uploads policy → Receipt generation

4. **Document Upload**
   - Test restricted document category enforcement
   - Verify tier-based permissions

5. **Billing (If Enabled)**
   - Contract acceptance
   - Tier upgrade flows
   - Active estate counting

### Quick Test Commands:
```bash
# Verify build works
npm run build

# Check for TypeScript errors
npm run typecheck

# Check for linting errors
npm run lint

# Verify database migrations
npx prisma migrate status
```

---

## 📊 Monitoring Setup

### Already Configured:
- ✅ Sentry error tracking
- ✅ Health check endpoint (`/api/health`)

### Still Needed:
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure Sentry alerts/notifications
- [ ] Set up performance monitoring
- [ ] Configure log aggregation (optional)

---

## 🔒 Security Final Checks

- [ ] Review all API endpoints for authentication
- [ ] Verify rate limiting is working
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Verify no secrets in code (check `.gitignore`)
- [ ] Review admin access controls
- [ ] Test audit logging

---

## 📝 Legal & Compliance

### Already Complete:
- ✅ Privacy Policy
- ✅ Terms of Service
- ✅ Legal Disclaimers
- ✅ Compliance page
- ✅ Incident response playbook

### Still Needed:
- [ ] Have attorney review all legal pages
- [ ] Update contact information in legal pages
- [ ] Verify GDPR compliance (if serving EU users)

---

## 💳 Billing Setup (If Using)

- [ ] Set up production Stripe account
- [ ] Configure products and pricing
- [ ] Test payment flows
- [ ] Configure webhook endpoint
- [ ] Test subscription management

---

## 🚀 Deployment Steps

### 1. Pre-Launch
```bash
npm run typecheck
npm run lint
npm run build
npx prisma migrate status
```

### 2. Vercel Deployment
1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Set build command: `prisma generate && next build`
4. Deploy to production

### 3. Post-Deployment
- [ ] Verify site loads correctly
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Check email delivery

---

## ⏱️ Estimated Timeline

**Minimum (Rush):** 1-2 weeks
- Environment setup: 1-2 days
- Testing: 3-5 days
- Legal review: 3-5 days
- Deployment: 1 day

**Recommended:** 3-4 weeks
- Allows for thorough testing
- Legal review time
- User acceptance testing
- Performance optimization

---

## 🆘 If You Get Stuck

1. **Database Issues:** Check `docs/SUPABASE_QUICK_REFERENCE.md`
2. **Environment Variables:** Check `docs/ENVIRONMENT_SETUP.md`
3. **Deployment:** Check `_devscripts/DEPLOYMENT_CHECKLIST.md`
4. **Security:** Check `_docs/COMPLIANCE_FRAMEWORK.md`

---

## 📋 Quick Checklist

**Before Launch:**
- [ ] DATABASE_URL fixed and tested
- [ ] All production environment variables set in Vercel
- [ ] Domain configured and SSL active
- [ ] Database migrations run on production
- [ ] Email sending tested
- [ ] Critical user flows tested
- [ ] Legal pages reviewed
- [ ] Security audit completed
- [ ] Monitoring configured
- [ ] Backup strategy in place

**Launch Day:**
- [ ] Final deployment
- [ ] Smoke test all critical paths
- [ ] Monitor error logs
- [ ] Verify email delivery
- [ ] Check performance metrics

---

**Full detailed checklist:** See `_docs/PRODUCTION_READINESS_CHECKLIST.md`
