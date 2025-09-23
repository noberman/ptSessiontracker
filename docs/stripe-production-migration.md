# Stripe Production Migration Guide

## Overview
This guide covers the steps to migrate from Stripe Sandbox/Test mode to Production for the FitSync SaaS platform.

## Current Status
- ✅ Test mode fully implemented and tested
- ✅ Webhook integration working
- ✅ Customer portal configured
- ✅ Billing page with invoice history
- ⏳ Ready for production migration

## Prerequisites

### 1. Production Stripe Account Setup
- [ ] Verify business information in Stripe Dashboard
- [ ] Complete identity verification (if required)
- [ ] Set up bank account for payouts
- [ ] Configure tax settings if applicable

### 2. Production Products & Pricing
- [ ] Create "FitSync Professional" product in live mode
- [ ] Set up $15/month recurring price
- [ ] Note the production price ID (price_xxx)
- [ ] Configure statement descriptor (Settings → Business → Public details)
  - Set to "FITSYNC" or "FLOBIT FITSYNC"
  - This appears on customer credit card statements

## Migration Steps

### Step 1: Environment Variables
Update production environment variables in Railway/deployment platform:

```env
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_xxxxx          # Live secret key
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx     # Live publishable key
STRIPE_PRO_PRICE_ID=price_xxxxx          # Live price ID
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # Live webhook secret
```

### Step 2: Webhook Configuration
1. Go to Stripe Dashboard → Webhooks
2. Add production endpoint:
   ```
   https://www.fitsync.io/api/stripe/webhook
   ```
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `billing_portal.session.created`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Step 3: Customer Portal Configuration
1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Configure the same settings as test mode:
   - ✅ Customers can update payment methods
   - ✅ Customers can update billing address
   - ✅ Customers can view invoice history
   - ✅ Customers can download invoices
   - ⚠️ Configure cancellation policy based on business needs

### Step 4: Data Migration Considerations

#### Option A: Fresh Start (Recommended for Launch)
- All organizations start on FREE tier
- No existing Stripe customers
- Clean slate for production

#### Option B: Migrate Existing Customers (If Needed)
```typescript
// Script to create production customers for existing orgs
// Run ONCE after switching to production keys
async function migrateToProduction() {
  const orgs = await prisma.organization.findMany({
    where: { 
      stripeCustomerId: { startsWith: 'cus_test_' } // Test customers
    }
  })
  
  for (const org of orgs) {
    // Create new production customer
    const customer = await stripe.customers.create({
      email: org.email,
      name: org.name,
      metadata: { organizationId: org.id }
    })
    
    // Update with production customer ID
    await prisma.organization.update({
      where: { id: org.id },
      data: { 
        stripeCustomerId: customer.id,
        // Reset subscription data for fresh start
        stripeSubscriptionId: null,
        subscriptionTier: 'FREE'
      }
    })
  }
}
```

### Step 5: Testing Production Setup

#### Pre-Launch Testing
1. Create a test organization account
2. Attempt upgrade to PRO
3. Use a real credit card (can refund after)
4. Verify:
   - [ ] Checkout completes successfully
   - [ ] Webhook updates organization to PRO
   - [ ] Invoice appears in billing page
   - [ ] Customer portal accessible
   - [ ] Email notifications sent

#### Post-Launch Monitoring
- Monitor webhook logs in Stripe Dashboard
- Check for failed payments
- Review customer portal usage
- Track subscription metrics

## Security Checklist

- [ ] Never commit production API keys to Git
- [ ] Ensure all keys are in environment variables
- [ ] Verify webhook signature validation is enabled
- [ ] Test webhook endpoint is not accessible without valid signature
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up alerting for failed payments

## Rollback Plan

If issues occur after migration:
1. Switch environment variables back to test keys
2. All new signups will use test mode
3. Existing production subscriptions continue working
4. Fix issues in test mode
5. Re-attempt migration

## Common Issues & Solutions

### Issue: Webhook not updating subscription status
**Solution**: Verify webhook secret is correct and endpoint URL is accessible

### Issue: Customer portal not loading
**Solution**: Ensure portal is configured in live mode dashboard

### Issue: Checkout fails with price not found
**Solution**: Verify `STRIPE_PRO_PRICE_ID` uses live price ID

### Issue: Statement descriptor not showing correctly
**Solution**: Configure in Stripe Dashboard → Settings → Business → Public details

## Support Resources

- Stripe Support: https://support.stripe.com/
- Stripe Status: https://status.stripe.com/
- API Docs: https://stripe.com/docs/api
- Testing Guide: https://stripe.com/docs/testing

## Final Checklist Before Go-Live

- [ ] All environment variables updated
- [ ] Webhook configured and tested
- [ ] Customer portal configured
- [ ] Real payment test completed
- [ ] Email notifications working
- [ ] Monitoring/alerting set up
- [ ] Support team briefed
- [ ] Rollback plan documented
- [ ] Terms of Service updated
- [ ] Privacy Policy updated

## Post-Migration Tasks

1. **Week 1**: Daily monitoring of webhooks and payments
2. **Week 2**: Review conversion metrics
3. **Month 1**: Analyze subscription retention
4. **Ongoing**: Monitor for failed payments and customer issues

## Notes

- Keep test mode active for development/staging environments
- Production keys should only be in production environment
- Consider implementing subscription analytics dashboard
- Set up automated alerts for failed payments
- Plan for handling subscription upgrades/downgrades
- Consider offering promotional codes or trials