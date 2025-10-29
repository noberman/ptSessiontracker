# Commission Module Design Document

## Executive Summary
Complete redesign of the commission calculation system using a tier-based framework that separates triggers (what moves trainers between tiers) from rewards (what they earn at each tier). This approach provides flexibility for complex commission structures while maintaining simplicity and avoiding the pitfalls of custom formula systems.

## Core Requirements

### Business Needs
1. Support multiple commission calculation methods across different organizations
2. Enable tier-based commission rate adjustments based on performance metrics
3. Allow different commission profiles for different trainer levels
4. Calculate commissions monthly or quarterly (set at organization level)
5. Maintain clear audit trail of commission calculations
6. Handle no-shows (no commission) and substitutions (commission to executor)

### Organization-Level Settings
- **Commission Period**: Monthly or Quarterly (set once per organization)
- **Calculation Day**: When to run calculations (e.g., 1st of month)
- **Default Profile**: Which profile to assign new trainers

### Commission Components

#### 1. Session Commission (Execution-Based)
- **Percentage-based**: Percentage of validated session value
  - Example: 20% of $100 session = $20 per session
- **Flat fee per session**: Fixed dollar amount per session regardless of value
  - Example: $50 per session (10 sessions = $500)
- **Hybrid**: Both flat fee AND percentage
  - Example: $30 per session + 5% of value

#### 2. Sales Commission (Package Sales)
- **Percentage-based**: Percentage of package value when sold
  - Example: 10% of $1,000 package = $100 commission
- **Flat fee per sale**: Fixed dollar amount per package sold
  - Example: $75 per package sold

#### 3. Tier Bonuses
- Fixed dollar amounts for achieving specific tier thresholds
- One-time payment when tier is reached
- Example: $500 bonus for reaching tier 3

## Tier-Based Architecture

### Core Framework

The commission system uses configurable tiers with two independent components:

1. **Tier Triggers** - Conditions that determine which tier a trainer achieves
2. **Tier Rewards** - Compensation earned when a tier is achieved

This separation ensures no circular dependencies and provides maximum flexibility.

### Data Model

```typescript
interface CommissionProfile {
  id: string
  organizationId: string
  name: string
  description?: string
  isDefault: boolean
  calculationMethod: 'FLAT' | 'PROGRESSIVE' | 'GRADUATED'
  tiers: CommissionTier[]
  createdAt: Date
  updatedAt: Date
}

interface CommissionTier {
  id: string
  profileId: string
  tierLevel: number  // 1, 2, 3, etc.
  name: string       // "Base", "Performer", "Elite"
  
  // TRIGGERS - What moves trainer to this tier
  trigger: {
    type: 'NONE' | 'SESSION_COUNT' | 'SALES_VOLUME' | 'BOTH_AND' | 'EITHER_OR'
    sessionThreshold?: number    // e.g., 20 sessions
    salesThreshold?: number      // e.g., $5000 in sales
  }
  
  // REWARDS - What trainer earns at this tier
  rewards: {
    // Session-based rewards (can use one or both)
    sessionCommissionPercent?: number   // % of session value
    sessionFlatFee?: number            // Fixed $ per session
    
    // Sales-based rewards (can use one or both)
    salesCommissionPercent?: number     // % of package sales
    salesFlatFee?: number              // Fixed $ per package sold
    
    // Tier achievement bonus
    tierBonus?: number                 // One-time $ bonus for reaching tier
  }
}

// Simple: Trainer just has a commissionProfileId field
interface User {
  // ... existing fields
  commissionProfileId?: string  // Simple foreign key to CommissionProfile
}
```

## Commission Profiles System

### Overview
Commission Profiles are the core organizational unit that groups commission tiers and settings together. Each profile represents a complete commission structure that can be applied to trainers based on their level, performance, or other criteria.

### Key Concepts

1. **Profile as Container**: Each profile contains multiple tiers with their own triggers and rewards
2. **Simple Assignment**: Each trainer has one commission profile selected via dropdown in their edit page
3. **Flexibility**: Organizations can create unlimited profiles for different trainer categories
4. **Organization Timing**: Commission periods (monthly/quarterly) are set at the organization level

### Use Cases

#### Example 1: Trainer Level-Based Profiles
```
Junior Trainer Profile:
- Lower base commission rates
- Achievable tier thresholds
- Focus on session volume

Senior Trainer Profile:
- Higher base commission rates
- Higher tier thresholds
- Includes sales commission

Lead Trainer Profile:
- Premium commission rates
- Sales-focused tiers
- Additional flat bonuses
```

#### Example 2: Location-Based Profiles
```
Downtown Location Profile:
- Higher rates due to higher session values
- Premium tier bonuses

Suburban Location Profile:
- Standard rates
- Volume-based tiers
```

#### Example 3: Specialization-Based Profiles
```
Personal Training Profile:
- Session-focused tiers
- Standard commission rates

Group Fitness Profile:
- Lower per-session rates
- Higher volume thresholds
- Bonus for class fill rates

Specialized Services Profile (Rehab, Sports):
- Premium commission rates
- Quality-based bonuses
```

### Profile Assignment

**Simple Dropdown Selection**: 
- In the trainer edit page, there's a single dropdown to select the commission profile
- Change takes effect immediately for next commission calculation
- No historical tracking needed - just the current profile matters

### Profile Management Workflow

```
1. Create Profile
   ├── Define calculation method (Flat/Progressive/Graduated)
   ├── Set up tiers with triggers and rewards
   └── Mark as active/inactive

2. Assign to Trainers
   ├── Select trainers by level/location/specialty
   ├── Set effective date
   └── Add notes for audit trail

3. Monitor & Adjust
   ├── Review performance metrics
   ├── Adjust tier thresholds if needed
   └── Transition trainers between profiles

4. Calculate Commissions
   ├── System uses trainer's active profile
   ├── Applies tier logic based on profile settings
   └── Generates detailed calculation records
```

### How Profiles Work

#### Simple Assignment
```typescript
// In trainer edit page - just update the profile
await prisma.user.update({
  where: { id: trainerId },
  data: { commissionProfileId: selectedProfileId }
})
```

#### Commission Calculation
```typescript
// During commission calculation, just get the trainer's profile
const trainer = await prisma.user.findUnique({
  where: { id: trainerId },
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

// Use trainer.commissionProfile for calculations
```

### Common Profile Configurations

#### 1. Flat Rate Profiles

**1a. Percentage-Based Contractor**
```
Profile: "Standard Contractor - Percentage"
Method: FLAT
Single Tier:
  - Trigger: NONE (always applies)
  - Rewards: 25% session commission, 0% sales
```

**1b. Fixed Fee Contractor**
```
Profile: "Standard Contractor - Fixed Fee"
Method: FLAT
Single Tier:
  - Trigger: NONE (always applies)
  - Rewards: $50 per session (sessionFlatFee)
```

**1c. Hybrid Contractor**
```
Profile: "Premium Contractor - Hybrid"
Method: FLAT
Single Tier:
  - Trigger: NONE (always applies)
  - Rewards: $30 per session + 5% of session value
```

#### 2. Progressive Performance Profile
Motivates trainers to increase volume:
```
Profile: "Performance Driven"
Method: PROGRESSIVE
Tier 1 "Base":
  - Trigger: NONE
  - Rewards: 20% session, 5% sales
Tier 2 "Achiever":
  - Trigger: 20+ sessions
  - Rewards: 25% session, 7% sales
Tier 3 "Elite":
  - Trigger: 40+ sessions OR $10K sales
  - Rewards: 30% session, 10% sales, $500 bonus
```

#### 3. Graduated Brackets Profile
Similar to tax brackets, rewards incremental achievement:
```
Profile: "Graduated Growth"
Method: GRADUATED
Tier 1:
  - Range: Sessions 1-20
  - Rewards: 20% session commission
Tier 2:
  - Range: Sessions 21-40
  - Rewards: 25% session commission
Tier 3:
  - Range: Sessions 41+
  - Rewards: 30% session commission
```

### Database Schema

```prisma
model CommissionProfile {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  isDefault       Boolean  @default(false)
  isActive        Boolean  @default(true)
  
  // Calculation method determines how tiers are applied
  calculationMethod CalculationMethod @default(PROGRESSIVE)
  
  // Relationships
  organization    Organization @relation(fields: [organizationId], references: [id])
  tiers          CommissionTier[]
  trainers       User[]  // Simple one-to-many relationship
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([organizationId])
  @@unique([organizationId, name])
}

model CommissionTier {
  id              String   @id @default(cuid())
  profileId       String
  tierLevel       Int      // 1, 2, 3, etc.
  name            String   // "Base", "Performer", "Elite"
  
  // Trigger Configuration
  triggerType     TriggerType @default(NONE)
  sessionThreshold Int?
  salesThreshold   Decimal?
  
  // Reward Configuration - Session Based
  sessionCommissionPercent Decimal? @db.Decimal(5, 2)  // e.g., 20.50%
  sessionFlatFee          Decimal? @db.Decimal(10, 2) // e.g., $50.00 per session
  
  // Reward Configuration - Sales Based  
  salesCommissionPercent   Decimal? @db.Decimal(5, 2)  // e.g., 10.25%
  salesFlatFee            Decimal? @db.Decimal(10, 2) // e.g., $75.00 per sale
  
  // Reward Configuration - Bonuses
  tierBonus               Decimal? @db.Decimal(10, 2) // e.g., $500.00 one-time
  
  // Relationships
  profile         CommissionProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([profileId])
  @@unique([profileId, tierLevel])
}

// No separate TrainerCommissionProfile model needed!
// Just add commissionProfileId to User model:

model User {
  // ... existing fields
  
  commissionProfileId String?
  commissionProfile   CommissionProfile? @relation(fields: [commissionProfileId], references: [id])
  
  // ... rest of fields
}

model CommissionCalculation {
  id              String   @id @default(cuid())
  organizationId  String
  trainerId       String
  
  // Period
  periodStart     DateTime
  periodEnd       DateTime
  periodType      PeriodType // MONTHLY, QUARTERLY
  
  // Metrics used for calculation
  sessionCount    Int
  sessionValue    Decimal @db.Decimal(10, 2)
  salesCount      Int
  salesValue      Decimal @db.Decimal(10, 2)
  
  // Tier Achievement
  profileId       String
  achievedTierLevel Int
  achievedTierName String
  
  // Calculated Commission
  sessionCommission Decimal @db.Decimal(10, 2)
  salesCommission   Decimal @db.Decimal(10, 2)
  flatBonus        Decimal @db.Decimal(10, 2)
  totalCommission  Decimal @db.Decimal(10, 2)
  
  // Calculation Details (JSON)
  calculationDetails Json  // Stores breakdown for audit
  
  // Status
  status          CalculationStatus @default(PENDING)
  approvedBy      String?
  approvedAt      DateTime?
  paidAt          DateTime?
  
  // Relationships
  organization    Organization @relation(fields: [organizationId], references: [id])
  trainer         User @relation(fields: [trainerId], references: [id])
  profile         CommissionProfile @relation(fields: [profileId], references: [id])
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([organizationId])
  @@index([trainerId])
  @@index([periodStart, periodEnd])
  @@unique([trainerId, periodStart, periodEnd])
}

enum TriggerType {
  NONE          // Default tier, no trigger required
  SESSION_COUNT // Based on number of sessions
  SALES_VOLUME  // Based on sales amount
  BOTH_AND      // Both session AND sales thresholds must be met
  EITHER_OR     // Either session OR sales threshold triggers tier
}

enum CalculationMethod {
  FLAT        // Single tier, flat rates
  PROGRESSIVE // Highest achieved tier applies to all
  GRADUATED   // Each tier applies to its range (like tax brackets)
}

enum PeriodType {
  MONTHLY
  QUARTERLY
}

enum CalculationStatus {
  PENDING
  APPROVED
  PAID
  CANCELLED
}
```

## Backend Implementation

### Commission Calculation Engine

```typescript
// src/lib/commission/tier-calculator.ts

interface CalculationContext {
  trainer: User
  period: { start: Date; end: Date }
  metrics: {
    sessionCount: number
    sessionValue: number
    salesCount: number
    salesValue: number
  }
}

export class TierCommissionCalculator {
  /**
   * Main calculation method
   */
  async calculateCommission(
    trainerId: string,
    period: { start: Date; end: Date }
  ): Promise<CommissionCalculation> {
    // 1. Get trainer's active commission profile
    const profile = await this.getActiveProfile(trainerId, period.end)
    if (!profile) {
      throw new Error(`No commission profile assigned to trainer ${trainerId}`)
    }
    
    // 2. Gather metrics for the period
    const metrics = await this.gatherMetrics(trainerId, period)
    
    // 3. Determine achieved tier based on triggers
    const achievedTier = this.determineAchievedTier(profile.tiers, metrics)
    
    // 4. Calculate commission based on method and tier
    const commission = this.calculateTierCommission(
      profile.calculationMethod,
      profile.tiers,
      achievedTier,
      metrics
    )
    
    // 5. Store calculation record
    return await this.storeCalculation({
      trainerId,
      period,
      metrics,
      profile,
      achievedTier,
      commission
    })
  }
  
  /**
   * Determine which tier the trainer achieved
   */
  private determineAchievedTier(
    tiers: CommissionTier[],
    metrics: CalculationMetrics
  ): CommissionTier {
    // Sort tiers by level descending (highest first)
    const sortedTiers = [...tiers].sort((a, b) => b.tierLevel - a.tierLevel)
    
    for (const tier of sortedTiers) {
      if (this.tierTriggered(tier, metrics)) {
        return tier
      }
    }
    
    // Return base tier if no triggers met
    return tiers.find(t => t.triggerType === 'NONE') || tiers[0]
  }
  
  /**
   * Check if tier trigger conditions are met
   */
  private tierTriggered(tier: CommissionTier, metrics: CalculationMetrics): boolean {
    switch (tier.trigger.type) {
      case 'NONE':
        return true // Default tier always applies
        
      case 'SESSION_COUNT':
        return metrics.sessionCount >= (tier.trigger.sessionThreshold || 0)
        
      case 'SALES_VOLUME':
        return metrics.salesValue >= (tier.trigger.salesThreshold || 0)
        
      case 'BOTH_AND':
        return (
          metrics.sessionCount >= (tier.trigger.sessionThreshold || 0) &&
          metrics.salesValue >= (tier.trigger.salesThreshold || 0)
        )
        
      case 'EITHER_OR':
        return (
          metrics.sessionCount >= (tier.trigger.sessionThreshold || 0) ||
          metrics.salesValue >= (tier.trigger.salesThreshold || 0)
        )
        
      default:
        return false
    }
  }
  
  /**
   * Calculate commission based on method
   */
  private calculateTierCommission(
    method: CalculationMethod,
    tiers: CommissionTier[],
    achievedTier: CommissionTier,
    metrics: CalculationMetrics
  ): CommissionBreakdown {
    switch (method) {
      case 'FLAT':
        // Simple calculation with single tier
        return this.calculateFlatCommission(achievedTier, metrics)
        
      case 'PROGRESSIVE':
        // Achieved tier rate applies to all metrics
        return this.calculateProgressiveCommission(achievedTier, metrics)
        
      case 'GRADUATED':
        // Each tier applies to its range
        return this.calculateGraduatedCommission(tiers, metrics)
        
      default:
        throw new Error(`Unknown calculation method: ${method}`)
    }
  }
  
  /**
   * Progressive calculation - achieved tier applies to all
   */
  private calculateProgressiveCommission(
    tier: CommissionTier,
    metrics: CalculationMetrics
  ): CommissionBreakdown {
    // Calculate session commission (flat fee OR percentage, or both)
    let sessionCommission = 0
    if (tier.rewards.sessionFlatFee) {
      sessionCommission += metrics.sessionCount * tier.rewards.sessionFlatFee
    }
    if (tier.rewards.sessionCommissionPercent) {
      sessionCommission += metrics.sessionValue * tier.rewards.sessionCommissionPercent / 100
    }
    
    // Calculate sales commission (flat fee OR percentage, or both)
    let salesCommission = 0
    if (tier.rewards.salesFlatFee) {
      salesCommission += metrics.salesCount * tier.rewards.salesFlatFee
    }
    if (tier.rewards.salesCommissionPercent) {
      salesCommission += metrics.salesValue * tier.rewards.salesCommissionPercent / 100
    }
    
    const tierBonus = tier.rewards.tierBonus || 0
    
    return {
      sessionCommission,
      salesCommission,
      tierBonus,
      totalCommission: sessionCommission + salesCommission + tierBonus,
      breakdown: [{
        tierName: tier.name,
        tierLevel: tier.tierLevel,
        sessionCommission,
        salesCommission,
        tierBonus
      }]
    }
  }
  
  /**
   * Graduated calculation - each tier applies to its range
   */
  private calculateGraduatedCommission(
    tiers: CommissionTier[],
    metrics: CalculationMetrics
  ): CommissionBreakdown {
    const sortedTiers = [...tiers].sort((a, b) => a.tierLevel - b.tierLevel)
    const breakdown = []
    
    let remainingSessions = metrics.sessionCount
    let remainingSales = metrics.salesValue
    let totalSessionCommission = 0
    let totalSalesCommission = 0
    let totalFlatBonus = 0
    
    for (const tier of sortedTiers) {
      if (remainingSessions <= 0 && remainingSales <= 0) break
      
      // Calculate how much applies to this tier
      const tierSessions = Math.min(
        remainingSessions,
        (tier.trigger.sessionThreshold || Infinity) - 
        (sortedTiers[tier.tierLevel - 2]?.trigger.sessionThreshold || 0)
      )
      
      const tierSales = Math.min(
        remainingSales,
        (tier.trigger.salesThreshold || Infinity) -
        (sortedTiers[tier.tierLevel - 2]?.trigger.salesThreshold || 0)
      )
      
      // Calculate commission for this tier's portion
      const sessionComm = (tierSessions / metrics.sessionCount) * metrics.sessionValue * 
                          (tier.rewards.sessionCommissionPercent || 0) / 100
      const salesComm = tierSales * (tier.rewards.salesCommissionPercent || 0) / 100
      
      // Flat bonus only applies if tier is achieved
      const flatBonus = this.tierTriggered(tier, metrics) ? (tier.rewards.flatBonus || 0) : 0
      
      totalSessionCommission += sessionComm
      totalSalesCommission += salesComm
      totalFlatBonus += flatBonus
      
      breakdown.push({
        tierName: tier.name,
        tierLevel: tier.tierLevel,
        sessionCommission: sessionComm,
        salesCommission: salesComm,
        flatBonus
      })
      
      remainingSessions -= tierSessions
      remainingSales -= tierSales
    }
    
    return {
      sessionCommission: totalSessionCommission,
      salesCommission: totalSalesCommission,
      flatBonus: totalFlatBonus,
      totalCommission: totalSessionCommission + totalSalesCommission + totalFlatBonus,
      breakdown
    }
  }
}
```

### API Endpoints

```typescript
// src/app/api/commission/profiles/route.ts

// GET /api/commission/profiles - List all profiles for organization
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  
  const profiles = await prisma.commissionProfile.findMany({
    where: { 
      organizationId: session.user.organizationId,
      isActive: true
    },
    include: {
      tiers: { orderBy: { tierLevel: 'asc' } },
      _count: { select: { assignments: true } }
    }
  })
  
  return NextResponse.json(profiles)
}

// POST /api/commission/profiles - Create new profile
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  
  const profile = await prisma.commissionProfile.create({
    data: {
      organizationId: session.user.organizationId,
      name: body.name,
      description: body.description,
      calculationMethod: body.calculationMethod,
      tiers: {
        create: body.tiers.map((tier, index) => ({
          tierLevel: index + 1,
          name: tier.name,
          triggerType: tier.trigger.type,
          sessionThreshold: tier.trigger.sessionThreshold,
          salesThreshold: tier.trigger.salesThreshold,
          // Session rewards
          sessionCommissionPercent: tier.rewards.sessionCommissionPercent,
          sessionFlatFee: tier.rewards.sessionFlatFee,
          // Sales rewards
          salesCommissionPercent: tier.rewards.salesCommissionPercent,
          salesFlatFee: tier.rewards.salesFlatFee,
          // Bonuses
          tierBonus: tier.rewards.tierBonus
        }))
      }
    }
  })
  
  return NextResponse.json(profile)
}
```

## User Interface

### Commission Profile Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│ Create Commission Profile                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Profile Name: [Progressive Trainer Commission    ]                 │
│ Description:  [Standard commission structure for trainers        ] │
│                                                                     │
│ Calculation Method:                                                │
│ ● Progressive (Achieved tier rate applies to all)                  │
│ ○ Graduated (Each tier applies to its range)                      │
│ ○ Flat (Single tier with flat rates)                             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ TIER CONFIGURATION                                                  │
│                                                                     │
│ ┌─── Tier 1: Base ────────────────────────────────────────────┐   │
│ │                                                               │   │
│ │ Trigger:    ● No trigger (default tier)                     │   │
│ │                                                               │   │
│ │ Rewards:                                                     │   │
│ │   Session Commission:                                        │   │
│ │     ● Percentage: [10  ]%  ○ Flat Fee: $[    ]  ○ Both     │   │
│ │   Sales Commission:                                          │   │
│ │     ● Percentage: [5   ]%  ○ Flat Fee: $[    ]              │   │
│ │   Tier Bonus:        $[    ]  (one-time)                    │   │
│ │                                                               │   │
│ │ [Remove Tier]                                                │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─── Tier 2: Performer ───────────────────────────────────────┐   │
│ │                                                               │   │
│ │ Trigger:                                                      │   │
│ │   ● Session threshold: [15  ] sessions                       │   │
│ │   ○ Sales threshold: $[     ]                               │   │
│ │   ○ Both thresholds must be met                             │   │
│ │   ○ Either threshold triggers tier                          │   │
│ │                                                               │   │
│ │ Rewards:                                                     │   │
│ │   Session Commission:                                        │   │
│ │     ○ Percentage: [    ]%  ● Flat Fee: $[50  ]  ○ Both     │   │
│ │   Sales Commission:                                          │   │
│ │     ● Percentage: [8   ]%  ○ Flat Fee: $[    ]              │   │
│ │   Tier Bonus:        $[100 ]  (one-time)                    │   │
│ │                                                               │   │
│ │ [Remove Tier]                                                │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─── Tier 3: Elite ───────────────────────────────────────────┐   │
│ │                                                               │   │
│ │ Trigger:                                                      │   │
│ │   ○ Session threshold: [    ] sessions                       │   │
│ │   ○ Sales threshold: $[     ]                               │   │
│ │   ● Both thresholds must be met                             │   │
│ │      Sessions: [25  ]  Sales: $[5000]                       │   │
│ │                                                               │   │
│ │ Rewards:                                                     │   │
│ │   Session Commission: [20  ]%                               │   │
│ │   Sales Commission:   [12  ]%                               │   │
│ │   Flat Bonus:        $[500 ]                                │   │
│ │                                                               │   │
│ │ [Remove Tier]                                                │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ [+ Add Tier]                                                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ TEST CONFIGURATION                                                  │
│                                                                     │
│ Test with sample data:                                             │
│ Sessions: [22  ]  Session Value: $[2200]                          │
│ Sales: [5   ]     Sales Value: $[3500 ]                          │
│                                                                     │
│ [Calculate Test]                                                   │
│                                                                     │
│ Results:                                                           │
│ ✓ Achieved: Tier 2 (Standard)                                     │
│   Session Commission ($50/session × 22): $1,100.00                │
│   Sales Commission (8% × $3,500):         $280.00                 │
│   Tier Bonus:                             $100.00                 │
│   ─────────────────────────────────────────                       │
│   Total:                                 $1,480.00                 │
│                                                                     │
│ [Save Profile] [Cancel]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Trainer Profile Assignment (Simple Dropdown)

In the trainer edit page/module, commission profile assignment is a single dropdown field:

```
┌─── Edit Trainer: John Smith ────────────────────────────────────────┐
│                                                                     │
│ Basic Information                                                  │
│ Name:     [John Smith        ]                                    │
│ Email:    [john@example.com  ]                                    │
│ Role:     [Trainer         ▼]                                     │
│                                                                     │
│ Commission Settings                                                │
│ Profile:  [Senior Trainer Profile ▼]                              │
│           ├─ Junior Trainer                                       │
│           ├─ Senior Trainer                                       │
│           ├─ Lead Trainer                                         │
│           ├─ Elite Performer                                      │
│           └─ Contractor Rate                                      │
│                                                                     │
│ [Save Changes] [Cancel]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Commission Calculation View (Report Structure Unchanged)

**Note**: The existing commission report structure and UI remain the same. Only the calculation engine changes to use profiles and tiers.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Commission Report - March 2024                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filters: [All Locations ▼] [All Profiles ▼] Status: [Pending ▼]  │
│                                                                     │
│ ┌──────────────┬────────┬────────┬──────────┬──────────┬─────────┐│
│ │ Trainer      │Sessions│ Sales  │ Tier     │Commission│ Status  ││
│ ├──────────────┼────────┼────────┼──────────┼──────────┼─────────┤│
│ │ John Smith   │ 22     │ $3,500 │ Tier 2   │ $710.00  │ Pending ││
│ │ ├ Sessions   │        │        │ 15% rate │ $330.00  │         ││
│ │ ├ Sales      │        │        │ 8% rate  │ $280.00  │         ││
│ │ └ Bonus      │        │        │ Tier 2   │ $100.00  │         ││
│ │              │        │        │          │          │         ││
│ │ Sarah Johnson│ 45     │ $8,200 │ Tier 3   │ $2,140.00│ Approved││
│ │ ├ Sessions   │        │        │ 20% rate │ $900.00  │         ││
│ │ ├ Sales      │        │        │ 12% rate │ $984.00  │         ││
│ │ └ Bonus      │        │        │ Tier 3   │ $500.00  │         ││
│ └──────────────┴────────┴────────┴──────────┴──────────┴─────────┘│
│                                                                     │
│ Summary:                                                           │
│ Total Trainers: 15                                                │
│ Total Commission: $18,450.00                                       │
│ Average per Trainer: $1,230.00                                    │
│                                                                     │
│ [Export to Excel] [Approve All] [View Details]                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Example Configurations

### 1. Simple Progressive Structure
```javascript
{
  name: "Standard Progressive",
  calculationMethod: "PROGRESSIVE",
  tiers: [
    {
      tierLevel: 1,
      name: "Base",
      trigger: { type: "NONE" },
      rewards: {
        sessionCommissionPercent: 10,
        salesCommissionPercent: 5
      }
    },
    {
      tierLevel: 2,
      name: "Performer",
      trigger: { 
        type: "SESSION_COUNT",
        sessionThreshold: 20
      },
      rewards: {
        sessionCommissionPercent: 15,
        salesCommissionPercent: 8,
        flatBonus: 100
      }
    },
    {
      tierLevel: 3,
      name: "Elite",
      trigger: {
        type: "SESSION_COUNT",
        sessionThreshold: 40
      },
      rewards: {
        sessionCommissionPercent: 20,
        salesCommissionPercent: 10,
        flatBonus: 500
      }
    }
  ]
}
```

### 2. Sales-Focused Structure
```javascript
{
  name: "Sales Champion",
  calculationMethod: "PROGRESSIVE",
  tiers: [
    {
      tierLevel: 1,
      name: "Base",
      trigger: { type: "NONE" },
      rewards: {
        salesCommissionPercent: 8
      }
    },
    {
      tierLevel: 2,
      name: "Sales Pro",
      trigger: {
        type: "SALES_VOLUME",
        salesThreshold: 5000
      },
      rewards: {
        sessionCommissionPercent: 10,
        salesCommissionPercent: 12,
        flatBonus: 200
      }
    },
    {
      tierLevel: 3,
      name: "Sales Elite",
      trigger: {
        type: "SALES_VOLUME",
        salesThreshold: 10000
      },
      rewards: {
        sessionCommissionPercent: 15,
        salesCommissionPercent: 15,
        flatBonus: 750
      }
    }
  ]
}
```

### 3. Flat Fee Progressive Structure
```javascript
{
  name: "Progressive Flat Fee",
  calculationMethod: "PROGRESSIVE",
  tiers: [
    {
      tierLevel: 1,
      name: "Base",
      trigger: { type: "NONE" },
      rewards: {
        sessionFlatFee: 40  // $40 per session base rate
      }
    },
    {
      tierLevel: 2,
      name: "Standard",
      trigger: { 
        type: "SESSION_COUNT",
        sessionThreshold: 20
      },
      rewards: {
        sessionFlatFee: 50,  // $50 per session after 20 sessions
        tierBonus: 100      // $100 bonus for reaching this tier
      }
    },
    {
      tierLevel: 3,
      name: "Premium",
      trigger: {
        type: "SESSION_COUNT",
        sessionThreshold: 40
      },
      rewards: {
        sessionFlatFee: 60,  // $60 per session after 40 sessions
        tierBonus: 500      // $500 bonus for reaching this tier
      }
    }
  ]
}
```

### 4. Balanced Multi-Condition
```javascript
{
  name: "Balanced Performance",
  calculationMethod: "PROGRESSIVE",
  tiers: [
    {
      tierLevel: 1,
      name: "Base",
      trigger: { type: "NONE" },
      rewards: {
        sessionCommissionPercent: 10,
        salesCommissionPercent: 5
      }
    },
    {
      tierLevel: 2,
      name: "Growth",
      trigger: {
        type: "EITHER_OR",
        sessionThreshold: 15,
        salesThreshold: 3000
      },
      rewards: {
        sessionCommissionPercent: 15,
        salesCommissionPercent: 8
      }
    },
    {
      tierLevel: 3,
      name: "Excellence",
      trigger: {
        type: "BOTH_AND",
        sessionThreshold: 30,
        salesThreshold: 6000
      },
      rewards: {
        sessionCommissionPercent: 20,
        salesCommissionPercent: 12,
        flatBonus: 1000
      }
    }
  ]
}
```

## Implementation Phases

### Phase 1: Core System (Weeks 1-2)
- [ ] Database schema implementation
- [ ] Basic tier calculation engine
- [ ] Progressive calculation method
- [ ] Profile CRUD operations
- [ ] Trainer assignment system

### Phase 2: User Interface (Weeks 3-4)
- [ ] Profile configuration UI
- [ ] Tier builder interface
- [ ] Test calculator
- [ ] Trainer assignment page
- [ ] Basic reporting view

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Graduated calculation method
- [ ] Bulk trainer assignments
- [ ] Commission approval workflow
- [ ] Excel export functionality
- [ ] Audit trail and history

### Phase 4: Optimization (Week 7-8)
- [ ] Performance optimization for large datasets
- [ ] Caching layer for calculations
- [ ] Advanced filtering and search
- [ ] Email notifications
- [ ] API for external integrations

## Technical Considerations

### Performance
- Pre-calculate metrics at session validation time
- Cache tier determinations per period
- Use database indexes on frequently queried fields
- Batch process calculations during off-peak hours

### Data Integrity
- Use transactions for all commission calculations
- Maintain immutable calculation records
- Version control for profile changes
- Soft delete for audit trail

### Security
- Role-based access to commission data
- Encryption for sensitive financial data
- Audit logging for all changes
- Regular backups of calculation data

## Migration Strategy

### From Current System
1. Export existing commission data
2. Map current flat/progressive rates to new tier structure
3. Create default profiles matching current setup
4. Assign trainers to appropriate profiles
5. Run parallel calculations for verification
6. Switch over after validation period

### Data Migration Script
```typescript
async function migrateToTierSystem() {
  // 1. Create default profiles for each existing commission type
  const existingTypes = await getDistinctCommissionTypes()
  
  for (const type of existingTypes) {
    const profile = await createProfileFromLegacyType(type)
    
    // 2. Assign trainers to new profiles
    const trainers = await getTrainersWithCommissionType(type)
    await assignTrainersToProfile(trainers, profile.id)
  }
  
  // 3. Verify calculations match
  await runParallelValidation()
}
```

## Success Metrics

1. **Accuracy**: 100% calculation accuracy with clear audit trails
2. **Flexibility**: Support for 95% of commission structures without custom code
3. **Performance**: Calculate 1000+ trainer commissions in < 30 seconds
4. **Usability**: 90% of users can configure profiles without support
5. **Adoption**: Full migration within 30 days of launch

## Advantages of Tier-Based Approach

### Why Not Formulas?
1. **Simplicity**: No syntax to learn or debug
2. **Safety**: No risk of calculation errors from bad formulas
3. **Performance**: Optimized calculations vs interpreted formulas
4. **Auditability**: Clear tier achievement and reward application
5. **Support**: Easy to troubleshoot and explain to users

### Business Benefits
1. **Transparent**: Trainers understand exactly how commission is calculated
2. **Motivating**: Clear targets and rewards drive performance
3. **Flexible**: Handles virtually all real-world commission structures
4. **Scalable**: Same system works for 10 or 10,000 trainers
5. **Maintainable**: Changes are easy to make and test

## Conclusion

The tier-based commission framework provides the perfect balance of flexibility and simplicity. By separating triggers from rewards and offering multiple calculation methods, the system can handle complex business requirements while remaining intuitive for users to configure and understand. This approach avoids the pitfalls of formula-based systems while delivering all the functionality organizations need for sophisticated commission structures.