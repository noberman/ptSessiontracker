# Commission Module Design Document

## Executive Summary
Complete redesign of the commission calculation system using a tier-based framework that separates triggers (what moves trainers between tiers) from rewards (what they earn at each tier). This approach provides flexibility for complex commission structures while maintaining simplicity and avoiding the pitfalls of custom formula systems.

## Core Requirements

### Business Needs
1. Support multiple commission calculation methods across different organizations
2. Enable tier-based commission rate adjustments based on performance metrics
3. Allow different commission profiles for different trainer levels
4. Calculate commissions monthly or quarterly based on organization preference
5. Maintain clear audit trail of commission calculations
6. Handle no-shows (no commission) and substitutions (commission to executor)

### Commission Components

#### 1. Session Commission (Execution-Based)
- Percentage of validated session value
- Calculated at month-end for all validated sessions
- Example: 20% of $100 session = $20 per session

#### 2. Sales Commission (Package Sales)
- Percentage of package value when sold
- Calculated at month-end for all packages sold
- Example: 10% of $1,000 package = $100 commission

#### 3. Flat Bonuses
- Fixed dollar amounts for achieving specific targets
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
    sessionCommissionPercent?: number   // % of session value
    salesCommissionPercent?: number     // % of package sales
    flatBonus?: number                 // Fixed $ amount
  }
}

interface TrainerCommissionProfile {
  id: string
  trainerId: string
  profileId: string
  effectiveFrom: Date
  effectiveTo?: Date
  assignedBy: string
  assignedAt: Date
}
```

## Commission Profiles System

### Overview
Commission Profiles are the core organizational unit that groups commission tiers and settings together. Each profile represents a complete commission structure that can be applied to trainers based on their level, performance, or other criteria.

### Key Concepts

1. **Profile as Container**: Each profile contains multiple tiers with their own triggers and rewards
2. **Trainer Assignment**: Trainers are assigned to profiles based on their level (Junior, Senior, Lead, etc.)
3. **Flexibility**: Organizations can create unlimited profiles for different trainer categories
4. **Time-Based**: Profile assignments can change over time as trainers progress

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

### Profile Assignment Strategy

1. **Initial Assignment**: When a trainer joins, they're assigned a default profile based on their role/level
2. **Performance Promotion**: As trainers meet certain criteria, they can be promoted to better profiles
3. **Temporary Assignments**: Special profiles for promotional periods or seasonal adjustments
4. **Grandfathering**: Existing trainers can maintain their current profile when new structures are introduced

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

### How Profiles Attach to Trainers

#### Assignment Logic
1. **One Active Profile Per Trainer**: Each trainer has exactly one active commission profile at any given time
2. **Time-Based Effectiveness**: Profile assignments have effective dates, allowing for scheduled changes
3. **Historical Tracking**: Past profile assignments are retained for audit and recalculation purposes

#### Assignment Process
```typescript
// Example: Assigning a profile to a trainer
async function assignProfileToTrainer(
  trainerId: string, 
  profileId: string,
  effectiveFrom: Date,
  assignedBy: string,
  notes?: string
) {
  // 1. End current assignment if exists
  await prisma.trainerCommissionProfile.updateMany({
    where: {
      trainerId,
      effectiveTo: null // Currently active
    },
    data: {
      effectiveTo: effectiveFrom
    }
  })
  
  // 2. Create new assignment
  return await prisma.trainerCommissionProfile.create({
    data: {
      trainerId,
      profileId,
      effectiveFrom,
      assignedBy,
      notes
    }
  })
}
```

#### Profile Selection During Commission Calculation
```typescript
// The system automatically selects the correct profile
async function getActiveProfile(trainerId: string, calculationDate: Date) {
  return await prisma.trainerCommissionProfile.findFirst({
    where: {
      trainerId,
      effectiveFrom: { lte: calculationDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: calculationDate } }
      ]
    },
    include: {
      profile: {
        include: {
          tiers: {
            orderBy: { tierLevel: 'asc' }
          }
        }
      }
    }
  })
}
```

### Common Profile Configurations

#### 1. Flat Rate Profile (Simple)
Perfect for contractors or part-time trainers:
```
Profile: "Standard Contractor"
Method: FLAT
Single Tier:
  - Trigger: NONE (always applies)
  - Rewards: 25% session commission, 0% sales
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
  assignments    TrainerCommissionProfile[]
  
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
  
  // Reward Configuration
  sessionCommissionPercent Decimal? @db.Decimal(5, 2) // e.g., 20.50%
  salesCommissionPercent   Decimal? @db.Decimal(5, 2) // e.g., 10.25%
  flatBonus               Decimal? @db.Decimal(10, 2) // e.g., $500.00
  
  // Relationships
  profile         CommissionProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([profileId])
  @@unique([profileId, tierLevel])
}

model TrainerCommissionProfile {
  id              String   @id @default(cuid())
  trainerId       String
  profileId       String
  
  effectiveFrom   DateTime @default(now())
  effectiveTo     DateTime?
  
  // Audit
  assignedBy      String
  assignedAt      DateTime @default(now())
  notes           String?
  
  // Relationships
  trainer         User @relation(fields: [trainerId], references: [id])
  profile         CommissionProfile @relation(fields: [profileId], references: [id])
  assignedByUser  User @relation("AssignedBy", fields: [assignedBy], references: [id])
  
  @@index([trainerId])
  @@index([profileId])
  @@index([effectiveFrom, effectiveTo])
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
    const sessionCommission = metrics.sessionValue * (tier.rewards.sessionCommissionPercent || 0) / 100
    const salesCommission = metrics.salesValue * (tier.rewards.salesCommissionPercent || 0) / 100
    const flatBonus = tier.rewards.flatBonus || 0
    
    return {
      sessionCommission,
      salesCommission,
      flatBonus,
      totalCommission: sessionCommission + salesCommission + flatBonus,
      breakdown: [{
        tierName: tier.name,
        tierLevel: tier.tierLevel,
        sessionCommission,
        salesCommission,
        flatBonus
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
          sessionCommissionPercent: tier.rewards.sessionCommissionPercent,
          salesCommissionPercent: tier.rewards.salesCommissionPercent,
          flatBonus: tier.rewards.flatBonus
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
│ │   Session Commission: [10  ]%                               │   │
│ │   Sales Commission:   [5   ]%                               │   │
│ │   Flat Bonus:        $[    ]                                │   │
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
│ │   Session Commission: [15  ]%                               │   │
│ │   Sales Commission:   [8   ]%                               │   │
│ │   Flat Bonus:        $[100 ]                                │   │
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
│ ✓ Achieved: Tier 2 (Performer)                                    │
│   Session Commission (15%): $330.00                               │
│   Sales Commission (8%):    $280.00                               │
│   Flat Bonus:               $100.00                               │
│   ─────────────────────────────────                              │
│   Total:                    $710.00                               │
│                                                                     │
│ [Save Profile] [Cancel]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Trainer Assignment Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ Assign Commission Profiles                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filter: [All Locations ▼] [All Roles ▼] Search: [__________]     │
│                                                                     │
│ ┌────────────────┬─────────────────────┬──────────────┬──────────┐│
│ │ Trainer        │ Current Profile     │ Effective    │ Actions  ││
│ ├────────────────┼─────────────────────┼──────────────┼──────────┤│
│ │ John Smith     │ Progressive Trainer │ Jan 1, 2024  │ [Change] ││
│ │ Sarah Johnson  │ Elite Trainer       │ Mar 15, 2024 │ [Change] ││
│ │ Mike Williams  │ Progressive Trainer │ Jan 1, 2024  │ [Change] ││
│ │ Emily Davis    │ No Profile         │ -            │ [Assign] ││
│ └────────────────┴─────────────────────┴──────────────┴──────────┘│
│                                                                     │
│ Bulk Actions:                                                      │
│ [□] Select All                                                     │
│ Selected: 0   [Assign Profile ▼] [Apply]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Commission Calculation View

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

### 3. Balanced Multi-Condition
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