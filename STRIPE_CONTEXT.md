# Stripe Integration Context - Session Resume Point

## Current State (January 23, 2025)
- ✅ Task 29 (Settings Page) deployed to production
- ✅ Commission configuration moved to Settings
- ✅ Database migrations synchronized across staging/production
- ✅ Production deployment successful with Snap Fitness Singapore

## Next Priority: Stripe Integration
Starting with Task 23-26 + Task 30 for complete payment system

### Task Sequence:
1. **Task 23: Basic Stripe Setup** (Start here)
   - Install stripe & @stripe/stripe-js
   - Configure environment variables
   - Create products in Stripe Dashboard
   - Initialize Stripe client

2. **Task 24: Customer Creation**
   - Link organizations to Stripe customers
   - Store stripeCustomerId in Organization model

3. **Task 25: Subscription Checkout** (Not in tasks folder yet)
   - Create checkout flow
   - Handle payment methods
   - Start subscriptions

4. **Task 26: Webhooks**
   - Handle subscription events
   - Update organization status based on payment

5. **Task 30: Billing Page**
   - Show current subscription
   - Payment method management
   - Invoice history

## Key Decisions Made:
- Organization model already has `stripeCustomerId` and `stripeSubscriptionId` fields
- Using subscription model (not one-time payments)
- Free tier: 2 trainers, 50 sessions/month
- Pro tier: $15/month, unlimited everything

## Important Context:
- Production URL: https://www.fitsync.io
- Staging shares database with local (be careful!)
- Production database is separate
- Currently no payment processing = no revenue
- Snap Fitness Singapore is live user (need to grandfather them in?)

## Environment Setup Needed:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

## Database Schema Already Has:
```prisma
model Organization {
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?
  // ... other fields
}
```

## Questions to Consider:
1. How to handle existing Snap Fitness organization? (Free? Grandfathered?)
2. Trial period for new signups?
3. Annual discount pricing?
4. Multiple subscription tiers or just Free/Pro?

## Files to Review When Starting:
- `/tasks/23-stripe-basic-setup.md` - Start here
- `/tasks/24-stripe-customer-creation.md`
- `/tasks/26-stripe-webhooks.md`
- `/prisma/schema.prisma` - Check Organization model
- `/docs/PRD.md` - Check business requirements for pricing

## Last Git Status:
- Main branch is deployed to production
- Staging branch exists
- All migrations applied
- Settings page with commission configuration is live

## Critical Rules:
- NEVER commit directly to main (use staging first)
- Test Stripe in test mode first
- Don't run migrations before deploying code
- Production DB is separate from staging/local

---
When you resume, say: "I need to continue with Stripe integration starting with Task 23"