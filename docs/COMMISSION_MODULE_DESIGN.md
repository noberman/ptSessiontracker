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

Organizations configure their commission system with three main settings:

1. **Calculation Method**: How commission rates are determined (Flat, Progressive, Formula)
2. **Calculation Period**: When commissions are calculated (Monthly, Quarterly)  
3. **Application Scope**: How rates are applied (Universal, Package-Based)

```javascript
{
  // Main Settings
  calculationMethod: "PROGRESSIVE",    // FLAT | PROGRESSIVE | FORMULA
  calculationPeriod: "MONTHLY",        // MONTHLY | QUARTERLY
  applicationScope: "UNIVERSAL",       // UNIVERSAL | PACKAGE_BASED
  
  // Method-specific configuration
  methodConfig: { /* varies by method */ },
  
  // Package-specific overrides (if scope is PACKAGE_BASED)
  packageOverrides: [
    {
      packageTypeId: "premium",
      methodConfig: { /* same structure as main config */ }
    }
  ]
}
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

### Application Scope Examples

#### Universal Application (Default)
The same calculation method applies to all packages and trainers.

```javascript
{
  calculationMethod: "PROGRESSIVE",
  calculationPeriod: "MONTHLY",
  applicationScope: "UNIVERSAL",
  methodConfig: {
    tiers: [
      { minSessions: 0, maxSessions: 40, executionRate: 20, saleRate: 10 },
      { minSessions: 41, maxSessions: null, executionRate: 25, saleRate: 15 }
    ]
  }
}
```

#### Package-Based Application
Different packages can have different commission structures.

```javascript
{
  calculationMethod: "PROGRESSIVE",
  calculationPeriod: "MONTHLY", 
  applicationScope: "PACKAGE_BASED",
  
  // Default configuration for standard packages
  methodConfig: {
    tiers: [
      { minSessions: 0, maxSessions: 40, executionRate: 20, saleRate: 10 },
      { minSessions: 41, maxSessions: null, executionRate: 25, saleRate: 12 }
    ]
  },
  
  // Override configurations for specific package types
  packageOverrides: [
    {
      packageTypeId: "premium",
      name: "Premium Packages",
      methodConfig: {
        tiers: [
          { minSessions: 0, maxSessions: 30, executionRate: 25, saleRate: 15 },
          { minSessions: 31, maxSessions: null, executionRate: 30, saleRate: 18 }
        ]
      }
    },
    {
      packageTypeId: "intro",
      name: "Intro Packages", 
      methodConfig: {
        tiers: [
          { minSessions: 0, maxSessions: null, executionRate: 15, saleRate: 5 }
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
sessions_count          // Number of completed sessions this period
sessions_value          // Total monetary value of completed sessions
avg_session_value       // Average value per session
sales_count            // Number of packages sold
sales_value            // Total monetary value of packages sold
avg_package_value      // Average package value

// Trainer Tier (for different targets/rates)
trainer_tier           // Numeric tier level (1=PT1, 2=PT2, etc.)

// Time Variables
month_number          // Current month (1-12)
quarter_number        // Current quarter (1-4)
days_in_period        // Number of days in calculation period

// Package Specific
premium_sessions      // Count of premium package sessions
standard_sessions     // Count of standard package sessions
intro_sessions        // Count of intro/trial sessions
group_sessions        // Count of group training sessions

// No-Show Tracking
no_show_count         // Number of no-show sessions (no commission)
validated_sessions    // Number of validated sessions only
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
GRADUATED(base_value, count_value, tier_config)    // Each unit at its tier rate

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
BONUS_THRESHOLD(metric_name)   // Returns threshold for bonus qualification

// Date Functions
DAYS_SINCE(date)
MONTHS_BETWEEN(date1, date2)
IS_MONTH_END()
IS_QUARTER_END()

// Custom Business Functions
SEASONAL_ADJUSTMENT(month, base_rate)  // Apply seasonal multipliers
QUARTER_BONUS(quarter, base_amount)    // Quarterly performance bonuses
TIER_MULTIPLIER(trainer_tier)          // Multiplier based on trainer tier
```

### Formula Examples

#### Example 1: Simple Progressive
```excel
= sessions_value * TIER(sessions_count, [[0,30,0.15], [31,50,0.20], [51,null,0.25]])
```

#### Example 2: Multi-Factor Calculation
```excel
= PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.20], [41,60,0.25], [61,null,0.30]]) +
  (sales_value * IF(trainer_tier >= 2, 0.12, 0.10)) +
  IF(AND(month_number >= 1, month_number <= 3), 500, 0)  // Q1 bonus
```

#### Example 3: Graduated Commission with Package Types
```excel
= GRADUATED(avg_session_value, sessions_count, [[0,30,0.15], [31,50,0.20], [51,null,0.25]]) +
  (premium_sessions * 10) +  // Bonus for premium packages
  (group_sessions * 5)        // Bonus for group sessions
```

### Visual Formula Builder Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Commission Formula Builder                                  │
├──────────────────────┬──────────────────────────────────────┤
│ VARIABLES            │ FORMULA EDITOR                       │
│                      │                                      │
│ Sessions             │ ┌────────────────────────────────┐  │
│ ├─ sessions_count    │ │(                               │  │
│ ├─ sessions_value    │ │  sessions_value *              │  │
│ └─ avg_session_value │ │  TIER(                         │  │
│                      │ │    sessions_count,             │  │
│ Sales                │ │    [[0, 30, 0.15],            │  │
│ ├─ sales_count       │ │     [31, 50, 0.20],           │  │
│ └─ sales_value       │ │     [51, null, 0.25]]         │  │
│                      │ │  )                             │  │
│ Trainer              │ │) +                             │  │
│ └─ trainer_tier      │ │(sales_value * 0.10) +          │  │
│                      │ │IF(trainer_tier >= 2,          │  │
│ Time                 │ │   sales_value * 0.02, 0)      │  │
│ ├─ month_number      │ │                                │  │
│ └─ quarter_number    │ │                                │  │
│                      │ └────────────────────────────────┘  │
│ [+ More Variables]   │                                      │
├──────────────────────┼──────────────────────────────────────┤
│ FUNCTIONS            │ TEST YOUR FORMULA                    │
│                      │                                      │
│ Conditional          │ Test Scenario:                       │
│ ├─ IF()             │ ┌────────────────────────────────┐  │
│ ├─ IFS()            │ │ sessions_count: 45             │  │
│ └─ SWITCH()         │ │ sessions_value: $4,500         │  │
│                      │ │ sales_value: $12,000           │  │
│ Tier Functions       │ │ trainer_tier: 2                │  │
│ ├─ TIER()           │ └────────────────────────────────┘  │
│ ├─ PROGRESSIVE()    │                                      │
│ └─ GRADUATED()      │ Result: $2,400.00                    │
│                      │                                      │
│ [+ More Functions]   │ [Run Test] [Save Formula] [Cancel]  │
└──────────────────────┴──────────────────────────────────────┘
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
  approvedById      String?
  approvedAt        DateTime?
  
  // Relations
  organization      Organization @relation(...)
  createdBy         User @relation("FormulaCreator", ...)
  approvedBy        User? @relation("FormulaApprover", ...)
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
  
  tiered_with_bonus: {
    name: "Tiered with Bonuses",
    description: "Progressive tiers plus monthly bonuses",
    formula: "PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.18],[41,60,0.22],[61,null,0.26]]) + IF(sessions_count > 60, 500, 0)",
    variables: ["sessions_value", "sessions_count"]
  },
  
  hybrid_advanced: {
    name: "Advanced Hybrid",
    description: "Complex calculation with trainer tiers and seasonal adjustments",
    formula: `
      PROGRESSIVE(sessions_value, sessions_count, [[0,40,0.18],[41,60,0.22],[61,null,0.26]]) +
      (sales_value * IF(trainer_tier >= 2, 0.12, 0.10)) +
      IF(AND(month_number >= 1, month_number <= 3), sessions_value * 0.02, 0)  // Q1 bonus
    `,
    variables: ["sessions_value", "sessions_count", "sales_value", "trainer_tier", "month_number"]
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
        sales_value: 2000,
        trainer_tier: 1,
        month_number: 3
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
        sales_value: 15000,
        trainer_tier: 3,
        month_number: 3
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
  commissionMethod     String @default("PROGRESSIVE")
  commissionConfig     Json   // Stores method-specific configuration
  commissionPeriod     CommissionPeriod @default(MONTHLY)
  commissionScope      ApplicationScope @default(UNIVERSAL)
}

model CommissionRule {
  id               String @id @default(cuid())
  organizationId   String
  name             String
  type             CommissionType
  scope            ApplicationScope
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
  calculationScope  String  // UNIVERSAL or PACKAGE_BASED
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
  FORMULA
}

enum ApplicationScope {
  UNIVERSAL
  PACKAGE_BASED
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
  calculateCommission(trainer, period, method, scope, config) {
    const metrics = this.gatherMetrics(trainer, period, scope);
    
    switch(method) {
      case 'FLAT':
        return this.calculateFlat(metrics, config);
      case 'PROGRESSIVE':
        return this.calculateProgressive(metrics, config);
      case 'FORMULA':
        return this.calculateFormula(metrics, config);
    }
  }
  
  private gatherMetrics(trainer, period, scope) {
    if (scope === 'PACKAGE_BASED') {
      // Calculate metrics per package
      return this.gatherPackageMetrics(trainer, period);
    } else {
      // Calculate metrics universally
      return this.gatherUniversalMetrics(trainer, period);
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
- [ ] Advanced functions (GRADUATED, statistical, date functions)
- [ ] Formula version control
- [ ] A/B testing capability
- [ ] Real-time formula preview
- [ ] Excel export with formula details

### Phase 3: Legacy Method Support (Optional)
- [ ] Flat rate calculation
- [ ] Progressive tier calculation (UI wrapper around formula)
- [ ] Package-based rules (formula generator)
- [ ] Migration tool from old methods to formulas
- [ ] Quarterly calculations

### Phase 4: Enterprise Features
- [ ] Formula marketplace (share between organizations)
- [ ] AI-suggested formula optimization
- [ ] Commission forecasting with what-if analysis
- [ ] Multi-location formula variations
- [ ] Advanced approval workflows with formula review
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
(sales_value * IF(trainer_tier >= 2, 0.15, 0.12)) +
QUARTER_BONUS(quarter_number, 1000) +
SEASONAL_ADJUSTMENT(month_number, base_rate)
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