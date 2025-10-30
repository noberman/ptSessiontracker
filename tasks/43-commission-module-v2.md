# Task 43: Commission Module v2 - Profile-Based System (Simplified)

## Overview
Redesign the commission system from simple percentage tiers to a flexible profile-based architecture supporting multiple calculation methods including flat fees per session, percentages, and bonuses.

**Estimated Duration**: 1-2 weeks  
**Risk Level**: Low (only 1-2 production users)  
**Migration Strategy**: Direct cutover (no parallel running needed)

## Business Requirements
1. Support flat fee per session (e.g., $50/session)
2. Support percentage-based commission (current system)
3. Support hybrid models (flat fee + percentage)
4. Enable different commission structures for different trainer types
5. Maintain calculation history for audit purposes

## Technical Architecture

### New Data Models
```
CommissionProfile (Organization → Profiles)
  ├── CommissionTierV2 (Profile → Tiers)
  │     ├── Triggers (session count, sales volume)
  │     └── Rewards (session %, flat fee, sales %, bonuses)
  └── User (commissionProfileId foreign key)

CommissionCalculation (Historical record)
  └── Stores calculation results per trainer per period
```

---

## Phase 1: Database Schema Updates (Day 1)

### Step 1: Create New Models
```prisma
model CommissionProfile {
  id                String   @id @default(cuid())
  organizationId    String
  name              String
  description       String?
  isDefault         Boolean  @default(false)
  isActive          Boolean  @default(true)
  calculationMethod CalculationMethod @default(PROGRESSIVE)
  
  organization      Organization @relation(fields: [organizationId], references: [id])
  tiers            CommissionTierV2[]
  users            User[]        @relation("UserCommissionProfile")
  calculations     CommissionCalculation[]
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("commission_profiles")
}

model CommissionTierV2 {
  id                    String   @id @default(cuid())
  profileId             String
  tierLevel             Int
  name                  String
  
  // Triggers
  triggerType           TriggerType
  sessionThreshold      Int?
  salesThreshold        Float?
  
  // Rewards (all optional - use what you need)
  sessionCommissionPercent Float?   // % of session value
  sessionFlatFee           Float?   // Fixed $ per session
  salesCommissionPercent   Float?   // % of package sales  
  salesFlatFee            Float?   // Fixed $ per package sold
  tierBonus               Float?   // One-time bonus for reaching tier
  
  profile               CommissionProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  @@unique([profileId, tierLevel])
  @@index([profileId])
  @@map("commission_tiers_v2")
}

model CommissionCalculation {
  id                String   @id @default(cuid())
  organizationId    String
  userId            String
  profileId         String?
  periodStart       DateTime
  periodEnd         DateTime
  
  // Calculation method used
  calculationMethod CalculationMethod
  
  // Summary data
  totalSessions     Int
  totalPackagesSold Int?
  
  // Commission breakdown
  sessionCommission Float
  salesCommission   Float?
  tierBonus        Float?
  totalCommission  Float
  
  // Tier information
  tierReached      Int?
  
  // Snapshot of calculation details
  calculationSnapshot Json?
  
  // Metadata
  calculatedAt     DateTime @default(now())
  
  // Relations
  organization     Organization @relation(fields: [organizationId], references: [id])
  user            User @relation(fields: [userId], references: [id])
  profile         CommissionProfile? @relation(fields: [profileId], references: [id])
  
  @@index([userId, periodEnd])
  @@index([organizationId, periodEnd])
  @@map("commission_calculations")
}

enum CalculationMethod {
  PROGRESSIVE
  GRADUATED
  FLAT
}

enum TriggerType {
  NONE
  SESSION_COUNT
  SALES_VOLUME
  SESSION_OR_SALES
  SESSION_AND_SALES
}
```

### Step 2: Update User Model
```prisma
model User {
  // ... existing fields ...
  
  // Commission v2 fields
  commissionProfileId    String?
  commissionProfile      CommissionProfile? @relation("UserCommissionProfile", fields: [commissionProfileId], references: [id])
  commissionCalculations CommissionCalculation[]
}
```

### Step 3: Update Organization Model
```prisma
model Organization {
  // ... existing fields ...
  
  // Commission v2 relations
  commissionProfiles    CommissionProfile[]
  commissionCalculations CommissionCalculation[]
  
  // Keep commissionMethod temporarily for migration
  // Will remove after cutover
}
```

### Step 4: Create Migration
```bash
npx prisma migrate dev --name add_commission_v2_models
```

---

## Phase 2: Data Migration Script (Day 2)

### Step 1: Create Migration Service
```typescript
// src/lib/commission/migration/CommissionMigrationService.ts

export class CommissionMigrationService {
  /**
   * Migrate organization from v1 to v2
   */
  async migrateOrganization(organizationId: string): Promise<CommissionProfile> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        commissionTiers: true,
        users: true
      }
    })
    
    if (!org) throw new Error('Organization not found')
    
    // Create default profile from existing tiers
    const profile = await prisma.commissionProfile.create({
      data: {
        organizationId,
        name: 'Default Commission Structure',
        description: `Migrated from ${org.commissionMethod} system`,
        isDefault: true,
        isActive: true,
        calculationMethod: org.commissionMethod as CalculationMethod,
        tiers: {
          create: org.commissionTiers.map((tier, index) => ({
            tierLevel: index + 1,
            name: `Tier ${index + 1}`,
            triggerType: 'SESSION_COUNT',
            sessionThreshold: tier.minSessions,
            sessionCommissionPercent: tier.percentage * 100, // Convert to percentage
          }))
        }
      }
    })
    
    // Assign all trainers to this profile
    await prisma.user.updateMany({
      where: {
        organizationId,
        role: 'TRAINER'
      },
      data: {
        commissionProfileId: profile.id
      }
    })
    
    console.log(`✅ Migrated ${org.name} to profile-based system`)
    return profile
  }
}
```

### Step 2: Run Migration Script
```typescript
// scripts/migrateCommissions.ts
import { CommissionMigrationService } from '@/lib/commission/migration/CommissionMigrationService'

async function migrate() {
  const service = new CommissionMigrationService()
  
  // Get all organizations
  const orgs = await prisma.organization.findMany()
  
  for (const org of orgs) {
    console.log(`Migrating ${org.name}...`)
    await service.migrateOrganization(org.id)
  }
  
  console.log('Migration complete!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## Phase 3: Commission Calculation Service (Days 3-4)

### Step 1: Create Calculator
```typescript
// src/lib/commission/v2/CommissionCalculatorV2.ts

export class CommissionCalculatorV2 {
  async calculateCommission(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<CommissionCalculation> {
    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        commissionProfile: {
          include: {
            tiers: {
              orderBy: { tierLevel: 'asc' }
            }
          }
        }
      }
    })
    
    if (!user?.commissionProfile) {
      throw new Error('No commission profile assigned')
    }
    
    // Get sessions for period
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: userId,
        sessionDate: {
          gte: period.start,
          lte: period.end
        },
        validated: true,
        cancelled: false
      }
    })
    
    // Get package sales for period
    const packages = await prisma.package.findMany({
      where: {
        client: {
          primaryTrainerId: userId
        },
        createdAt: {
          gte: period.start,
          lte: period.end
        }
      }
    })
    
    // Calculate based on profile method
    const result = this.calculateByMethod(
      user.commissionProfile,
      sessions,
      packages
    )
    
    // Save calculation record
    const calculation = await prisma.commissionCalculation.create({
      data: {
        userId,
        organizationId: user.organizationId!,
        profileId: user.commissionProfileId,
        periodStart: period.start,
        periodEnd: period.end,
        calculationMethod: user.commissionProfile.calculationMethod,
        totalSessions: sessions.length,
        totalPackagesSold: packages.length,
        ...result
      }
    })
    
    return calculation
  }
  
  private calculateByMethod(
    profile: CommissionProfile & { tiers: CommissionTierV2[] },
    sessions: Session[],
    packages: Package[]
  ) {
    switch (profile.calculationMethod) {
      case 'PROGRESSIVE':
        return this.calculateProgressive(profile, sessions, packages)
      case 'GRADUATED':
        return this.calculateGraduated(profile, sessions, packages)
      case 'FLAT':
        return this.calculateFlat(profile, sessions, packages)
      default:
        throw new Error(`Unknown calculation method: ${profile.calculationMethod}`)
    }
  }
  
  private calculateProgressive(
    profile: CommissionProfile & { tiers: CommissionTierV2[] },
    sessions: Session[],
    packages: Package[]
  ) {
    // Find highest tier achieved
    let currentTier = profile.tiers[0]
    
    for (const tier of profile.tiers) {
      if (tier.triggerType === 'SESSION_COUNT' && 
          tier.sessionThreshold && 
          sessions.length >= tier.sessionThreshold) {
        currentTier = tier
      }
      // Add other trigger types as needed
    }
    
    // Calculate commission using tier rewards
    let sessionCommission = 0
    let salesCommission = 0
    let tierBonus = currentTier.tierBonus || 0
    
    // Session commission
    if (currentTier.sessionFlatFee) {
      sessionCommission = sessions.length * currentTier.sessionFlatFee
    } else if (currentTier.sessionCommissionPercent) {
      const totalSessionValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0)
      sessionCommission = totalSessionValue * (currentTier.sessionCommissionPercent / 100)
    }
    
    // Sales commission
    if (currentTier.salesFlatFee) {
      salesCommission = packages.length * currentTier.salesFlatFee
    } else if (currentTier.salesCommissionPercent) {
      const totalSalesValue = packages.reduce((sum, p) => sum + p.totalValue, 0)
      salesCommission = totalSalesValue * (currentTier.salesCommissionPercent / 100)
    }
    
    return {
      sessionCommission,
      salesCommission,
      tierBonus,
      totalCommission: sessionCommission + salesCommission + tierBonus,
      tierReached: currentTier.tierLevel,
      calculationSnapshot: {
        tierUsed: currentTier.name,
        sessionCount: sessions.length,
        rates: {
          sessionFlatFee: currentTier.sessionFlatFee,
          sessionPercent: currentTier.sessionCommissionPercent,
          salesPercent: currentTier.salesCommissionPercent
        }
      }
    }
  }
  
  // Implement calculateGraduated and calculateFlat similarly...
}
```

---

## Phase 4: API & UI Updates (Days 5-7)

### Step 1: Profile Management API
```typescript
// src/app/api/commission/profiles/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorizedResponse()
  
  const profiles = await prisma.commissionProfile.findMany({
    where: {
      organizationId: session.user.organizationId,
      isActive: true
    },
    include: {
      tiers: {
        orderBy: { tierLevel: 'asc' }
      },
      _count: {
        select: { users: true }
      }
    }
  })
  
  return NextResponse.json(profiles)
}

export async function POST(req: Request) {
  // Create new profile...
}
```

### Step 2: Profile Management UI
```tsx
// src/app/(authenticated)/settings/commission/page.tsx
export default function CommissionSettingsPage() {
  return (
    <div className="space-y-6">
      <h1>Commission Profiles</h1>
      
      <ProfileList />
      <CreateProfileButton />
    </div>
  )
}
```

### Step 3: Update Trainer Assignment
```tsx
// In UserForm component, add profile selection
<Select
  label="Commission Profile"
  value={formData.commissionProfileId}
  onChange={(e) => setFormData({
    ...formData,
    commissionProfileId: e.target.value
  })}
>
  {profiles.map(profile => (
    <option key={profile.id} value={profile.id}>
      {profile.name}
    </option>
  ))}
</Select>
```

---

## Phase 5: Testing & Validation (Days 8-9)

### Step 1: Create Test Suite
```typescript
// __tests__/commission/v2/calculator.test.ts
describe('CommissionCalculatorV2', () => {
  it('calculates flat fee correctly', async () => {
    // $50 per session, 10 sessions = $500
  })
  
  it('calculates percentage correctly', async () => {
    // 15% of $1000 = $150
  })
  
  it('calculates hybrid correctly', async () => {
    // $30 per session + 5% = combined total
  })
  
  it('stores calculation history', async () => {
    // Verify CommissionCalculation record created
  })
})
```

### Step 2: Manual Testing Checklist
- [ ] Create profile with flat fee tiers
- [ ] Create profile with percentage tiers  
- [ ] Create profile with hybrid tiers
- [ ] Assign trainer to profile
- [ ] Calculate commission for various scenarios
- [ ] Verify calculation history saved
- [ ] Export payroll report
- [ ] Change profile and verify old calculations unchanged

---

## Phase 6: Deployment & Cutover (Day 10)

### Step 1: Deploy to Staging
```bash
git checkout staging
git merge feat/commission-v2
npm run build
npm run migrate
git push origin staging
```

### Step 2: Test with Production Data Copy
- [ ] Copy production data to staging
- [ ] Run migration script
- [ ] Verify calculations match expected
- [ ] Test all commission scenarios

### Step 3: Production Deployment
```bash
# Backup production database first!
railway run npx prisma migrate deploy

# Run migration script
railway run npm run migrate:commission

# Verify everything working
```

### Step 4: Remove Old System (After 1 week stable)
```typescript
// Remove from Organization model
// - commissionMethod field
// - commissionTiers relation

// Remove CommissionTier model entirely

// Remove old calculation code
```

---

## Success Criteria
- [ ] All existing commission structures migrated successfully
- [ ] New flat fee calculation working correctly
- [ ] Historical calculations preserved and unchanged
- [ ] No calculation errors in production for 1 week
- [ ] Old system safely removed

## Risk Mitigation
- Keep database backups before migration
- Test thoroughly with production data copy
- Monitor calculations closely first week
- Keep old calculation code available for reference

## Definition of Done
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Deployed to production successfully
- [ ] Existing users migrated
- [ ] No calculation discrepancies
- [ ] Old system removed after stabilization

---

## Phase 7: Database Cleanup (After 2 weeks stable)

### Why Wait?
- Ensure no rollback needed
- Verify all calculations correct
- Confirm no missing edge cases
- Have historical data backed up

### Step 1: Backup Old Data
```sql
-- Create archive of v1 commission data before removal
CREATE TABLE _archive_commission_tiers AS 
SELECT *, NOW() as archived_at, 'v1_cleanup' as archive_reason
FROM commission_tiers;

CREATE TABLE _archive_org_commission_settings AS
SELECT id, commission_method, NOW() as archived_at 
FROM organizations;
```

### Step 2: Remove V1 Schema
```prisma
// Remove from schema.prisma:

// From Organization model, remove:
// commissionMethod     String             @default("PROGRESSIVE")
// commissionTiers      CommissionTier[]

// Delete entire model:
// model CommissionTier { ... }
```

### Step 3: Create Cleanup Migration
```sql
-- Migration: remove_v1_commission_system.sql

-- Drop v1 foreign keys first
ALTER TABLE commission_tiers 
DROP CONSTRAINT IF EXISTS commission_tiers_organization_id_fkey;

-- Remove v1 fields from organizations
ALTER TABLE organizations 
DROP COLUMN IF EXISTS commission_method;

-- Drop v1 tables
DROP TABLE IF EXISTS commission_tiers;

-- Clean up any orphaned data
DELETE FROM audit_logs 
WHERE entity_type = 'CommissionTier' 
AND created_at < NOW() - INTERVAL '30 days';
```

### Step 4: Remove V1 Code
```typescript
// Delete these files:
// - src/lib/commission/calculator.ts (v1 calculator)
// - src/lib/commission/types.ts (v1 types)
// - src/app/api/commission/route.ts (v1 endpoints)
// - Any UI components specific to v1

// Update these files:
// - Remove v1 imports
// - Remove v1 calculation fallbacks
// - Clean up type definitions
```

### Step 5: Verify Cleanup
- [ ] No references to `commissionMethod` in codebase
- [ ] No references to `commission_tiers` table
- [ ] All commission calculations using v2 system
- [ ] Archive tables created successfully
- [ ] All tests still passing

### Cleanup Checklist
- [ ] Archive tables created with timestamp
- [ ] V1 schema removed from Prisma
- [ ] Migration successfully deployed
- [ ] V1 code files deleted
- [ ] No TypeScript errors
- [ ] Production working correctly

---

## UX Design Considerations

### 1. Profile Management Interface

#### Profile List View
```
┌─────────────────────────────────────────────────────────┐
│ Commission Profiles                          [+ Create] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🎯 Standard Trainer                    5 trainers   ││
│ │ Progressive • 3 tiers • 10-20% commission           ││
│ │                                    [Edit] [Delete]  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💰 Flat Rate Contractor                2 trainers   ││
│ │ Flat • $50 per session • No bonuses                 ││
│ │                                    [Edit] [Delete]  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⭐ Elite Performer                      1 trainer    ││
│ │ Progressive • 4 tiers • Up to 25% + bonuses         ││
│ │                                    [Edit] [Delete]  ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**UX Principles:**
- Show key info at a glance (method, tiers, rates)
- Display trainer count to prevent accidental deletion
- Use icons to differentiate profile types
- One-click access to edit

#### Profile Creation Flow

**Step 1: Basic Info**
```
Name: [Elite Trainer Program        ]
Description: [For trainers with 2+ years]
Calculation: ( ) Progressive - All sessions at highest tier
             (•) Graduated - Each tier applies to its range
             ( ) Flat - Same rate regardless of volume
```

**Step 2: Tier Configuration**
```
┌─ Tier 1: Base ──────────────────────────────┐
│ Trigger: Automatic (0+ sessions)            │
│                                              │
│ 💵 Session Reward:                          │
│   ( ) Percentage: [  ]% of session value    │
│   (•) Flat Fee: $[50] per session          │
│   ( ) None                                  │
│                                              │
│ 📦 Sales Reward:                           │
│   (•) Percentage: [8]% of package value     │
│   ( ) Flat Fee: $[  ] per package          │
│   ( ) None                                  │
│                                              │
│ 🎁 Tier Bonus: $[0]                        │
└──────────────────────────────────────────────┘

[+ Add Next Tier]
```

**UX Decisions:**
- Radio buttons for exclusive choices (percentage vs flat)
- Clear labeling with icons
- Show currency symbols for clarity
- Progressive disclosure (add tiers as needed)

### 2. Trainer Assignment

#### In User Edit Form
```
Commission Settings
───────────────────
Profile: [Standard Trainer    ▼]
         ├─ 🎯 Standard Trainer (10-20%)
         ├─ 💰 Flat Rate ($50/session)
         ├─ ⭐ Elite (up to 25% + bonus)
         └─ 🚀 Sales Focused (heavy on packages)

Preview: "With current month's 23 sessions, 
         this trainer would earn ~$1,150"
```

**UX Features:**
- Dropdown shows key differentiator for each profile
- Live preview of commission impact
- Icons for quick visual scanning

### 3. Commission Calculation Display

#### Trainer Dashboard View
```
┌─── Your Commission - November 2024 ─────────────┐
│                                                 │
│ Profile: Standard Trainer                      │
│ Current Tier: Tier 2 (15-29 sessions)         │
│                                                 │
│ Progress: ████████████░░░░░ 23/30             │
│          23 sessions (7 more for Tier 3!)      │
│                                                 │
│ Earnings Breakdown:                            │
│ ├─ Sessions (23 × $50): $1,150                │
│ ├─ Package Sales (2):    $160                 │
│ └─ Tier 2 Bonus:        $100                  │
│                          ─────                 │
│ Total Commission:        $1,410                │
│                                                 │
│ [View Details]                                 │
└─────────────────────────────────────────────────┘
```

**UX Principles:**
- Show progress toward next tier
- Break down earnings clearly
- Motivate with "X more for next tier"
- Keep it scannable

### 4. Admin Commission Report

#### Report View with Filters
```
Commission Report - November 2024
──────────────────────────────────
Filters: [All Profiles ▼] [All Locations ▼]

Group by: (•) Trainer  ( ) Profile  ( ) Location

┌────────────┬─────────┬────────┬───────────┐
│ Trainer    │ Profile │ Tier   │ Commission│
├────────────┼─────────┼────────┼───────────┤
│ John Smith │ Standard│ Tier 2 │   $1,410  │
│  23 sessions, 2 packages sold  │           │
├────────────┼─────────┼────────┼───────────┤
│ Jane Doe   │ Elite   │ Tier 3 │   $3,250  │
│  45 sessions, 5 packages sold  │           │
├────────────┼─────────┼────────┼───────────┤
│ Bob Wilson │ Flat    │ Tier 1 │   $750    │
│  15 sessions, 0 packages sold  │           │
└────────────┴─────────┴────────┴───────────┘

Total: $5,410         [Export Excel] [Approve All]
```

### 5. Error States & Edge Cases

#### No Profile Assigned
```
⚠️ No Commission Profile
This trainer has no commission profile assigned.
They will not earn any commission until you:

[Assign Profile] [Create New Profile]
```

#### Profile Deletion Warning
```
⚠️ Delete "Standard Trainer" Profile?

This profile is currently assigned to:
• 5 active trainers
• 2 archived trainers

These trainers will be unassigned and won't 
earn commission until reassigned.

Historical calculations will be preserved.

[Cancel] [Reassign Trainers] [Delete Anyway]
```

### 6. Mobile Responsiveness

#### Mobile Profile View (360px width)
```
┌─────────────────────────┐
│ Commission Profiles     │
│                    [+]  │
├─────────────────────────┤
│ 🎯 Standard Trainer     │
│ 5 trainers • 10-20%     │
│ [Edit]                  │
├─────────────────────────┤
│ 💰 Flat Rate           │
│ 2 trainers • $50/sess   │
│ [Edit]                  │
└─────────────────────────┘
```

### UX Best Practices Applied

1. **Progressive Disclosure**: Don't show all options at once
2. **Immediate Feedback**: Show impact of changes instantly
3. **Prevent Errors**: Warn before destructive actions
4. **Motivate Users**: Show progress toward goals
5. **Scannable**: Use icons, colors, and spacing
6. **Mobile-First**: Ensure touch-friendly on small screens
7. **Contextual Help**: Explain complex concepts inline

### Accessibility Considerations

- **Keyboard Navigation**: All forms and buttons accessible via Tab
- **Screen Readers**: Proper ARIA labels for icons
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Error Messages**: Clear, actionable error text
- **Focus States**: Visible focus indicators