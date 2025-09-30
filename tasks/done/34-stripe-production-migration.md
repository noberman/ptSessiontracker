# Task 34: Stripe Production Migration

**Complexity: 2/10**  
**Priority: CRITICAL (Launch Blocker)**  
**Status: Not Started**  
**Dependencies: Tasks 23-26, 30 (Stripe Integration Complete)**  
**Estimated Time: 1 hour**

## Objective
Migrate Stripe integration from sandbox/test mode to production for live payments.

## Implementation Checklist

### Production Stripe Account Setup
- [ ] Verify business information in Stripe Dashboard
- [ ] Complete identity verification (if required)
- [ ] Set up bank account for payouts
- [ ] Configure tax settings if applicable

### Create Production Products
- [ ] Log into Stripe Dashboard (live mode)
- [ ] Create "FitSync Professional" product
- [ ] Set recurring price: $15/month
- [ ] Note the production price ID: `price_xxx`
- [ ] Configure statement descriptor:
  - [ ] Go to Settings → Business → Public details
  - [ ] Set to "FITSYNC" or "FLOBIT FITSYNC"
  - [ ] This appears on customer credit card statements

### Update Environment Variables
- [ ] Update production environment in Railway:
```env
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_xxxxx          # Live secret key
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx     # Live publishable key  
STRIPE_PRO_PRICE_ID=price_xxxxx          # Live price ID
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # Live webhook secret
```

### Configure Production Webhook
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Add production endpoint:
```
https://www.fitsync.io/api/stripe/webhook
```
- [ ] Select events to listen for:
  - [ ] checkout.session.completed
  - [ ] customer.subscription.created
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_failed
  - [ ] invoice.payment_succeeded
  - [ ] billing_portal.session.created
- [ ] Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### Configure Customer Portal
- [ ] Go to https://dashboard.stripe.com/settings/billing/portal
- [ ] Enable and configure:
  - [ ] Customers can update payment methods
  - [ ] Customers can update billing address
  - [ ] Customers can view invoice history
  - [ ] Customers can download invoices
  - [ ] Configure cancellation policy (immediate or end of period)
- [ ] Save configuration

### Production Testing
- [ ] Create test organization account
- [ ] Attempt upgrade to PRO (use real card)
- [ ] Verify:
  - [ ] Checkout completes
  - [ ] Webhook updates organization to PRO
  - [ ] Invoice appears in billing page
  - [ ] Customer portal accessible
  - [ ] Email notifications sent
- [ ] Process refund for test transaction

### Security Verification
- [ ] Confirm no API keys in code
- [ ] Verify webhook signature validation enabled
- [ ] Test webhook endpoint requires valid signature
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up payment failure alerts

### Data Migration
- [ ] Option A: Fresh Start (Recommended)
  - [ ] All organizations start on FREE tier
  - [ ] No existing Stripe customers
  - [ ] Clean slate for production

- [ ] Option B: Migrate Existing (If Needed)
  - [ ] Run migration script for existing orgs
  - [ ] Create production customers
  - [ ] Update organization records
  - [ ] Reset subscription tiers

### Post-Migration Monitoring
- [ ] Set up webhook monitoring
- [ ] Configure failed payment alerts
- [ ] Test customer portal access
- [ ] Verify subscription metrics dashboard
- [ ] Document support procedures

## Acceptance Criteria
- [ ] Production Stripe account configured
- [ ] Live API keys in production environment
- [ ] Webhook receiving live events
- [ ] Customer portal configured
- [ ] Real payment processed successfully
- [ ] Monitoring and alerts configured

## Testing
- [ ] Test full upgrade flow with real card
- [ ] Verify webhook updates database
- [ ] Test customer portal access
- [ ] Confirm invoices generated
- [ ] Test subscription cancellation
- [ ] Verify email notifications

## Rollback Plan
If issues occur:
1. Switch environment variables back to test keys
2. New signups use test mode
3. Existing production subscriptions continue
4. Fix issues in test environment
5. Re-attempt migration

## Security Notes
- Never commit production keys to Git
- Keep test keys for dev/staging
- Production keys only in production environment
- Enable all Stripe security features
- Set up monitoring and alerts

## Common Issues
- **Webhook not updating**: Check webhook secret is correct
- **Portal not loading**: Ensure configured in live mode
- **Price not found**: Verify live price ID is used
- **Statement descriptor**: Configure in Stripe Dashboard

## Next Steps
- Monitor first week of transactions
- Review conversion metrics
- Analyze payment failures
- Set up subscription analytics