# Stripe Configuration Documentation

## CRITICAL: Statement Descriptor Configuration

### Issue
- **Company Name**: Flobit Private Limited (legal entity)
- **Product Name**: FitSync (customer-facing brand)
- **Problem**: Customers will see "FLOBIT" on their credit card statements and won't recognize it
- **Solution**: Configure statement descriptors to show "FITSYNC" instead

### Configuration Strategy for Multi-Product Company (Flobit)

Since Flobit Private Limited has multiple products/SaaS companies, use this approach:

#### 1. **Account-Level Statement Descriptor** (Company Default)
Go to: **Settings → Business settings → Public details**
- **Statement descriptor**: Set to `FLOBIT`
- **Shortened descriptor**: Set to `FLOBIT`
- This becomes the default/fallback for any charges without specific descriptors

#### 2. **Product-Specific Descriptors** (Override per product)
Each product (FitSync, others) should specify its own descriptor:

**For FitSync:**
```typescript
payment_intent_data: {
  statement_descriptor: 'FITSYNC',
  // Optional suffix for plan type
  statement_descriptor_suffix: 'PRO',
}
```

**For Another Flobit Product:**
```typescript
payment_intent_data: {
  statement_descriptor: 'PRODUCTNAME',
  statement_descriptor_suffix: 'PLAN',
}
```

#### 2. **Product-Level Configuration**
When creating products/prices, you can override with:
- **Statement descriptor suffix**: Add specific info like `FITSYNC PRO`
- This appends to your main descriptor

#### 3. **Per-Charge Override** (In Code)
When creating charges or subscriptions, include:
```typescript
await stripe.checkout.sessions.create({
  // ... other config
  payment_intent_data: {
    statement_descriptor: 'FITSYNC PRO',
    statement_descriptor_suffix: 'MONTHLY',
  },
})
```

### What Customers Will See

**Before Configuration:**
```
FLOBIT PRIVATE LTD     $15.00
```
❌ Customers won't recognize this and might dispute

**After Configuration:**
```
FITSYNC PRO            $15.00
```
✅ Clear and recognizable

### Additional Branding Configurations

#### Email Receipts
Go to: **Settings → Branding → Email receipts**
- **Business name**: FitSync
- **Public business name**: FitSync
- **Support email**: support@fitsync.io
- **Extra info to customers**: "Thank you for your FitSync subscription!"

#### Customer Portal
Go to: **Settings → Billing → Customer portal**
- **Business name**: FitSync
- **Headline**: Manage your FitSync subscription
- **Privacy policy**: Link to FitSync privacy policy
- **Terms of service**: Link to FitSync terms

#### Checkout Page
When using Stripe Checkout:
- The session will show "FitSync" as the business name
- Upload your FitSync logo in **Settings → Branding**

### Webhook Notifications
Configure webhook endpoints to send from:
- **From name**: FitSync
- **Reply-to**: support@fitsync.io

## Implementation Notes

### For Checkout Sessions (Phase 3)
Update the checkout session creation to include:
```typescript
const session = await stripe.checkout.sessions.create({
  // ... other config
  payment_intent_data: {
    statement_descriptor: 'FITSYNC',
    statement_descriptor_suffix: 'PRO',
  },
})
```

### For Subscriptions (Phase 4)
Subscriptions will automatically use the account-level descriptor unless overridden.

## Testing
1. Make a test payment
2. Check the payment details in Stripe Dashboard
3. Look for "Statement descriptor" field
4. Verify it shows "FITSYNC" not "FLOWBIT"

## Legal Considerations
- It's perfectly fine for the legal entity (Flobit) to do business as (DBA) FitSync
- The statement descriptor should match what customers expect
- Keep records showing FitSync is a product of Flobit Private Limited
- Include "FitSync is a product of Flobit Private Limited" in terms of service

---
**IMPORTANT**: Configure this in Stripe Dashboard BEFORE going live to avoid customer confusion and potential chargebacks!