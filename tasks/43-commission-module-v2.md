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