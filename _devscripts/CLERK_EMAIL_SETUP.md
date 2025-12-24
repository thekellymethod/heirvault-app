# Clerk Email Configuration Guide

## Issue: Not Receiving Authentication Codes

If new users aren't receiving authentication codes (magic links, verification codes, etc.), you need to configure email in your Clerk Dashboard.

## Quick Fix for Development

### Option 1: Use Clerk's Test Email (Development Only)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to: **Your Application → Email & SMS → Email**
3. Enable **"Use test email"** for development
4. Test emails will be shown in the Clerk Dashboard under **"Test Emails"** tab

### Option 2: Configure Real Email Provider

For production or to receive real emails:

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to**: Your Application → Email & SMS → Email
3. **Choose an email provider**:
   - **Resend** (Recommended - same as your app uses)
   - **SendGrid**
   - **Mailgun**
   - **AWS SES**
   - **SMTP** (Custom)

### Using Resend (Recommended)

Since your app already uses Resend for client invites, use the same for Clerk:

1. **In Clerk Dashboard**:
   - Go to Email & SMS → Email
   - Select **Resend**
   - Enter your Resend API key (same as `RESEND_API_KEY` in your `.env.local`)
   - Set the "From" email address (must be verified in Resend)

2. **Verify your domain in Resend**:
   - Go to [Resend Dashboard](https://resend.com/domains)
   - Add and verify your domain
   - Use a verified domain email for the "From" address

### Using SMTP (Alternative)

If you prefer SMTP:

1. **In Clerk Dashboard**:
   - Go to Email & SMS → Email
   - Select **SMTP**
   - Enter your SMTP settings:
     - Host: `smtp.resend.com` (if using Resend)
     - Port: `465` (SSL) or `587` (TLS)
     - Username: `resend`
     - Password: Your Resend API key
     - From email: Your verified Resend email

## Environment Variables

Make sure you have these set in `.env.local`:

```env
# Resend (for app emails - client invites)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Note: Clerk email configuration is done in Clerk Dashboard, not env vars
```

## Testing

1. **Test in Development**:
   - Use Clerk's test email feature
   - Check the "Test Emails" tab in Clerk Dashboard

2. **Test with Real Email**:
   - Configure Resend or another provider
   - Try signing up a new user
   - Check spam folder if email doesn't arrive

## Common Issues

1. **Email going to spam**: 
   - Verify your domain in Resend
   - Use a proper "From" address
   - Check spam folder

2. **No email provider configured**:
   - Clerk defaults to test emails in development
   - Must configure a provider for production

3. **Wrong email address**:
   - Double-check the email entered during sign-up
   - Check for typos

## Next Steps

1. Go to Clerk Dashboard → Email & SMS → Email
2. Enable test emails for development OR configure Resend
3. Try signing up a new user again
4. Check the email (or Clerk Dashboard test emails tab)

