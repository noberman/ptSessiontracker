# Commission Module Design Document

## Executive Summary
Complete redesign of the commission calculation system to support multiple calculation methods, trainer tiers, package-specific rules, and organization-specific configurations. The system must be flexible enough to handle sale-based, execution-based, and hybrid commission models while maintaining simplicity for organizations with basic needs.

## Core Requirements

### Business Needs
1. Support multiple commission calculation methods across different organizations
2. Enable target-based commission rate adjustments
3. Allow package-specific and trainer-tier-specific commission rules
4. Calculate commissions monthly or quarterly based on organization preference
5. Maintain clear audit trail of commission calculations
6. Handle no-shows (no commission) and substitutions (commission to executor)

### Commission Types

#### 1. Sale Commission
- Percentage of package value paid when package is sold
- Calculated at month-end for all packages sold that month
- Example: 10% of $1,000 package = $100 commission

#### 2. Execution Commission
- Percentage of session value paid when session is completed
- Calculated at month-end for all validated sessions that month
- Example: 20% of $100 session = $20 per session

#### 3. Hybrid Commission
- Combination of sale and execution commissions
- Example: 10% sale commission + 25% execution commission

## System Architecture

### Commission Calculation Methods

#### Method 1: Flat Rate
```javascript
{
  type: "FLAT",
  config: {
    saleCommission: 10,        // 10% on all sales
    executionCommission: 20    // 20% on all sessions
  }
}
```

#### Method 2: Progressive (Retroactive)
```javascript
{
  type: "PROGRESSIVE",
  config: {
    tiers: [
      { minSessions: 0, maxSessions: 40, executionRate: 20, saleRate: 10 },
      { minSessions: 41, maxSessions: 60, executionRate: 25, saleRate: 15 },
      { minSessions: 61, maxSessions: null, executionRate: 30, saleRate: 20 }
    ],
    retroactive: true  // All sessions get the achieved tier rate
  }
}
```

#### Method 3: Graduated
```javascript
{
  type: "GRADUATED",
  config: {
    tiers: [
      { minSessions: 0, maxSessions: 40, executionRate: 20, saleRate: 10 },
      { minSessions: 41, maxSessions: 60, executionRate: 25, saleRate: 15 },
      { minSessions: 61, maxSessions: null, executionRate: 30, saleRate: 20 }
    ],
    retroactive: false  // Only sessions in each tier get that tier's rate
  }
}
```

#### Method 4: Package-Based
```javascript
{
  type: "PACKAGE_BASED",
  config: {
    defaultRates: { saleCommission: 10, executionCommission: 20 },
    packageOverrides: [
      { 
        packageTypeId: "pt2-packages",
        saleCommission: 15,
        executionCommission: 25
      }
    ]
  }
}
```

#### Method 5: Target-Based (Quarterly)
```javascript
{
  type: "TARGET_BASED",
  config: {
    period: "QUARTERLY",
    targets: [
      { minRevenue: 0, maxRevenue: 50000, saleRate: 10 },
      { minRevenue: 50001, maxRevenue: 100000, saleRate: 15 },
      { minRevenue: 100001, maxRevenue: null, saleRate: 20 }
    ],
    executionCommission: 0  // Sales only
  }
}
```

#### Method 6: Custom Hybrid
```javascript
{
  type: "CUSTOM",
  config: {
    rules: [
      {
        condition: "trainerTier",
        value: "PT2",
        saleCommission: 12,
        executionCommission: 22
      },
      {
        condition: "packageType",
        value: "PREMIUM",
        saleCommissionBonus: 5,  // Adds to base
        executionCommissionBonus: 3
      }
    ]
  }
}
```

## Data Model

### Database Schema Extensions

```prisma
model Organization {
  // existing fields...
  commissionMethod     String @default("PROGRESSIVE")
  commissionConfig     Json   // Stores method-specific configuration
  commissionPeriod     CommissionPeriod @default(MONTHLY)
}

model CommissionRule {
  id               String @id @default(cuid())
  organizationId   String
  name             String
  type             CommissionType
  config           Json
  isActive         Boolean @default(true)
  priority         Int     // For rule precedence
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  organization     Organization @relation(...)
}

model TrainerTier {
  id               String @id @default(cuid())
  organizationId   String
  name             String  // "PT1", "PT2", "Junior", "Senior"
  level            Int     // 1, 2, 3 for ordering
  monthlyTarget    Int?    // Target sessions
  quarterlyTarget  Float?  // Target revenue
  createdAt        DateTime @default(now())
  
  organization     Organization @relation(...)
  users            User[]
}

model CommissionCalculation {
  id               String @id @default(cuid())
  userId           String
  organizationId   String
  periodStart      DateTime
  periodEnd        DateTime
  
  // Metrics
  totalSales       Float
  totalSessions    Int
  sessionValue     Float
  
  // Commission amounts
  saleCommission   Float
  executionCommission Float
  totalCommission  Float
  
  // Applied rates
  appliedSaleRate  Float
  appliedExecRate  Float
  appliedTier      String?
  
  // Metadata
  calculationMethod String
  calculationConfig Json
  
  status           CalculationStatus @default(PENDING)
  approvedBy       String?
  approvedAt       DateTime?
  paidAt           DateTime?
  
  createdAt        DateTime @default(now())
  
  user             User @relation(...)
  organization     Organization @relation(...)
}

model User {
  // existing fields...
  trainerTierId    String?
  trainerTier      TrainerTier? @relation(...)
}

enum CommissionPeriod {
  MONTHLY
  QUARTERLY
}

enum CommissionType {
  FLAT
  PROGRESSIVE
  GRADUATED
  PACKAGE_BASED
  TARGET_BASED
  CUSTOM
}

enum CalculationStatus {
  PENDING
  APPROVED
  PAID
  DISPUTED
}
```

## User Experience

### Organization Admin Configuration Flow

1. **Initial Setup Wizard**
   ```
   Step 1: Choose calculation period
   [ ] Monthly
   [ ] Quarterly
   
   Step 2: Choose commission type
   [ ] Flat rate (Simple)
   [ ] Progressive tiers (Volume-based)
   [ ] Package-based (Different packages, different rates)
   [ ] Custom (Advanced)
   
   Step 3: Configure rates
   [Based on selected type]
   
   Step 4: Set trainer tiers (optional)
   PT1: [____] sessions/month target
   PT2: [____] sessions/month target
   ```

2. **Progressive Tier Configuration**
   ```
   Tier 1: 0-40 sessions
   - Sale: [10]% 
   - Execution: [20]%
   
   Tier 2: 41-60 sessions
   - Sale: [15]%
   - Execution: [25]%
   
   [+ Add Tier]
   
   [ ] Apply retroactively (all sessions get achieved tier rate)
   ```

3. **Package-Based Configuration**
   ```
   Default rates:
   - Sale: [10]%
   - Execution: [20]%
   
   Package-specific overrides:
   Premium Packages: Sale [15]% Execution [25]%
   Intro Packages: Sale [5]% Execution [15]%
   [+ Add Package Rule]
   ```

### Trainer Dashboard View

```
Commission Dashboard - March 2024

Current Performance:
Sessions Completed: 45/50 (Tier 2)
Packages Sold: $12,000
Current Commission Rate: 25% execution, 15% sale

Earnings This Month:
Sale Commission: $1,800 (15% of $12,000)
Execution Commission: $2,250 (25% of 45 sessions × $100)
Total: $4,050

Progress to Next Tier:
████████░░ 5 sessions to Tier 3 (30% rate)
```

### PT Manager View

```
Team Commission Overview - March 2024

Trainer Performance:
Name         | Tier | Sessions | Sales    | Commission | Status
John (PT2)   | 2    | 45/50   | $12,000  | $4,050    | On Track
Sarah (PT1)  | 1    | 38/40   | $8,000   | $2,560    | Near Tier
Mike (PT2)   | 3    | 62/60   | $15,000  | $5,760    | Exceeded

Total Team Commission: $12,370
Pending Approval: 3 calculations
```

### Admin Commission Approval

```
Commission Approval - March 2024

Review Period: March 1-31, 2024
Total Payable: $45,230

By Trainer:
[ ] John Doe - $4,050 [View Details]
[ ] Sarah Smith - $2,560 [View Details]
[...more trainers]

[Approve All] [Export to Excel] [Send to Payroll]
```

## Calculation Engine

### Core Algorithm

```typescript
interface CommissionCalculator {
  calculateCommission(
    trainer: User,
    period: { start: Date, end: Date },
    method: CommissionMethod,
    config: CommissionConfig
  ): CommissionResult
}

class CommissionEngine implements CommissionCalculator {
  calculateCommission(trainer, period, method, config) {
    const metrics = this.gatherMetrics(trainer, period);
    
    switch(method) {
      case 'FLAT':
        return this.calculateFlat(metrics, config);
      case 'PROGRESSIVE':
        return this.calculateProgressive(metrics, config);
      case 'GRADUATED':
        return this.calculateGraduated(metrics, config);
      case 'PACKAGE_BASED':
        return this.calculatePackageBased(metrics, config);
      case 'TARGET_BASED':
        return this.calculateTargetBased(metrics, config);
      case 'CUSTOM':
        return this.calculateCustom(metrics, config);
    }
  }
  
  private calculateProgressive(metrics, config) {
    // Find achieved tier based on sessions/revenue
    const achievedTier = config.tiers.find(tier => 
      metrics.totalSessions >= tier.minSessions && 
      (!tier.maxSessions || metrics.totalSessions <= tier.maxSessions)
    );
    
    if (config.retroactive) {
      // Apply tier rate to all sessions
      return {
        saleCommission: metrics.totalSales * achievedTier.saleRate / 100,
        executionCommission: metrics.totalSessions * metrics.avgSessionValue * achievedTier.executionRate / 100
      };
    } else {
      // Apply each tier rate to sessions in that tier
      return this.calculateGraduatedCommission(metrics, config.tiers);
    }
  }
}
```

## Edge Cases & Considerations

### 1. Mid-Period Changes
- **Issue**: Commission structure changes mid-month
- **Solution**: Pro-rate or grandfather existing calculations
- **Implementation**: Store config version with each calculation

### 2. Trainer Tier Changes
- **Issue**: Trainer promoted from PT1 to PT2 mid-period
- **Solution**: Apply new tier from promotion date forward
- **Implementation**: Track tier changes with effective dates

### 3. Package Refunds
- **Issue**: Commission paid on refunded package
- **Solution**: Create negative adjustment in next period
- **Implementation**: Commission adjustment records

### 4. Substitute Trainers
- **Issue**: Who gets execution commission for substituted session
- **Solution**: Commission goes to executing trainer
- **Implementation**: Track actual trainer on each session

### 5. Group Sessions
- **Issue**: Multiple trainers, one session
- **Solution**: Split commission or assign to lead trainer
- **Implementation**: Support multi-trainer sessions

### 6. Cross-Location Sessions
- **Issue**: Trainer works at multiple locations
- **Solution**: Commission rules follow trainer's primary location
- **Implementation**: Location-specific commission overrides

### 7. Partial Months
- **Issue**: Trainer starts mid-month
- **Solution**: Pro-rate targets or use absolute counts
- **Implementation**: Configurable target adjustment

### 8. Commission Disputes
- **Issue**: Trainer disputes calculation
- **Solution**: Audit log and recalculation capability
- **Implementation**: Full calculation history with inputs

## Implementation Phases

### Phase 1: Core Engine (MVP)
- [ ] Database schema for commission configuration
- [ ] Flat rate calculation
- [ ] Progressive tier calculation (retroactive)
- [ ] Monthly commission dashboard
- [ ] Basic approval workflow

### Phase 2: Advanced Methods
- [ ] Graduated tiers
- [ ] Package-based rules
- [ ] Trainer tier system
- [ ] Quarterly calculations
- [ ] Excel export

### Phase 3: Optimization
- [ ] Target-based calculations
- [ ] Custom rule builder
- [ ] Commission forecasting
- [ ] Historical comparisons
- [ ] Automated payroll integration

### Phase 4: Enterprise
- [ ] Multi-location rules
- [ ] Commission splits
- [ ] Advanced dispute resolution
- [ ] Commission advance requests
- [ ] Performance incentives

## Success Metrics

1. **Accuracy**: 100% calculation accuracy
2. **Flexibility**: Support 90% of gym commission models
3. **Efficiency**: Calculate 100 trainers in <5 seconds
4. **Transparency**: Trainers can see calculation details
5. **Adoption**: 80% of organizations configure custom rules

## Technical Considerations

1. **Performance**: Cache calculations, use database views for aggregates
2. **Accuracy**: Decimal precision for financial calculations
3. **Auditability**: Immutable calculation records
4. **Scalability**: Queue system for bulk calculations
5. **Testing**: Comprehensive test suite for all methods

## Security & Compliance

1. **Access Control**: Role-based access to commission data
2. **Data Privacy**: Encrypt sensitive commission information
3. **Audit Trail**: Log all configuration changes
4. **Compliance**: Support local labor law requirements
5. **Data Retention**: Keep records per legal requirements