# Testing Stripe Payments

## Quick Test Guide

### Option 1: Test with Buy Button (Live Mode)

Your Buy Button is configured with a **live** publishable key. To test:

1. **Navigate to billing page**: `/dashboard/billing`
2. **Click the Buy Button** (if registry is inactive)
3. **Use Stripe test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

**Note**: Since you're using a **live** key, this will create a **real** subscription. For true testing, you should:
- Switch to test mode keys, OR
- Use Stripe's test mode in the Dashboard

### Option 2: Test Checkout Endpoint

Use the custom checkout endpoint which respects your Stripe key mode:

```bash
# POST to /api/billing/checkout
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Cookie: your-auth-cookie"
```

### Option 3: Test Webhook Locally

1. **Install Stripe CLI**:
   ```bash
   # Windows (using Scoop)
   scoop install stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

4. **Trigger test events**:
   ```bash
   # Test subscription created
   stripe trigger customer.subscription.created
   
   # Test invoice paid
   stripe trigger invoice.paid
   
   # Test checkout completed
   stripe trigger checkout.session.completed
   ```

### Test Cards (Stripe)

**Success cards:**
- `4242 4242 4242 4242` - Visa (succeeds)
- `5555 5555 5555 4444` - Mastercard (succeeds)
- `3782 822463 10005` - American Express (succeeds)

**Decline cards:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

**3D Secure:**
- `4000 0027 6000 3184` - Requires authentication

### Verify Webhook is Working

After a test payment:

1. **Check webhook logs** in Stripe Dashboard → Developers → Webhooks
2. **Check database**:
   ```sql
   SELECT * FROM organizations WHERE stripe_customer_id IS NOT NULL;
   SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT 10;
   ```
3. **Check organization status**:
   ```sql
   SELECT id, name, billing_status, stripe_customer_id, stripe_subscription_id 
   FROM organizations;
   ```

### Important Notes

⚠️ **Your Buy Button uses LIVE keys** - test payments will create real subscriptions!

To test safely:
1. Use Stripe **test mode** keys in `.env.local`
2. Or use the Stripe Dashboard test mode
3. Or create a separate test Buy Button with test keys

### Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_test_...  # Use test key for testing
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe Dashboard
STRIPE_PRICE_FIRM=price_...  # Your price ID
APP_URL=http://localhost:3000  # For webhook callbacks
```


