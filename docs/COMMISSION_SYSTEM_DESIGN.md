# Commission System Design - Flexible Multi-Organization

## Overview
The commission system needs to support multiple calculation methods to accommodate different gym business models. Each organization should be able to choose and configure their preferred commission structure.

---

## Commission Calculation Methods

### 1. Progressive Tier System (Currently Defined)
**How it works:** As trainers complete more sessions, they move up tiers. The achieved tier rate applies to ALL sessions.

**Example:**
- Tier 1: 0-30 sessions = 25%
- Tier 2: 31-60 sessions = 30%
- Tier 3: 61+ sessions = 35%

**Calculation for 45 sessions:**
```
45 sessions achieved = Tier 2 (30%)
Commission = 30% × (all 45 sessions × value)
If sessions are $100 each: 30% × $4,500 = $1,350
```

**Use Case:** Rewards high performers, encourages more sessions

---

### 2. Graduated Tier System (Brackets)
**How it works:** Different rates apply to different brackets of sessions (like tax brackets)

**Example:**
- First 30 sessions: 25%
- Next 30 sessions (31-60): 30%
- Sessions 61+: 35%

**Calculation for 45 sessions:**
```
First 30 sessions: 30 × $100 × 25% = $750
Next 15 sessions: 15 × $100 × 30% = $450
Total Commission = $1,200
```

**Use Case:** More predictable costs, fairer for mid-range performers

---

### 3. Package Type Based Commission
**How it works:** Different commission rates for different package types

**Example:**
- Basic Package (5 sessions): 20% commission
- Premium Package (10 sessions): 25% commission
- Elite Package (20 sessions): 30% commission
- Transformation Package: 35% commission

**Calculation:**
```
Trainer completes:
- 2 Basic packages = 10 sessions × $80 × 20% = $160
- 1 Premium package = 10 sessions × $100 × 25% = $250
- 1 Elite package = 20 sessions × $120 × 30% = $720
Total Commission = $1,130
```

**Use Case:** Incentivizes selling higher-value packages

---

### 4. Target-Based Commission (Bonus Structure)
**How it works:** Base rate with bonuses for hitting targets

**Example:**
- Base rate: 20% on all sessions
- Hit 30 sessions: +5% bonus on ALL sessions
- Hit 50 sessions: +10% bonus on ALL sessions
- Hit 75 sessions: +15% bonus on ALL sessions

**Calculation for 55 sessions:**
```
Base: 55 × $100 × 20% = $1,100
Bonus (hit 50 target): 55 × $100 × 10% = $550
Total Commission = $1,650 (effective 30% rate)
```

**Use Case:** Clear targets, motivational milestones

---

### 5. Hybrid System (Most Flexible)
**How it works:** Combines multiple methods

**Example:**
- Base: Package type determines base rate
- Modifier: Volume tiers add bonuses
- Special: Certain client types get different rates

---

## Database Schema for Flexible Commission

```prisma
model Organization {
  id                  String    @id @default(cuid())
  commissionMethod    CommissionMethod @default(PROGRESSIVE_TIER)
  commissionSettings  Json      // Stores method-specific config
  commissionRules     CommissionRule[]
  // ... other fields
}

enum CommissionMethod {
  PROGRESSIVE_TIER    // All sessions at achieved tier rate
  GRADUATED_TIER      // Different rates per bracket
  PACKAGE_BASED       // Rate by package type
  TARGET_BASED        // Base + bonus structure
  CUSTOM             // Uses CommissionRule table
}

model CommissionRule {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  // Rule Type
  ruleType        RuleType  // TIER, PACKAGE_TYPE, TARGET, etc.
  
  // Conditions
  minValue        Int?      // Min sessions/value for tier
  maxValue        Int?      // Max sessions/value for tier
  packageTypeId   String?   // If package-based
  
  // Rate
  percentage      Float     // Commission percentage
  isBonus         Boolean   @default(false) // Add to base or replace
  
  // Priority for complex rules
  priority        Int       @default(0)
  isActive        Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum RuleType {
  VOLUME_TIER        // Based on session count
  VALUE_TIER         // Based on dollar amount
  PACKAGE_TYPE       // Based on package type
  TARGET_BONUS       // Bonus for hitting target
  CLIENT_TYPE        // Different rates for different client types
}
```

---

## Step-by-Step Commission Calculation Flow

### Monthly Commission Calculation Process

#### Step 1: Data Collection
```typescript
async function collectTrainerSessions(trainerId: string, month: Date, orgId: string) {
  // Get all validated sessions for the month
  const sessions = await prisma.session.findMany({
    where: {
      trainerId,
      validated: true,
      sessionDate: {
        gte: startOfMonth(month),
        lte: endOfMonth(month)
      },
      // Organization context
      trainer: { organizationId: orgId }
    },
    include: {
      package: {
        include: {
          packageType: true  // For package-based commission
        }
      }
    }
  });
  
  return sessions;
}
```

#### Step 2: Apply Organization's Commission Method
```typescript
async function calculateCommission(trainerId: string, month: Date, orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { commissionRules: true }
  });
  
  const sessions = await collectTrainerSessions(trainerId, month, orgId);
  
  switch (org.commissionMethod) {
    case 'PROGRESSIVE_TIER':
      return calculateProgressiveTier(sessions, org.commissionRules);
    
    case 'GRADUATED_TIER':
      return calculateGraduatedTier(sessions, org.commissionRules);
    
    case 'PACKAGE_BASED':
      return calculatePackageBased(sessions, org.commissionRules);
    
    case 'TARGET_BASED':
      return calculateTargetBased(sessions, org.commissionRules);
    
    case 'CUSTOM':
      return calculateCustomRules(sessions, org.commissionRules);
  }
}
```

#### Step 3: Progressive Tier Calculation (Current Default)
```typescript
function calculateProgressiveTier(sessions: Session[], rules: CommissionRule[]) {
  const totalSessions = sessions.length;
  const totalValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0);
  
  // Find applicable tier based on session count
  const applicableTier = rules
    .filter(r => r.ruleType === 'VOLUME_TIER')
    .sort((a, b) => a.minValue - b.minValue)
    .find(rule => {
      const meetsMin = !rule.minValue || totalSessions >= rule.minValue;
      const meetsMax = !rule.maxValue || totalSessions <= rule.maxValue;
      return meetsMin && meetsMax;
    });
  
  if (!applicableTier) return { commission: 0, rate: 0 };
  
  // Apply tier rate to ALL sessions
  const commission = totalValue * (applicableTier.percentage / 100);
  
  return {
    sessionCount: totalSessions,
    totalValue,
    tierAchieved: applicableTier,
    rate: applicableTier.percentage,
    commission
  };
}
```

#### Step 4: Package-Based Calculation
```typescript
function calculatePackageBased(sessions: Session[], rules: CommissionRule[]) {
  let totalCommission = 0;
  const breakdown = [];
  
  // Group sessions by package type
  const sessionsByPackageType = groupBy(sessions, s => s.package?.packageTypeId);
  
  for (const [packageTypeId, packageSessions] of Object.entries(sessionsByPackageType)) {
    const rule = rules.find(r => 
      r.ruleType === 'PACKAGE_TYPE' && 
      r.packageTypeId === packageTypeId
    );
    
    if (rule) {
      const value = packageSessions.reduce((sum, s) => sum + s.sessionValue, 0);
      const commission = value * (rule.percentage / 100);
      
      totalCommission += commission;
      breakdown.push({
        packageType: packageTypeId,
        sessions: packageSessions.length,
        value,
        rate: rule.percentage,
        commission
      });
    }
  }
  
  return { totalCommission, breakdown };
}
```

#### Step 5: Generate Report
```typescript
async function generateCommissionReport(orgId: string, month: Date) {
  const trainers = await prisma.user.findMany({
    where: { 
      organizationId: orgId,
      role: 'TRAINER'
    }
  });
  
  const report = [];
  
  for (const trainer of trainers) {
    const commission = await calculateCommission(trainer.id, month, orgId);
    
    report.push({
      trainerId: trainer.id,
      trainerName: trainer.name,
      month,
      ...commission,
      status: 'PENDING_APPROVAL'
    });
  }
  
  return report;
}
```

---

## User Interface Flow

### 1. Organization Setup (Admin)
```
Settings > Commission Configuration

Commission Method: [Dropdown]
- Progressive Tier (All sessions at achieved rate)
- Graduated Tier (Different rates per bracket)  
- Package Based (Rate varies by package type)
- Target Based (Base + bonuses)
- Custom Rules

[Configure Rules Button] → Opens rule editor
```

### 2. Rule Configuration
```
For Progressive Tier:
┌─────────────────────────────┐
│ Tier 1: 0-30 sessions = 25% │
│ Tier 2: 31-60 sessions = 30%│
│ Tier 3: 61+ sessions = 35%  │
│ [Add Tier] [Save]           │
└─────────────────────────────┘

For Package Based:
┌─────────────────────────────┐
│ Basic Package: 20%          │
│ Premium Package: 25%        │
│ Elite Package: 30%          │
│ [Add Package Rate] [Save]   │
└─────────────────────────────┘
```

### 3. Trainer View
```
My Commission - December 2024

Sessions Completed: 45
Total Value: $4,500
Commission Rate: 30% (Tier 2: 31-60 sessions)
Commission Earned: $1,350

[View Details] [Export]
```

### 4. Manager/Admin View
```
Commission Report - December 2024

Trainer         | Sessions | Value  | Rate | Commission | Status
----------------|----------|--------|------|------------|--------
John Smith      | 45       | $4,500 | 30%  | $1,350     | Pending
Jane Doe        | 62       | $6,200 | 35%  | $2,170     | Pending
Mike Johnson    | 28       | $2,800 | 25%  | $700       | Pending

Total Commission: $4,220
[Approve All] [Export to Payroll] [Download Excel]
```

---

## Migration Strategy for Existing Wood Square Data

```typescript
// Default setup for Wood Square Fitness
const woodSquareDefault = {
  commissionMethod: 'PROGRESSIVE_TIER',
  commissionRules: [
    { ruleType: 'VOLUME_TIER', minValue: 0, maxValue: 30, percentage: 25 },
    { ruleType: 'VOLUME_TIER', minValue: 31, maxValue: 60, percentage: 30 },
    { ruleType: 'VOLUME_TIER', minValue: 61, maxValue: null, percentage: 35 }
  ]
};
```

---

## Benefits of This Flexible System

1. **Multi-Organization Ready**: Each org can choose their method
2. **No Code Changes**: New commission structures via configuration
3. **Auditability**: Clear calculation history
4. **Trainer Motivation**: Transparent, real-time progress
5. **HR Friendly**: Automated calculations, Excel exports
6. **Future Proof**: Can add new methods without schema changes

---

## Implementation Priority

### Phase 1 (MVP)
- Progressive Tier only (current Wood Square model)
- Basic commission report
- Manual Excel export

### Phase 2 (Multi-Org)
- Add Package-Based method
- Organization configuration UI
- Automated monthly reports

### Phase 3 (Advanced)
- All calculation methods
- Custom rule builder
- ~~Commission projections~~ (Moved to postMVP.md)
- ~~Historical comparisons~~ (Moved to postMVP.md)