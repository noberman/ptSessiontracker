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

### Commission Configuration Structure

Organizations configure commissions in two steps:
1. **Set organization-wide calculation period** (Monthly or Quarterly)
2. **Create commission profiles** and assign them to trainers

```javascript
// Example: Organization with commission profiles
{
  // Organization-wide setting
  calculationPeriod: "MONTHLY",  // Applies to all trainers
  
  // Commission profiles (reusable configurations)
  commissionProfiles: [
    {
      id: "level1",
      title: "Level 1 Commission",
      calculationMethod: "FLAT",
      methodConfig: {
        executionRate: 20,
        saleRate: 10
      }
    },
    {
      id: "level2", 
      title: "Level 2 Commission",
      calculationMethod: "PROGRESSIVE",
      methodConfig: {
        tiers: [
          { minSessions: 0, maxSessions: 40, executionRate: 25, saleRate: 15 },
          { minSessions: 41, maxSessions: 60, executionRate: 30, saleRate: 20 },
          { minSessions: 61, maxSessions: null, executionRate: 35, saleRate: 25 }
        ]
      }
    },
    {
      id: "advanced",
      title: "Advanced Commission",
      calculationMethod: "FORMULA",
      methodConfig: {
        formula: "(sessions_value * 0.35) + (sales_value * 0.20)"
      }
    }
  ],
  
  // Trainer assignments (which profile each trainer uses)
  trainerAssignments: [
    { trainerId: "user1", trainerName: "John Smith", profileId: "level1" },
    { trainerId: "user2", trainerName: "Sarah Johnson", profileId: "level2" },
    { trainerId: "user3", trainerName: "Mike Williams", profileId: "advanced" },
    { trainerId: "user4", trainerName: "Emily Davis", profileId: "level1" }  // Multiple trainers can use same profile
  ]
}
```

### Target Bonuses (Optional)

Organizations can add fixed-amount target bonuses on top of percentage-based commissions. These provide additional incentives for reaching specific performance thresholds.

#### How Target Bonuses Work:
- **Condition-based**: Triggered when specific metrics hit defined thresholds
- **Fixed amounts**: Unlike commission rates, these are flat dollar amounts
- **Stackable**: Can be combined with any commission calculation method
- **Common uses**:
  - Sales milestones ($500 bonus at $10K sales, $1000 at $20K)
  - Session volume targets (bonus for 50+ sessions)
  - Validation rate incentives (bonus for 95%+ validation rate)

#### Example Target Bonus Structure:
```javascript
// Sales target bonuses
TARGET_BONUS(sales_value, [
  [10000, 500],   // $500 bonus at $10K sales
  [20000, 1000],  // $1000 bonus at $20K sales
  [30000, 1500]   // $1500 bonus at $30K sales
])

// Session volume bonuses
TARGET_BONUS(validated_count, [
  [50, 300],      // $300 bonus at 50 validated sessions
  [75, 600],      // $600 bonus at 75 sessions
  [100, 1000]     // $1000 bonus at 100 sessions
])
```

### Commission Calculation Methods

#### Method 1: Flat Rate
Simple fixed percentage for all commissions.

```javascript
{
  calculationMethod: "FLAT",
  methodConfig: {
    saleCommission: 10,        // 10% on all sales
    executionCommission: 20    // 20% on all sessions
  }
}
```

#### Method 2: Progressive Tiers
Commission rate increases based on volume achieved. All units get the highest achieved rate.

```javascript
{
  calculationMethod: "PROGRESSIVE",
  methodConfig: {
    tiers: [
      { minSessions: 0, maxSessions: 40, executionRate: 20, saleRate: 10 },
      { minSessions: 41, maxSessions: 60, executionRate: 25, saleRate: 15 },
      { minSessions: 61, maxSessions: null, executionRate: 30, saleRate: 20 }
    ]
  }
}
```

#### Method 3: Formula-Based (Most Flexible)
Organizations create custom formulas for unlimited flexibility.

```javascript
{
  calculationMethod: "FORMULA",
  methodConfig: {
    formula: "(sessions_value * IF(sessions_count > 50, 0.25, 0.20)) + (sales_value * 0.10)",
    variables: ["sessions_value", "sessions_count", "sales_value"],
    description: "25% execution for 50+ sessions, otherwise 20%, plus 10% of sales"
  }
}
```

### Commission Profile Examples

#### Example 1: Simple Two-Level System
```javascript
{
  calculationPeriod: "MONTHLY",
  
  commissionProfiles: [
    {
      id: "standard",
      title: "Standard Commission",
      calculationMethod: "FLAT",
      methodConfig: {
        executionRate: 25,
        saleRate: 12
      }
    },
    {
      id: "advanced",
      title: "Advanced Commission",
      calculationMethod: "PROGRESSIVE",
      methodConfig: {
        tiers: [
          { minSessions: 0, maxSessions: 40, executionRate: 28, saleRate: 15 },
          { minSessions: 41, maxSessions: null, executionRate: 32, saleRate: 18 }
        ]
      }
    }
  ]
}
```

#### Example 2: Multi-Tier System
```javascript
{
  calculationPeriod: "QUARTERLY",
  
  commissionProfiles: [
    {
      id: "tier1",
      title: "Tier 1 Commission",
      calculationMethod: "FLAT",
      methodConfig: { executionRate: 20, saleRate: 10 }
    },
    {
      id: "tier2",
      title: "Tier 2 Commission",
      calculationMethod: "FLAT",
      methodConfig: { executionRate: 25, saleRate: 15 }
    },
    {
      id: "tier3",
      title: "Tier 3 Commission",
      calculationMethod: "PROGRESSIVE",
      methodConfig: {
        tiers: [
          { minSessions: 0, maxSessions: 50, executionRate: 30, saleRate: 18 },
          { minSessions: 51, maxSessions: null, executionRate: 35, saleRate: 22 }
        ]
      }
    }
  ]
}
```

## Formula-Based Commission System (Advanced)

### Concept Overview
Instead of predefined calculation methods, organizations can create custom mathematical formulas using a rich set of variables and functions. This provides unlimited flexibility while maintaining a user-friendly interface through a visual formula builder.

### Available Variables

```javascript
// Core Metrics
sessions_count          // Number of ALL sessions this period (including unvalidated)
sessions_value          // Total monetary value of ALL sessions
validated_count         // Number of VALIDATED sessions only (excludes no-shows)
validated_value         // Total monetary value of VALIDATED sessions only
avg_session_value       // Average value per session
sales_count            // Number of packages sold
sales_value            // Total monetary value of packages sold
avg_package_value      // Average package value
```

### Formula Functions Library

```javascript
// Conditional Functions
IF(condition, true_value, false_value)
IFS(condition1, value1, condition2, value2, ..., default_value)
SWITCH(expression, case1, value1, case2, value2, ..., default)

// Tier/Breakpoint Functions
TIER(value, [[min1, max1, rate1], [min2, max2, rate2], ...])
PROGRESSIVE(base_value, count_value, tier_config)  // All units get highest tier rate

// Mathematical Functions
MIN(value1, value2, ...)
MAX(value1, value2, ...)
ROUND(value, decimals)
FLOOR(value)
CEILING(value)
ABS(value)
POWER(base, exponent)

// Statistical Functions
AVERAGE(value1, value2, ...)
MEDIAN(value1, value2, ...)
STDEV(value1, value2, ...)

// Lookup Functions
RATE_FOR_TIER(tier_number)     // Returns configured rate for trainer tier
TARGET_FOR_TIER(tier_number)   // Returns target sessions for trainer tier

```

### Formula Examples

#### Example 1: Simple Progressive
```excel
= sessions_value * TIER(sessions_count, [[0,30,0.15], [31,50,0.20], [51,null,0.25]])
```

#### Example 2: Multi-Factor Calculation
```excel
= PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.20], [41,60,0.25], [61,null,0.30]]) +
  (sales_value * 0.12)
```

#### Example 3: Using Validated Sessions Only
```excel
= PROGRESSIVE(validated_value, validated_count, [[0,30,0.15], [31,50,0.20], [51,null,0.25]]) +
  (sales_value * 0.10)
```

### Visual Formula Builder Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ Commission Formula Builder - Profile: Advanced Commission          │
├────────────────────────┬────────────────────────────────────────────┤
│ AVAILABLE VARIABLES    │ FORMULA EDITOR                             │
│                        │                                            │
│ All Sessions           │ ┌──────────────────────────────────────┐  │
│ ├─ sessions_count      │ │ // Progressive tier calculation      │  │
│ └─ sessions_value      │ │ base_rate = PROGRESSIVE(             │  │
│                        │ │   validated_value,                   │  │
│ Validated Sessions     │ │   validated_count,                   │  │
│ ├─ validated_count     │ │   [[0, 30, 0.20],                   │  │
│ └─ validated_value     │ │    [31, 50, 0.25],                  │  │
│                        │ │    [51, null, 0.30]]                │  │
│ Package Sales          │ │ );                                   │  │
│ ├─ sales_count         │ │                                      │  │
│ ├─ sales_value         │ │ // Add sales commission             │  │
│ └─ avg_package_value   │ │ sales_commission = sales_value * 0.15;│  │
│                        │ │                                      │  │
│ Averages               │ │                                      │  │
│ └─ avg_session_value   │ │ // Total commission                  │  │
│ ────────────────────   │ │ base_rate + sales_commission        │  │
│ HELPER FUNCTIONS       │ │                                      │  │
│                        │ │                                      │  │
│ ► Mathematical         │ │                                      │  │
│   MIN() MAX() ROUND()  │ │                                      │  │
│                        │ └──────────────────────────────────────┘  │
│ ► Conditional Logic    │                                            │
│   IF() IFS() SWITCH()  │ [Validate Formula] [Format Code]          │
│                        │                                            │
│ ► Tier Calculations    ├────────────────────────────────────────────┤
│   TIER()               │ TEST YOUR FORMULA                          │
│   PROGRESSIVE()        │                                            │
│                        │                                            │
│ ► Target Bonuses       │ Test Values:                               │
│   TARGET_BONUS()       │ sessions_count: [50    ]                  │
│   TIERED_BONUS()       │                                            │
│                        │                                            │
│ [Show All Functions]   │
│                        │ validated_count: [48    ]                 │
│                        │ validated_value: [$4800 ]                 │
│                        │ sales_count: [10    ]                     │
│                        │ sales_value: [$15000]                     │
│                        │                                            │
│                        │ [Run Test]                                 │
│                        │                                            │
│                        │ Result: $3,470.00                         │
│                        │ ├─ Base (Progressive): $1,200.00          │
│                        │ ├─ Sales (15%): $1,770.00                 │
│                        │ └─ Target Bonus: $500.00                   │
│                        │                                            │
│                        │ [Save Formula] [Cancel]                   │
└────────────────────────┴────────────────────────────────────────────┘
```

### Formula Validation System

```typescript
class FormulaValidator {
  validateFormula(formula: string, organization: Organization): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Syntax Validation
    try {
      const ast = this.parseFormula(formula);
    } catch (e) {
      errors.push(`Syntax error: ${e.message}`);
      return { valid: false, errors, warnings };
    }
    
    // 2. Variable Validation
    const usedVars = this.extractVariables(formula);
    for (const varName of usedVars) {
      if (!this.isValidVariable(varName)) {
        errors.push(`Unknown variable: ${varName}`);
      }
    }
    
    // 3. Business Logic Validation
    const testScenarios = [
      { name: "No activity", data: { sessions_count: 0, sessions_value: 0 }},
      { name: "Minimum activity", data: { sessions_count: 1, sessions_value: 100 }},
      { name: "Average month", data: { sessions_count: 40, sessions_value: 4000 }},
      { name: "High performer", data: { sessions_count: 80, sessions_value: 8000 }},
      { name: "Maximum values", data: { sessions_count: 200, sessions_value: 20000 }}
    ];
    
    for (const scenario of testScenarios) {
      const result = this.evaluateFormula(formula, scenario.data);
      
      // Check for reasonable bounds
      if (result < 0) {
        errors.push(`Negative commission in scenario: ${scenario.name}`);
      }
      
      if (result > scenario.data.sessions_value * 0.5) {
        warnings.push(`Commission >50% of session value in: ${scenario.name}`);
      }
      
      if (result > 50000) {
        warnings.push(`Unusually high commission (${result}) in: ${scenario.name}`);
      }
    }
    
    // 4. Performance Validation
    const executionTime = this.measureExecutionTime(formula, testScenarios[2].data);
    if (executionTime > 100) {
      warnings.push(`Formula may be slow to calculate (${executionTime}ms)`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      testResults: testScenarios.map(s => ({
        scenario: s.name,
        result: this.evaluateFormula(formula, s.data)
      }))
    };
  }
}
```

### Formula Storage and Versioning

```prisma
model CommissionFormula {
  id                String @id @default(cuid())
  organizationId    String
  name              String
  description       String?
  
  // Formula Definition
  formula           String   @db.Text      // The formula expression
  compiledFormula   Json?                  // Pre-compiled AST for performance
  usedVariables     String[]               // Variables referenced in formula
  usedFunctions     String[]               // Functions used in formula
  
  // Configuration
  isActive          Boolean @default(true)
  isPrimary         Boolean @default(false) // Primary formula for organization
  effectiveFrom     DateTime @default(now())
  effectiveTo       DateTime?
  
  // Validation & Testing
  isValid           Boolean @default(false)
  validationErrors  Json?
  validationWarnings Json?
  lastValidatedAt   DateTime?
  testScenarios     Json?    // Saved test scenarios with expected results
  
  // Versioning
  version           Int @default(1)
  previousVersionId String?  // Link to previous version
  changeNotes       String?
  
  // Audit
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  organization      Organization @relation(...)
  createdBy         User @relation("FormulaCreator", ...)
  calculations      CommissionCalculation[] // Track which calculations used this formula
  previousVersion   CommissionFormula? @relation("FormulaVersionHistory", ...)
  
  @@index([organizationId, isActive])
  @@index([organizationId, isPrimary])
}
```

### Formula Execution Engine

```typescript
class FormulaExecutionEngine {
  private readonly functionLibrary: Map<string, Function>;
  private readonly cache: Map<string, CompiledFormula>;
  
  constructor() {
    this.functionLibrary = this.initializeFunctions();
    this.cache = new Map();
  }
  
  async calculateCommission(
    formula: CommissionFormula,
    context: CommissionContext
  ): Promise<CommissionResult> {
    // 1. Get compiled formula (from cache if available)
    const compiled = this.getCompiledFormula(formula);
    
    // 2. Prepare variable context
    const variables = await this.prepareVariables(context);
    
    // 3. Execute formula with timeout protection
    const result = await this.executeWithTimeout(compiled, variables, 1000);
    
    // 4. Apply business rules
    const finalResult = this.applyBusinessRules(result, context);
    
    // 5. Create audit record
    await this.createAuditRecord({
      formulaId: formula.id,
      context,
      variables,
      rawResult: result,
      finalResult,
      executionTimeMs: performance.now() - startTime
    });
    
    return {
      amount: finalResult,
      formulaUsed: formula.id,
      calculationDate: new Date(),
      breakdown: this.generateBreakdown(compiled, variables)
    };
  }
  
  private generateBreakdown(formula: CompiledFormula, variables: Variables): Breakdown {
    // Step through formula showing intermediate results
    // Useful for transparency and debugging
    return {
      steps: [
        { expression: "sessions_count", value: 45 },
        { expression: "TIER(45, [[0,30,0.15],[31,50,0.20]])", value: 0.20 },
        { expression: "sessions_value * 0.20", value: 900 },
        { expression: "sales_value * 0.10", value: 1200 },
        { expression: "Final", value: 2100 }
      ]
    };
  }
}

### Formula Templates Library

Organizations can start with pre-built templates and customize them:

```javascript
const FORMULA_TEMPLATES = {
  simple_percentage: {
    name: "Simple Percentage",
    description: "Fixed percentage of session and sales value",
    formula: "(sessions_value * 0.20) + (sales_value * 0.10)",
    variables: ["sessions_value", "sales_value"]
  },
  
  progressive_tiers: {
    name: "Progressive Tiers",
    description: "Commission rate increases with volume",
    formula: "sessions_value * TIER(sessions_count, [[0,30,0.15],[31,50,0.20],[51,null,0.25]])",
    variables: ["sessions_value", "sessions_count"]
  },
  
  tiered_with_bonuses: {
    name: "Tiered with Target Bonuses",
    description: "Progressive tiers plus target-based bonuses",
    formula: `
      PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.18],[41,60,0.22],[61,null,0.26]]) +
      TARGET_BONUS(sessions_count, [[50, 300], [75, 600], [100, 1000]])
    `,
    variables: ["sessions_value", "sessions_count"]
  },
  
  hybrid_advanced: {
    name: "Advanced Hybrid",
    description: "Complex calculation combining execution and sales",
    formula: `
      PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.18],[41,60,0.22],[61,null,0.26]]) +
      (sales_value * 0.12)
    `,
    variables: ["sessions_value", "sessions_count", "sales_value"]
  }
};
```

### Implementation Considerations

#### 1. Formula Parser Selection
- **Option A**: Use existing library like math.js or expr-eval
- **Option B**: Build custom parser with better control  
- **Option C**: Use sandboxed JavaScript evaluation with safety checks

```javascript
// Example using math.js with custom functions
import { create, all } from 'mathjs';

const math = create(all);

// Add custom functions
math.import({
  TIER: function(value, tiers) {
    for (const tier of tiers) {
      if (value >= tier[0] && (tier[1] === null || value <= tier[1])) {
        return tier[2];
      }
    }
    return 0;
  },
  
  PROGRESSIVE: function(baseValue, count, tiers) {
    const rate = math.TIER(count, tiers);
    return baseValue * rate;
  },
  
  TARGET_BONUS: function(metric, targets) {
    // Returns the highest bonus for which the metric qualifies
    let bonus = 0;
    for (const [threshold, amount] of targets) {
      if (metric >= threshold) {
        bonus = amount; // Keep updating to get highest qualified bonus
      }
    }
    return bonus;
  },
  
  TIERED_BONUS: function(metric, targets) {
    // Alternative: adds all qualifying bonuses together
    let totalBonus = 0;
    for (const [threshold, amount] of targets) {
      if (metric >= threshold) {
        totalBonus += amount;
      }
    }
    return totalBonus;
  },
  
  IF: function(condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
  }
});

// Safe evaluation
function evaluateFormula(formula, variables) {
  const scope = { ...variables };
  return math.evaluate(formula, scope);
}
```

#### 2. Security Considerations

```typescript
class SecureFormulaEvaluator {
  private readonly blacklistedKeywords = [
    'eval', 'Function', 'require', 'import', 'process', 
    'global', 'window', '__proto__', 'constructor'
  ];
  
  private readonly maxExecutionTime = 1000; // ms
  private readonly maxIterations = 10000;
  
  validateSecurity(formula: string): boolean {
    // Check for blacklisted keywords
    for (const keyword of this.blacklistedKeywords) {
      if (formula.includes(keyword)) {
        throw new Error(`Security violation: formula contains blacklisted keyword "${keyword}"`);
      }
    }
    
    // Check formula length
    if (formula.length > 5000) {
      throw new Error('Formula too long (max 5000 characters)');
    }
    
    // Check nesting depth
    const nestingDepth = this.calculateNestingDepth(formula);
    if (nestingDepth > 10) {
      throw new Error('Formula nesting too deep (max 10 levels)');
    }
    
    return true;
  }
  
  executeWithSandbox(formula: string, variables: object): number {
    // Use VM2 or similar for sandboxed execution
    const vm = new VM({
      timeout: this.maxExecutionTime,
      sandbox: {
        ...variables,
        ...this.safeFunctions
      }
    });
    
    return vm.run(`(function() { return ${formula}; })()`);
  }
}
```

#### 3. Formula Testing Interface

```typescript
interface FormulaTestSuite {
  name: string;
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  description: string;
  inputs: Record<string, number>;
  expectedResult: number;
  tolerance: number; // For floating point comparison
}

// Example test suite
const commissionTestSuite: FormulaTestSuite = {
  name: "Standard Commission Tests",
  scenarios: [
    {
      name: "New Trainer - Low Volume",
      description: "First month, minimal sessions",
      inputs: {
        sessions_count: 10,
        sessions_value: 1000,
        sales_value: 2000
      },
      expectedResult: 350,
      tolerance: 0.01
    },
    {
      name: "Senior Trainer - High Volume",
      description: "Experienced trainer at peak performance",
      inputs: {
        sessions_count: 75,
        sessions_value: 7500,
        sales_value: 15000
      },
      expectedResult: 3750,
      tolerance: 0.01
    }
  ]
};
```

## Data Model

### Database Schema Extensions

```prisma
model Organization {
  // existing fields...
  commissionPeriod     CommissionPeriod @default(MONTHLY)
  defaultProfileId     String?  // Default profile for new trainers
  
  commissionProfiles   CommissionProfile[]
}

model CommissionProfile {
  id               String @id @default(cuid())
  organizationId   String
  title            String  // "Level 1 Commission", "Standard Commission", etc.
  calculationMethod CommissionType  // FLAT, PROGRESSIVE, FORMULA
  methodConfig     Json   // Method-specific configuration
  isActive         Boolean @default(true)
  isDefault        Boolean @default(false)  // Mark as org default
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  organization     Organization @relation(...)
  users            User[]  // Trainers using this profile
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
  profileId         String  // Which profile was used
  profileTitle      String  // Title at time of calculation
  calculationMethod String
  calculationConfig Json   // The actual config used
  
  status           CalculationStatus @default(CALCULATED)
  paidAt           DateTime?
  
  createdAt        DateTime @default(now())
  
  user             User @relation(...)
  organization     Organization @relation(...)
}

model User {
  // existing fields...
  
  // Commission profile assignment
  commissionProfileId String?
  commissionProfile   CommissionProfile? @relation(...)
  
  // Track profile changes
  profileAssignedAt   DateTime?
  profileAssignedBy   String?
}

enum CommissionPeriod {
  MONTHLY
  QUARTERLY
}

enum CommissionType {
  FLAT
  PROGRESSIVE
  FORMULA
}

enum CalculationStatus {
  CALCULATED
  PAID
  DISPUTED
}
```

## User Experience

### Organization Admin Configuration Flow

1. **Initial Setup Wizard**
   ```
   Step 1: Set Calculation Period (Organization-wide)
   ( ) Monthly  
   (•) Quarterly
   
   [Next]
   ```

2. **Create Commission Profiles**
   ```
   Step 2: Create Your First Commission Profile
   
   Profile Title: [Standard Commission]
   
   Calculation Method:
   (•) Flat Rate
   ( ) Progressive Tiers
   ( ) Custom Formula
   
   Flat Rate Configuration:
   Execution Rate: [20]%
   Sales Rate: [10]%
   
   [Save & Continue] [Add Another Profile]
   
   ---
   
   Commission Profiles Created:
   ✓ Standard Commission (Flat 20%/10%)
   
   [Add Another Profile] [Continue to Trainer Assignment]
   ```

3. **Assign Profiles to Trainers**
   ```
   Step 3: Assign Commission Profiles to Your Trainers
   
   ┌────────────────┬────────────────────────┐
   │ Trainer Name   │ Commission Profile     │
   ├────────────────┼────────────────────────┤
   │ John Smith     │ [Level 1 Commission ▼] │
   │ Sarah Johnson  │ [Level 2 Commission ▼] │
   │ Mike Williams  │ [Level 1 Commission ▼] │
   │ Emily Davis    │ [Level 1 Commission ▼] │
   └────────────────┴────────────────────────┘
   
   [Bulk Assign] [Complete Setup]
   ```

### Ongoing Management Interface

1. **Commission Profile Management**
   ```
   Commission Profiles
   
   Organization Period: Monthly
   
   ┌───────────────────┬────────────┬────────────┬─────────┐
   │ Profile Title     │ Method     │ # Trainers │ Actions │
   ├───────────────────┼────────────┼────────────┼─────────┤
   │ Level 1 Commission│ Flat (20%) │ 8          │ [Edit]  │
   │ Level 2 Commission│ Progressive│ 5          │ [Edit]  │
   │ Advanced Formula  │ Formula    │ 2          │ [Edit]  │
   └───────────────────┴────────────┴────────────┴─────────┘
   
   [+ Create New Profile] [Set Default]
   ```

2. **Trainer Assignment View**
   ```
   Trainer Commission Assignments
   
   Filter: [All Trainers ▼] Search: [________]
   
   ┌───────────────┬───────────────────┬───────────────┐
   │ Trainer       │ Current Profile   │ Actions       │
   ├───────────────┼───────────────────┼───────────────┤
   │ John Smith    │ Level 1 Commission│ [Change ▼]   │
   │ Sarah Johnson │ Level 2 Commission│ [Change ▼]   │
   │ Mike Williams │ Level 1 Commission│ [Change ▼]   │
   └───────────────┴───────────────────┴───────────────┘
   
   [Bulk Reassign] [Export]
   ```


### Settings Page - Commission Section

```
Settings > Commission

Organization Commission Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Calculation Period: [Monthly ▼]  [Change]

┌─ Commission Profiles ─────────────────────────────────────┐
│                                                           │
│ ┌────────────────────┬────────────┬──────────┬──────────┐ │
│ │ Profile Title      │ Method     │ Trainers │ Actions  │ │
│ ├────────────────────┼────────────┼──────────┼──────────┤ │
│ │ Level 1 Commission │ Flat (20%) │ 8        │ [Edit]   │ │
│ │ Level 2 Commission │ Progressive│ 5        │ [Edit]   │ │
│ │ Advanced Formula   │ Formula    │ 2        │ [Edit]   │ │
│ └────────────────────┴────────────┴──────────┴──────────┘ │
│                                                           │
│ [+ Create New Profile] [Set Default]                     │
└───────────────────────────────────────────────────────────┘

Quick Actions:
[Export Configuration] [Import Configuration] [View Reports]
```

### Onboarding Wizard Updates

```
Onboarding Step 4: Commission Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Set up commission structure for your trainers

1. Calculation Period:
   (•) Monthly
   ( ) Quarterly

2. Create commission profile:
   
   Profile Title: [Standard Commission]
   
   Calculation Method:
   (•) Flat Rate - Simple percentage
   ( ) Progressive - Rate increases with volume
   ( ) Formula - Custom calculation
   
   Flat Rate Configuration:
   Execution Commission: [25]%
   Sales Commission: [10]%
   
   [Save Profile]
   
   Current Profiles:
   • Standard Commission (Flat 25%/10%) - Applied to all trainers
   
   [+ Add Another Profile] [Continue] [Skip for Now]
   
   Note: Trainers will use the first profile by default.
   You can create more profiles and reassign trainers later.
```

### User Profile - Commission Assignment

```
Edit User: Sarah Johnson
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basic Information
├─ Name: Sarah Johnson
├─ Email: sarah.j@gym.com
└─ Role: Trainer

Commission Settings
├─ Commission Profile: [Level 2 Commission ▼]
│   Available Profiles:
│   • Level 1 Commission (Flat 20%)
│   • Level 2 Commission (Progressive) ✓
│   • Advanced Formula (Formula)
│   • Use Organization Default
│
└─ Profile assigned: Jan 15, 2024 by Admin

[Save Changes] [Cancel]
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
  async calculateCommission(trainer, period, organization) {
    // Get trainer's commission profile
    const profile = await this.getTrainerProfile(trainer.commissionProfileId);
    
    if (!profile) {
      // Use organization default profile if trainer has none assigned
      const defaultProfile = await this.getDefaultProfile(organization.id);
      if (!defaultProfile) {
        throw new Error(`No commission profile assigned to trainer ${trainer.name}`);
      }
      profile = defaultProfile;
    }
    
    // Gather metrics for the period
    const metrics = await this.gatherMetrics(trainer, period);
    
    // Calculate based on profile's method
    switch(profile.calculationMethod) {
      case 'FLAT':
        return this.calculateFlat(metrics, profile.methodConfig);
      case 'PROGRESSIVE':
        return this.calculateProgressive(metrics, profile.methodConfig);
      case 'FORMULA':
        return this.calculateFormula(metrics, profile.methodConfig);
    }
  }
  
  private async gatherMetrics(trainer, period) {
    // Gather ALL sessions and sales for the trainer
    // The profile determines the calculation method and rates
    return {
      totalSessions: await this.countSessions(trainer, period),
      sessionValue: await this.sumSessionValue(trainer, period),
      totalSales: await this.sumSales(trainer, period),
      avgSessionValue: await this.avgSessionValue(trainer, period)
    };
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

### Phase 1: Formula Foundation (MVP - Recommended Start)
- [ ] Basic formula parser using math.js
- [ ] Core variables (sessions_count, sessions_value, sales_value)
- [ ] Essential functions (IF, TIER, PROGRESSIVE)
- [ ] Formula validation and security
- [ ] Simple formula builder UI
- [ ] 3-4 pre-built templates
- [ ] Test scenario runner
- [ ] Monthly commission dashboard

### Phase 2: Enhanced Formula System
- [ ] Visual formula builder with drag-drop
- [ ] Extended variable library (performance metrics, trainer attributes)
- [ ] Advanced functions (statistical, lookup functions)
- [ ] Formula version control
- [ ] A/B testing capability
- [ ] Real-time formula preview
- [ ] Excel export with formula details

### Phase 3: Legacy Method Support (Optional)
- [ ] Flat rate calculation
- [ ] Progressive tier calculation (UI wrapper around formula)
- [ ] Package-based scope implementation
- [ ] Migration tool from old methods to formulas
- [ ] Quarterly calculations

### Phase 4: Enterprise Features
- [ ] Formula marketplace (share between organizations)
- [ ] AI-suggested formula optimization
- [ ] Commission forecasting with what-if analysis
- [ ] Multi-location formula variations
- [ ] Integration with payroll systems

## Formula Adoption Strategy

### Migration Path from Simple to Advanced

1. **Start Simple**: Organizations begin with templates
2. **Gradual Customization**: Modify templates as needed
3. **Advanced Usage**: Create custom formulas from scratch

### Example Progressive Adoption

**Month 1: Use Template**
```
Formula: Simple Percentage Template
(sessions_value * 0.20) + (sales_value * 0.10)
```

**Month 3: Customize Rates**
```
Formula: Modified Template
(sessions_value * 0.22) + (sales_value * 0.12)
```

**Month 6: Add Conditions**
```
Formula: Enhanced with Tiers
(sessions_value * TIER(sessions_count, [[0,30,0.20],[31,50,0.22],[51,null,0.25]])) + 
(sales_value * 0.12)
```

**Month 12: Full Custom**
```
Formula: Organization-Specific
PROGRESSIVE(sessions_value, sessions_count, custom_tiers) +
(sales_value * 0.15) +
// Final calculated commission value
```

## Success Metrics

1. **Accuracy**: 100% calculation accuracy with formula validation
2. **Flexibility**: Support ANY commission model via formulas
3. **Efficiency**: Calculate 100 trainers in <5 seconds
4. **Transparency**: Step-by-step formula breakdown for trainers
5. **Adoption**: 80% of organizations using formulas within 6 months

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