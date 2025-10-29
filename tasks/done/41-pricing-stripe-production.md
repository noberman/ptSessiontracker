# Task 41: Pricing Table & Stripe Production Setup

**Created:** October 2024  
**Priority:** HIGH  
**Status:** Not Started  
**Complexity:** 7/10  

## Overview
Implement a professional pricing table on the landing page and transition Stripe from test/sandbox mode to production mode for real payment processing.

## Business Context
- Currently using Stripe in test/sandbox mode
- Need to display clear pricing tiers to potential customers
- Must enable real payment processing for production launch
- Pricing should align with business model (per-location, user limits, features)

## Current State
- Stripe integration exists but only in test mode
- No pricing information displayed on landing page
- Subscription tiers defined in code but not visible to users
- Payment flow works in test mode but needs production credentials

## Requirements

### 1. Pricing Table Component
- **Visual Requirements:**
  - Professional, clean design matching existing UI
  - Mobile responsive
  - Clear feature comparison between tiers
  - Highlight recommended/popular tier
  - Call-to-action buttons for each tier

- **Tiers to Display:**
  ```
  STARTER (Free)
  - $0/month
  - Up to 2 trainers
  - 50 sessions per month
  - 1 location
  - Basic reports
  - Commission calculations
  - Excel exports
  - Email support
  
  GROWTH (Most Popular)
  - $17/month
  - Up to 10 trainers
  - 500 sessions per month
  - Up to 3 locations
  - Advanced reports
  - Priority email support
  - Commission calculations
  - Excel exports
  
  SCALE
  - $37/month
  - Unlimited trainers
  - Unlimited sessions
  - Unlimited locations
  - Advanced analytics
  - Priority phone support
  - Commission calculations
  - Excel exports
  ```

### 2. Stripe Production Setup
- **Configuration:**
  - Switch from test keys to production keys
  - Set up production webhook endpoints
  - Configure production products and prices
  - Test payment flow with real cards

- **Environment Variables Needed:**
  ```env
  # Production (currently using test keys)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  
  # Price IDs (production)
  STRIPE_STARTER_PRICE_ID=price_...
  STRIPE_PROFESSIONAL_PRICE_ID=price_...
  STRIPE_ENTERPRISE_PRICE_ID=price_...
  ```

## Implementation Plan

### Phase 1: Pricing Table (Frontend)
1. Create pricing data structure
2. Build PricingTable component
3. Add to landing page
4. Implement responsive design
5. Add animations and hover effects
6. Connect to signup flow

### Phase 2: Stripe Products Setup
1. Create products in Stripe Dashboard (production)
2. Set up pricing for each tier
3. Configure billing intervals (monthly/yearly)
4. Set up test subscriptions

### Phase 3: Backend Updates
1. Update Stripe configuration to handle production keys
2. Add environment variable switches
3. Update webhook handlers for production events
4. Implement subscription upgrade/downgrade logic
5. Add payment method management

### Phase 4: Testing & Verification
1. Test complete payment flow with test cards
2. Verify webhook events are received
3. Test subscription lifecycle (create, update, cancel)
4. Verify billing portal access
5. Test failed payment scenarios

## Technical Specifications

### Files to Create/Modify:
```
src/
  components/
    landing/
      PricingTable.tsx       # New pricing table component
      PricingCard.tsx        # Individual tier card
    
  app/
    (public)/
      page.tsx               # Add pricing section to landing
    
    api/
      stripe/
        create-checkout.ts   # Update for production
        webhook.ts           # Update webhook handling
        
  lib/
    stripe.ts               # Update configuration
    pricing-data.ts         # Pricing tier definitions
```

### Database Considerations:
- Store subscription tier in Organization model
- Track payment history
- Store Stripe customer ID and subscription ID

### Security Requirements:
- Never expose secret keys in client code
- Validate all webhook signatures
- Use HTTPS for all payment flows
- Implement proper error handling
- Log all payment events for audit

## UI/UX Mockup Structure:
```
┌─────────────────────────────────────────┐
│           Choose Your Plan              │
│     Simple pricing that scales          │
├─────────┬─────────┬─────────┬──────────┤
│ STARTER │  GROWTH │  SCALE  │          │
│  FREE   │[Popular]│         │          │
├─────────┼─────────┼─────────┼──────────┤
│  $0/mo  │ $17/mo  │ $37/mo  │          │
├─────────┼─────────┼─────────┼──────────┤
│ ✓ 2 trainers     │ ✓ 10 trainers    │ ✓ ∞ trainers    │
│ ✓ 50 sessions    │ ✓ 500 sessions   │ ✓ ∞ sessions    │
│ ✓ 1 location     │ ✓ 3 locations    │ ✓ ∞ locations   │
│ ✓ Basic reports  │ ✓ Adv. reports   │ ✓ Analytics     │
│ ✓ Email support  │ ✓ Priority email │ ✓ Phone support │
├─────────┼─────────┼─────────┼──────────┤
│[Get Started]│[Start Trial]│[Start Trial]│
└─────────┴─────────┴─────────┴──────────┘
```

## Stripe Production Checklist:
- [ ] Create Stripe production account
- [ ] Verify business information
- [ ] Set up bank account for payouts
- [ ] Create products and prices in dashboard
- [ ] Generate production API keys
- [ ] Set up production webhook endpoint
- [ ] Update environment variables
- [ ] Test with live mode test cards
- [ ] Enable production mode
- [ ] Monitor first real transactions

## Testing Scenarios:
1. New user signup with payment
2. Existing user upgrade plan
3. Existing user downgrade plan
4. Payment failure and retry
5. Subscription cancellation
6. Reactivation of cancelled subscription
7. Applying discounts/coupons
8. Yearly vs monthly billing

## Success Criteria:
- [ ] Pricing table displays correctly on all devices
- [ ] Users can select and purchase a plan
- [ ] Stripe processes real payments successfully
- [ ] Subscriptions are created and tracked correctly
- [ ] Users can manage billing through Stripe portal
- [ ] Webhook events update database correctly
- [ ] Payment failures are handled gracefully
- [ ] Audit trail of all transactions exists

## Risk Mitigation:
- Keep test mode active until fully verified
- Implement gradual rollout (beta users first)
- Have rollback plan ready
- Monitor all transactions closely initially
- Set up alerts for payment failures
- Document all payment flows

## Notes:
- Consider offering annual billing with discount (e.g., 2 months free)
- May need to implement usage-based billing for sessions in future
- Consider grandfathering existing users at current rates
- Plan for tax handling (Stripe Tax or manual)
- Set up proper invoice generation

## References:
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- Current test implementation in `/src/lib/stripe.ts`

## Dependencies:
- Stripe account verification (business details, bank account)
- Final pricing approval from business
- Terms of Service and Privacy Policy updates
- SSL certificate for production domain