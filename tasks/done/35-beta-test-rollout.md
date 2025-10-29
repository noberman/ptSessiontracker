# Task 35: Beta Promo Code System (Simplified)

**Complexity: 3/10**  
**Priority: HIGH (Product Validation)**  
**Status: Not Started (Simplified scope for 5 beta users)**  
**Dependencies: Onboarding flow complete, Stripe integration working**  
**Estimated Time: 2-3 hours development**

## Objective
Create simple promo code system that gives 5 beta users free SCALE tier access for 3 months during signup, then auto-downgrades to FREE tier.

## Simplified Implementation Checklist

### Phase 1: Basic Promo Code System
- [ ] Add simple promo code to Organization model:
```prisma
model Organization {
  // existing fields...
  promoCode        String?   // Store applied promo code
  promoAppliedAt   DateTime? // When promo was applied
  promoExpiresAt   DateTime? // When promo expires (3 months from application)
  originalTier     SubscriptionTier? // Store original tier for downgrade
}
```

### Phase 2: Signup Integration
- [ ] Add promo code input to signup form:
```typescript
// Optional promo code field in signup
// Validate against hardcoded list: ["BETA001", "BETA002", "BETA003", "BETA004", "BETA005"]
// If valid, set subscriptionTier to SCALE and promoExpiresAt to +3 months
```

- [ ] Hardcoded promo codes (no database needed):
```typescript
const BETA_PROMO_CODES = {
  "BETA001": { tier: "SCALE", durationMonths: 3 },
  "BETA002": { tier: "SCALE", durationMonths: 3 },
  "BETA003": { tier: "SCALE", durationMonths: 3 },
  "BETA004": { tier: "SCALE", durationMonths: 3 },
  "BETA005": { tier: "SCALE", durationMonths: 3 }
}
```

### Phase 3: Auto-Downgrade System
- [ ] Create daily cron job/background task:
```typescript
// Check for expired promo codes daily
// Downgrade organizations where promoExpiresAt < now()
// Set subscriptionTier to FREE (or originalTier if stored)
// Send email notification about downgrade
```

- [ ] Promo status display:
```typescript
// Show "Beta Access - X days remaining" in dashboard
// Show countdown in billing settings
// Clear messaging about auto-downgrade to FREE
```

## Beta Rollout Plan (Simplified)

### Phase 1: Setup (1 day)
- [ ] Deploy promo code system to staging
- [ ] Test 5 hardcoded promo codes
- [ ] Test auto-downgrade logic

### Phase 2: Beta Distribution (1 week)
- [ ] Personal outreach to 5 target gyms
- [ ] Provide individual promo codes: BETA001-BETA005
- [ ] 3 months free SCALE tier access
- [ ] Clear communication: auto-downgrades to FREE after 3 months

### Phase 3: Monitoring (3 months)
- [ ] Monitor beta user activity
- [ ] Personal check-ins (no formal system needed)
- [ ] Quick bug fixes as needed

### Phase 4: Conversion (Month 3)
- [ ] Email beta users 2 weeks before expiry
- [ ] Offer discount for continued access
- [ ] Auto-downgrade to FREE tier if no conversion

## Beta Codes

```
BETA001 - 3 months free SCALE tier
BETA002 - 3 months free SCALE tier  
BETA003 - 3 months free SCALE tier
BETA004 - 3 months free SCALE tier
BETA005 - 3 months free SCALE tier
```

## Success Metrics (Simplified)

- [ ] 5 beta users successfully onboarded
- [ ] 3+ months of stable usage
- [ ] 2+ beta users convert to paid plans
- [ ] No major technical issues during beta period

## Technical Implementation

### Files to Create/Modify:
```
src/
  app/
    signup/
      page.tsx                   # Add promo code input field
    api/
      cron/
        check-promo-expiry.ts     # Daily check for expired promos
  lib/
    promo-codes.ts              # Hardcoded promo validation
  components/
    billing/
      PromoStatus.tsx           # Show remaining beta time
```

### Database Changes:
```prisma
// Add to Organization model:
promoCode        String?           // Applied promo code
promoAppliedAt   DateTime?         // When applied
promoExpiresAt   DateTime?         // When expires
originalTier     SubscriptionTier? // For downgrade
```

## Risk Mitigation (Simplified)

- **Risk**: Beta users expect free forever
  - **Mitigation**: Clear 3-month messaging everywhere
  
- **Risk**: Promo codes shared publicly
  - **Mitigation**: Only 5 codes, personal distribution, track usage
  
- **Risk**: Auto-downgrade fails
  - **Mitigation**: Manual backup process, email notifications

## Dependencies
- Task 41: Pricing/billing system (current task)
- Onboarding flow must be complete
- Email system for notifications

## Notes
- No complex analytics needed - just track 5 beta users manually
- No feedback system needed - personal communication
- No complex promo system - just 5 hardcoded codes
- Focus on validation, not scale