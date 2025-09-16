# Schema & Architecture Improvements for Multi-Tenant SaaS MVP

## Executive Summary
Transform FitSync into a multi-tenant SaaS platform with a focus on rapid adoption, simple onboarding, and early feedback gathering. Target pricing: Free tier + $15/month Pro tier.

---

## 🔍 Cross-Reference with Current Schema

### What We Already Have ✅
1. **Location Model** - Already exists, just needs `organizationId`
2. **User Model** - Exists with roles (TRAINER, CLUB_MANAGER, PT_MANAGER, ADMIN)
3. **Client Model** - Complete with trainer relationships
4. **Session Model** - Full validation system implemented
5. **Package Model** - Working but needs to reference org-specific PackageTypes
6. **CommissionTier Model** - Already exists! Just needs `organizationId`
7. **EmailLog Model** - Email system fully implemented
8. **AuditLog Model** - Audit trail system ready
9. **PackageTemplate Model** - Templates exist, can be org-specific

### What We Need to Add 🆕
1. **Organization Model** - New top-level entity
2. **PackageType Model** - Replace hardcoded package types (CRITICAL for multi-org)
3. **OWNER Role** - Add to existing Role enum
4. **Subscription Enums** - SubscriptionTier, SubscriptionStatus

### Minimal Schema Changes Required
```prisma
// 1. Add Organization model (NEW)
model Organization {
  id                String    @id @default(cuid())
  name              String
  email             String
  phone             String?
  subscriptionTier  SubscriptionTier @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  stripeCustomerId  String?   @unique
  stripeSubscriptionId String?
  
  // Relations to existing models
  locations         Location[]
  users             User[]
  commissionTiers   CommissionTier[]
  packageTypes      PackageType[]     // NEW: Org-specific types
  packageTemplates  PackageTemplate[] // Use existing model
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

// 2. Add PackageType model (NEW - CRITICAL)
model PackageType {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String    // "Prime", "Elite", "Basic", etc.
  description     String?
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// 2. Update existing models (ADD organizationId)
model Location {
  // ... existing fields ...
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

model User {
  // ... existing fields ...
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

model CommissionTier {
  // ... existing fields ...
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

model PackageTemplate {
  // ... existing fields ...
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

// 3. Add OWNER to Role enum
enum Role {
  OWNER        // NEW
  ADMIN        // Existing
  PT_MANAGER   // Existing
  CLUB_MANAGER // Existing
  TRAINER      // Existing
}

// 4. Add new enums
enum SubscriptionTier {
  FREE
  PRO
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
}
```

---

## ✅ Feature Implementation Status

### 1. Core Platform Features

| Feature | Status | What's Done | What's Needed |
|---------|--------|-------------|---------------|
| **User Authentication** | ✅ 90% | NextAuth, JWT, roles | Add OWNER role, org context |
| **Session Management** | ✅ 100% | Create, validate, track | Just add org filtering |
| **Email Validation** | ✅ 100% | Resend integration, validation flow | None |
| **Package Tracking** | ✅ 95% | Full CRUD, deduction logic | Link to org templates |
| **Commission Calculation** | ⚠️ 60% | Tiers exist in DB, logic defined in PRD | Need calculation implementation, reports |
| **Location Management** | ✅ 100% | Full CRUD | Add org relationship |
| **Client Management** | ✅ 100% | Full CRUD with trainers | Add org context |
| **Audit Logging** | ✅ 100% | Complete audit trail | None |
| **Email System** | ✅ 100% | Resend integrated, logging | None |
| **Dashboard & Analytics** | ✅ 80% | Role-based dashboards | Add org-level analytics |
| **Reports** | ✅ 70% | Commission, session reports | Add org filtering |

### 2. Multi-Tenant Features

| Feature | Status | What's Done | What's Needed |
|---------|--------|-------------|---------------|
| **Organization Model** | ❌ 0% | None | Create model |
| **Multi-tenant Isolation** | ⚠️ 20% | Location-based isolation | Add org-level isolation |
| **Onboarding Flow** | ❌ 0% | None | Build 3-step wizard |
| **Subscription Management** | ❌ 0% | None | Stripe integration |
| **Organization Switcher** | ❌ 0% | None | UI component |
| **Invite System** | ⚠️ 30% | Manual user creation | Email invites |
| **Customizable Package Types** | ❌ 0% | Currently hardcoded PRIME/ELITE | CRITICAL: Must be org-specific |
| **Customizable Commission Tiers** | ⚠️ 50% | Model exists | Make org-specific |

### 3. UI/UX Components

| Component | Status | What's Done | What's Needed |
|---------|--------|-------------|---------------|
| **Landing Page** | ✅ 100% | Marketing page ready | None |
| **Login/Signup** | ✅ 80% | Login works | Add org creation on signup |
| **Dashboard** | ✅ 100% | Role-based views | Add org context |
| **Session Forms** | ✅ 100% | Complete | None |
| **Package Forms** | ✅ 100% | Complete | Link to org types |
| **User Management** | ✅ 90% | CRUD operations | Add invite flow |
| **Settings Pages** | ⚠️ 40% | Basic settings | Add org settings |
| **Billing Page** | ❌ 0% | None | Stripe portal |

---

## 📋 Implementation Phases - What's Actually Needed

### Phase 1: Add Organization Layer (Week 1)
**Effort: Low - Mostly adding relationships**

1. ✅ Already have: All base models
2. 🆕 Need to add:
   - Organization model
   - organizationId to existing models
   - Migration script for existing data

```typescript
// Simple migration for existing data
const woodSquare = await prisma.organization.create({
  data: {
    name: "Wood Square Fitness",
    email: "admin@woodsquare.com",
    subscriptionTier: "PRO"
  }
})

// Update all existing records
await prisma.$executeRaw`UPDATE locations SET "organizationId" = ${woodSquare.id}`
await prisma.$executeRaw`UPDATE users SET "organizationId" = ${woodSquare.id}`
```

### Phase 2: Quick Onboarding (Week 2)
**Effort: Medium - New feature**

1. ✅ Already have: User creation, auth flow
2. 🆕 Need to add:
   - Combined signup/org creation form
   - Default data seeding (templates, tiers)
   - Skip-able location setup

### Phase 3: Organization Context (Week 3)
**Effort: Low - Update queries**

1. ✅ Already have: All queries working
2. 🆕 Need to add:
   - Middleware for org context
   - Update all Prisma queries to filter by org
   - Test data isolation

```typescript
// Simple middleware addition
const orgContext = { organizationId: session.user.organizationId }
const sessions = await prisma.session.findMany({
  where: { ...existingWhere, ...orgContext }
})
```

### Phase 4: Stripe Integration (Week 4)
**Effort: Medium - New integration**

1. ✅ Already have: Nothing
2. 🆕 Need to add:
   - Stripe customer creation
   - Simple subscription ($15/month)
   - Upgrade/downgrade flow
   - Webhook handling

---

## 📊 Commission Feature Documentation

### Complete System Design:
**See `/docs/COMMISSION_SYSTEM_DESIGN.md` for comprehensive commission system architecture including:**
- 5 different calculation methods (Progressive, Graduated, Package-Based, Target-Based, Hybrid)
- Flexible database schema supporting multiple methods per organization
- Step-by-step calculation flow with code examples
- UI/UX configuration flow
- Migration strategy for existing data

### Implementation Status:
- ✅ Database model exists (CommissionTier table)
- ✅ Complete system design documented
- ✅ Multiple calculation methods defined
- ❌ API endpoints not implemented
- ❌ Commission dashboard not built
- ❌ Calculation functions not implemented
- ❌ Payroll exports not implemented

### Files That Need Creating:
```typescript
// 1. Commission calculation service (supports all methods)
function calculateCommission(trainerId, month, orgId) {
  // Implementation per COMMISSION_SYSTEM_DESIGN.md
}

// 2. Commission configuration UI
// 3. Commission dashboard
// 4. Payroll export (Excel/CSV)
```

---

## 🎯 Actual Work Required Summary

### Minimal Changes to Existing Code
- **Database**: Add 1 new model, update 5 existing models with organizationId
- **Auth**: Add OWNER role, include org in session
- **Queries**: Add org filter to ~30 queries (simple where clause addition)
- **UI**: Minimal changes, mostly adding org context

### New Development Required
1. **Onboarding Wizard** (3 simple forms)
2. **Stripe Integration** (basic subscription)
3. **Organization Settings Page**
4. **Invite System** (email-based)

### What We DON'T Need to Change
- ❌ Session validation logic (works perfectly)
- ❌ Email system (fully functional)
- ❌ Commission calculation logic (just needs org context)
- ❌ Dashboard components (just add filtering)
- ❌ Package management (just link to org templates)
- ❌ Audit system (already complete)

---

## 💡 Smart Migration Strategy

### Keep It Simple
1. **Don't rebuild** - We have 80% of the platform done
2. **Add, don't replace** - Organization is just a parent entity
3. **Gradual rollout** - Start with Wood Square as first org

### Data Migration (1 Hour Task)
```sql
-- Step 1: Add Organization
INSERT INTO organizations (name, email, subscription_tier) 
VALUES ('Wood Square Fitness', 'admin@woodsquare.com', 'PRO');

-- Step 2: Link existing data
UPDATE locations SET organization_id = [org-id];
UPDATE users SET organization_id = [org-id];
UPDATE commission_tiers SET organization_id = [org-id];
UPDATE package_templates SET organization_id = [org-id];

-- Done! Everything else works as-is
```

---

## 🚀 Realistic Timeline

### Week 1: Schema Updates
- Day 1-2: Add Organization model, update schema
- Day 3: Migration script for existing data
- Day 4-5: Update queries with org context

### Week 2: Onboarding
- Day 1-2: Signup + org creation form
- Day 3: Default data seeding
- Day 4-5: Testing

### Week 3: Multi-tenant Features
- Day 1-2: Org isolation testing
- Day 3: Settings page
- Day 4-5: Invite system

### Week 4: Billing
- Day 1-2: Stripe setup
- Day 3: Subscription flow
- Day 4-5: Testing & polish

### Total: 4 Weeks to MVP
**Not 3 months - we're 80% there already!**

---

## 📊 Risk Assessment

### Low Risk Items (We already have these)
- ✅ Session tracking system
- ✅ Email validation
- ✅ Commission calculation
- ✅ User management
- ✅ Reporting system

### Medium Risk Items (New but simple)
- ⚠️ Organization model (just a parent entity)
- ⚠️ Stripe integration (well-documented)
- ⚠️ Onboarding flow (3 simple forms)

### High Risk Items (Complex/Unknown)
- ❌ None! We're not doing anything complex

---

## Next Immediate Steps

1. **Today**: Create Organization model in schema.prisma
2. **Tomorrow**: Add organizationId to existing models
3. **Day 3**: Create migration script
4. **Day 4**: Test with Wood Square as first org
5. **Week 2**: Build onboarding and go live with beta!