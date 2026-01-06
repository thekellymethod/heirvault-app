# Outreach Setup Checklist - Ready for Tomorrow

## ✅ Code Status
- [x] Admin outreach page created (`/admin/outreach`)
- [x] Email sending API implemented
- [x] Resend package installed
- [x] CSV parsing and bulk send ready

## 🔧 Required Setup (Do Today)

### 1. Environment Variables

Add these to `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY="re_..."  # Get from https://resend.com/api-keys
MAIL_FROM="HeirVault <support@heirvault.app>"  # Must be verified domain in Resend

# Admin Authentication
ADMIN_TOKEN="your-long-random-string-here"  # Generate a secure random string
NEXT_PUBLIC_ADMIN_TOKEN="your-long-random-string-here"  # Same value for UI
NEXT_PUBLIC_MAIL_FROM="HeirVault <support@heirvault.app>"  # Optional, for UI
```

**How to get Resend API Key:**
1. Go to https://resend.com
2. Sign up/login
3. Navigate to API Keys
4. Create new API key
5. Copy the key (starts with `re_`)

**How to verify domain in Resend:**
1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `heirvault.app`)
3. Add the DNS records they provide
4. Wait for verification (usually 5-15 minutes)
5. Once verified, you can use `support@heirvault.app` as sender

**Generate Admin Token:**
```bash
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use online generator: https://randomkeygen.com/
```

### 2. Test the Setup

**Step 1: Restart Dev Server**
```bash
npm run dev
```

**Step 2: Visit Admin Page**
- Go to: `http://localhost:3000/admin/outreach`
- You should see the outreach console

**Step 3: Test Single Send**
- Fill in:
  - Firm: "Test Law Firm"
  - Attorney: "Test Attorney"
  - Email: **Your own email** (to test)
- Click "Send Email"
- Check your inbox for the test email

**Step 4: Verify Email Received**
- Check spam folder if needed
- Verify the email looks correct
- Check that personalization works (firm name appears)

### 3. Prepare Your Attorney List

**CSV Format:**
```csv
firm,attorney,email
Evans & Davis,John Doe,john@evansdavis.com
Smith Law Group,Jane Smith,jane@smithlaw.com
```

**Tips:**
- Header row is optional (will auto-detect)
- Can use comma, tab, or pipe (`|`) as delimiter
- Duplicate emails will be automatically removed
- Invalid emails will be skipped

**Recommended Approach:**
1. Start with 5-10 test emails to yourself/colleagues
2. Then send to 10-20 real attorneys
3. Wait 24 hours before sending more
4. Gradually increase volume

### 4. Email Best Practices

**Rate Limiting:**
- Current throttle: 250ms between emails (4 per second)
- **Recommended:** Start with 10-20 emails per day for first week
- **After warm-up:** Can increase to 50-100 per day

**To increase throttle (safer):**
Edit `src/app/api/admin/outreach/send/route.ts` line 93:
```typescript
await new Promise((res) => setTimeout(res, 2000)); // 2 seconds = safer
```

**Subject Line:**
- Current: "Life insurance documentation gaps we're seeing in estates"
- Can customize in the UI code if needed

**From Address:**
- Must be verified domain in Resend
- Current: `HeirVault <support@heirvault.app>`
- Can change via `MAIL_FROM` env var

## 🚨 Critical Checks Before Tomorrow

### Pre-Flight Checklist

- [ ] Resend API key is set in `.env.local`
- [ ] Domain is verified in Resend dashboard
- [ ] `MAIL_FROM` email matches verified domain
- [ ] `ADMIN_TOKEN` is set (same value for both vars)
- [ ] Test email sent successfully to your own email
- [ ] Test email received and looks correct
- [ ] Attorney list CSV is prepared
- [ ] Dev server restarted after env changes

### Security Notes

- **Admin Token:** Keep this secret! Don't commit to git
- **Resend API Key:** Never expose to client-side
- **Rate Limits:** Start slow to avoid spam flags

## 📧 Email Template Preview

The email will look like:

```
Dear [Attorney Name],

I'm reaching out to [Firm Name] because we've been seeing a recurring issue during estate administration: life insurance policies that exist, but are difficult to locate or verify when needed.

[... rest of email ...]

Best regards,
Dr. Robert Kelly, DC
Founder, HeirVault
support@heirvault.app
```

## 🐛 Troubleshooting

**"Unauthorized" error:**
- Check `ADMIN_TOKEN` is set correctly
- Check `NEXT_PUBLIC_ADMIN_TOKEN` matches
- Restart dev server after changing env vars

**Email not sending:**
- Verify Resend API key is correct
- Check domain is verified in Resend
- Check `MAIL_FROM` matches verified domain
- Check Resend dashboard for error logs

**Emails going to spam:**
- Normal for first few sends
- Make sure domain is verified
- Start with small batches
- Include unsubscribe option (future enhancement)

## 🎯 Tomorrow's Action Plan

1. **Morning:**
   - Final test send to yourself
   - Prepare first batch (10-20 attorneys)
   - Double-check CSV format

2. **Send:**
   - Use "Single Send" for first few (manual control)
   - Or use "Bulk Send" with small CSV
   - Monitor results in the UI

3. **After Send:**
   - Check Resend dashboard for delivery status
   - Monitor for replies
   - Track opens/clicks if using Resend analytics

## 📊 Monitoring

**Resend Dashboard:**
- Go to https://resend.com/emails
- See delivery status
- Check bounce/spam reports
- Monitor sending limits

**App UI:**
- Shows sent/failed counts
- Lists failed email addresses
- Can retry failed sends manually

---

**Ready to go?** Complete the checklist above and you're set for tomorrow!
