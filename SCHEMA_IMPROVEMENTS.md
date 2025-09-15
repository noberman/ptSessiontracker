# Schema & Architecture Improvements for Multi-Tenant SaaS MVP

## Executive Summary
Transform FitSync into a multi-tenant SaaS platform with a focus on rapid adoption, simple onboarding, and early feedback gathering. Target pricing: Free tier + $15/month Pro tier.

---

## 1. Organization Hierarchy

### Core Structure
```
Organization (Created by user at signup)
  └── Locations (Gyms/Studios)
       └── Trainers (PTs at each location)
            └── Clients
                 └── Sessions & Packages
```

### Required Schema Changes

```prisma
model Organization {
  id                String    @id @default(cuid())
  name              String
  email             String
  phone             String?
  
  // Subscription
  subscriptionTier  SubscriptionTier @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  stripeCustomerId  String?   @unique
  stripeSubscriptionId String?
  
  // Relations
  locations         Location[]
  users             User[]
  packageTypes      PackageType[]    // Org defines their own
  commissionTiers   CommissionTier[] // Org defines their own
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum SubscriptionTier {
  FREE    // Limited features
  PRO     // $15/month - Full features
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
}
```

### User Role Hierarchy
```prisma
enum UserRole {
  OWNER         // Creates organization, full access
  ADMIN         // Organization admin (can manage everything)
  PT_MANAGER    // Can manage trainers and view reports
  CLUB_MANAGER  // Manages specific location
  TRAINER       // Logs sessions, manages own clients
}
```

---

## 2. Simple Pricing Model

### Free Tier (Forever Free)
- 1 location
- Up to 3 trainers
- 50 sessions per month
- Basic features
- Email validation
- Commission tracking

### Pro Tier ($15/month)
- Unlimited locations
- Unlimited trainers
- Unlimited sessions
- Priority support
- Data exports
- Advanced analytics
- API access (future)

### Why This Pricing?
- **Low barrier to entry** - Easy to try and adopt
- **Focus on feedback** - More users = more insights
- **Growth potential** - Can increase pricing after product-market fit
- **Simple decision** - Only one paid tier to consider

---

## 3. Quick Onboarding Flow (3 Steps Max)

### Step 1: Create Account & Organization (Combined)
```javascript
// Single form submission
{
  email: "john@gym.com",
  password: "********",
  organizationName: "Apex Fitness",
  yourName: "John Smith"
}
```
- Creates user account (as OWNER)
- Creates organization
- Automatically starts FREE tier
- Sends welcome email

### Step 2: Add First Location
```javascript
{
  locationName: "Downtown Gym",
  address: "123 Main St", // Optional
  phone: "555-0100" // Optional
}
```
- Can skip and add later
- Simple form, minimal fields

### Step 3: You're Done!
- Land on dashboard
- Show quick tour (optional)
- Prompt to invite first trainer
- Start logging sessions immediately

### What We DON'T Ask For
- Payment info (can upgrade later)
- Commission tiers (use defaults)
- Package types (use defaults) 
- Complex settings
- Business rules

---

## 4. Customizable Elements (Keep it Simple)

### Package Types - Org Customizable
```prisma
model PackageType {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String    // "10 Sessions", "Monthly Unlimited", etc.
  description     String?
  isDefault       Boolean   @default(false) // Org's default types
  packages        Package[]
}
```

### Commission Tiers - Org Customizable
```prisma
model CommissionTier {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String    // "Tier 1", "Bronze", etc.
  minSessions     Int       // 0 sessions
  maxSessions     Int?      // 10 sessions (null = unlimited)
  percentage      Float     // 50%
  
  @@unique([organizationId, minSessions]) // Prevent overlapping tiers
}
```

### Default Setup (Auto-created)
When organization is created, automatically create:

**Default Package Types:**
- 5 Sessions
- 10 Sessions  
- 20 Sessions
- Custom

**Default Commission Tiers:**
- 0-10 sessions: 50%
- 11-20 sessions: 55%
- 21+ sessions: 60%

Users can modify these anytime from Settings.

---

## 5. Data Isolation (Simple Approach)

### No Subdomains Needed
- Single domain: app.fitsync.io
- Organization context from user session
- Every query filtered by organizationId

### Implementation
```typescript
// Middleware adds org context to all queries
async function withOrgContext(userId: string) {
  const user = await getUser(userId)
  return {
    where: {
      organizationId: user.organizationId
    }
  }
}

// All queries automatically filtered
const sessions = await prisma.session.findMany({
  ...orgContext,
  // other filters
})
```

---

## 6. MVP Features for Launch

### Core Features (Must Have)
✅ Organization creation at signup  
✅ Location management  
✅ Trainer invitations  
✅ Session logging  
✅ Email validation  
✅ Commission calculation  
✅ Basic dashboard  
✅ Package tracking  

### Pro Features (Behind Paywall)
💰 Unlimited locations/trainers  
💰 Advanced analytics  
💰 Data exports (CSV/Excel)  
💰 Priority support  
💰 Custom package types  
💰 Custom commission tiers  

### Post-MVP (Later)
- Mobile app
- API access
- Integrations (Mindbody, etc.)
- Custom branding
- Advanced reports

---

## 7. Technical Implementation (4 Week Sprint)

### Week 1: Core Schema
- Add Organization model
- Update all models with organizationId
- Create migration scripts
- Update queries with org filtering

### Week 2: Auth & Onboarding
- Update signup flow (create org + user)
- Add organization context to session
- Create minimal onboarding (3 steps)
- Seed default data (package types, commission tiers)

### Week 3: Features & Permissions
- Implement role-based access per organization
- Add location management
- Add trainer invitation system
- Update dashboard for multi-org

### Week 4: Billing & Polish
- Integrate Stripe (simple subscription)
- Add upgrade/downgrade flow
- Free tier limitations
- Testing and bug fixes

---

## 8. Migration Plan for Existing Data

### Simple Migration
```sql
-- 1. Create default organization
INSERT INTO Organization (name, email, subscriptionTier) 
VALUES ('Wood Square Fitness', 'admin@woodsquare.com', 'PRO');

-- 2. Add organizationId to all existing records
UPDATE Location SET organizationId = [wood-square-id];
UPDATE User SET organizationId = [wood-square-id];
UPDATE Client SET organizationId = [wood-square-id];

-- 3. Create default package types and commission tiers
-- (Run seed script)
```

---

## 9. Stripe Integration (Keep it Simple)

### What We Need
- Customer creation on signup
- Single product: "FitSync Pro" at $15/month
- Simple subscription management
- Cancel anytime

### What We DON'T Need (Yet)
- Complex pricing tiers
- Usage-based billing
- Invoicing
- Multiple payment methods

### Implementation
```typescript
// On upgrade to Pro
const subscription = await stripe.subscriptions.create({
  customer: org.stripeCustomerId,
  items: [{ price: 'price_fitsync_pro_monthly' }],
  trial_period_days: 7, // Optional trial
})

// On cancel
await stripe.subscriptions.cancel(subscriptionId)
```

---

## 10. Success Metrics for Beta

### Target: 100 Organizations in First Month
- 20% convert to Pro ($300 MRR)
- Average 5 trainers per org
- 500+ sessions logged weekly

### Key Metrics to Track
- Time to first session logged (target: < 5 minutes)
- Onboarding completion rate (target: > 80%)
- Free to Pro conversion (target: > 20%)
- Weekly active organizations (target: > 60%)
- Support tickets per org (target: < 1)

### Feedback Loops
- In-app feedback widget
- Weekly email check-ins
- User interviews with top 10 users
- Feature request voting board

---

## 11. Go-to-Market Strategy

### Launch Channels
1. **ProductHunt** - Time for Tuesday launch
2. **Reddit** - r/fitness, r/personaltraining
3. **Facebook Groups** - PT communities
4. **Direct Outreach** - Local gyms (email/calls)

### Positioning
"The simplest way to track PT sessions and commissions. Free to start, $15/month for unlimited."

### First 10 Customers
- Manually onboard
- Weekly calls for feedback
- Build features they request
- Use as case studies

---

## Next Steps (Priority Order)

1. **Week 1**: Implement Organization model and update schema
2. **Week 2**: Build 3-step onboarding flow
3. **Week 3**: Add org context to all queries and pages
4. **Week 4**: Integrate Stripe and deploy

Then:
- Launch to 10 beta users
- Gather feedback for 2 weeks
- Iterate based on feedback
- Public launch

---

## Risks & Mitigation

### Biggest Risks
1. **Onboarding still too complex**
   - Solution: Track drop-off, simplify further
   
2. **Free tier too generous**
   - Solution: Adjust limits based on usage data
   
3. **$15 too cheap (no perceived value)**
   - Solution: Test price points after 100 users

### What We're NOT Worrying About Yet
- Scale beyond 1000 orgs
- Enterprise features  
- Complex integrations
- International payments
- GDPR compliance (US focus first)