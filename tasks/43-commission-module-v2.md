# Task 43: Commission Module v2 - Profile-Based System

## Overview
Complete redesign of the commission system from simple percentage tiers to a flexible profile-based architecture supporting multiple calculation methods, reward types, and trigger conditions. This enables organizations to pay flat fees per session, percentage-based commissions, sales commissions, and tier bonuses.

**Estimated Duration**: 4-5 weeks  
**Risk Level**: High (Core financial calculation system)  
**Backwards Compatibility**: Required (parallel run with v1)

## Business Requirements
1. Support flat fee per session (e.g., $50/session regardless of session value)
2. Support percentage-based commission (current system)
3. Support hybrid models (flat fee + percentage)
4. Enable different commission structures for different trainer types
5. Maintain complete audit trail of calculations
6. Zero downtime migration from current system
7. No data loss or calculation errors during transition

## Technical Architecture

### New Data Models
```
CommissionProfile (Organization → Profiles)
  ├── CommissionTierV2 (Profile → Tiers)
  │     ├── Triggers (session count, sales volume, both, either)
  │     └── Rewards (session %, flat fee, sales %, bonuses)
  └── User (commissionProfileId foreign key)

CommissionCalculation (Audit trail)
  └── Stores all calculation details per trainer per period
```

## Implementation Phases

---

## PHASE 0: Preparation & Planning (2 days)

### 0.1 Environment Setup
- [ ] Create local backup of current database
- [ ] Sync local schema with production: `npx prisma db pull`
- [ ] Create test database for parallel testing
- [ ] Document current commission calculations for 3 sample trainers
- [ ] Set up feature branch: `git checkout -b feat/commission-v2` from staging

### 0.2 Create Test Data
- [ ] Export current commission tiers from production
- [ ] Export last 3 months of commission calculations
- [ ] Create test scenarios document covering:
  - Zero sessions
  - Single session
  - Tier boundaries (19, 20, 21 sessions)
  - Maximum sessions scenario
  - Mixed session values

### 0.3 Risk Assessment
- [ ] Identify all places commission is calculated in codebase
- [ ] List all UI components showing commission data
- [ ] Document API endpoints affected
- [ ] Create rollback plan document

---

## PHASE 1: Database Schema (3 days)

### 1.1 Current Schema Analysis
**Existing Models:**
- `Organization` has `commissionMethod: String` (currently "PROGRESSIVE" or "GRADUATED")
- `CommissionTier` exists with `minSessions`, `maxSessions`, `percentage` (v1 system)
- `User` model exists without commission profile reference
- `Package` model exists for tracking sales (has `totalValue` for sales commission)
- `AuditLog` exists for general auditing
- No existing enums for commission-specific types

### 1.2 New Schema Additions
```prisma
// Add to existing schema.prisma

model CommissionProfile {
  id                String   @id @default(cuid())
  organizationId    String
  name              String
  description       String?
  isDefault         Boolean  @default(false)
  isActive          Boolean  @default(true)
  calculationMethod CalculationMethod @default(PROGRESSIVE)
  
  // Relations
  organization      Organization @relation(fields: [organizationId], references: [id])
  tiers            CommissionTierV2[]
  users            User[]        @relation("UserCommissionProfile")
  calculations     CommissionCalculation[]
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([organizationId, name])
  @@index([organizationId, isActive])
  @@map("commission_profiles")
}

model CommissionTierV2 {
  id                       String   @id @default(cuid())
  profileId                String
  tierLevel                Int
  name                     String
  
  // Triggers
  triggerType              TriggerType @default(NONE)
  sessionThreshold         Int?
  salesThreshold           Float?    // Using Float to match Package.totalValue type
  
  // Rewards (using Float to match existing session/package value types)
  sessionCommissionPercent Float?    // Percentage as decimal (0.15 = 15%)
  sessionFlatFee          Float?    // Dollar amount per session
  salesCommissionPercent   Float?    // Percentage of package sales
  salesFlatFee            Float?    // Dollar amount per package sold
  tierBonus               Float?    // One-time bonus for reaching tier
  
  profile                  CommissionProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  @@unique([profileId, tierLevel])
  @@index([profileId])
  @@map("commission_tiers_v2")
}

model CommissionCalculation {
  id                String   @id @default(cuid())
  organizationId    String
  userId            String
  profileId         String
  
  // Period tracking
  periodStart       DateTime
  periodEnd         DateTime
  periodType        PeriodType @default(MONTHLY)
  
  // Metrics (matching existing Float types)
  sessionCount      Int
  sessionValue      Float     // Total value of sessions
  salesCount        Int       // Number of packages sold
  salesValue        Float     // Total value of packages sold
  
  // Results
  achievedTierLevel Int
  achievedTierName  String
  sessionCommission Float
  salesCommission   Float
  tierBonus        Float
  totalCommission  Float
  
  // Audit
  calculationDetails Json      // Detailed breakdown
  calculationVersion String    @default("v2")
  status            CalculationStatus @default(DRAFT)
  approvedBy        String?
  approvedAt        DateTime?
  paidAt           DateTime?
  
  // Relations
  organization      Organization @relation(fields: [organizationId], references: [id])
  user             User @relation(fields: [userId], references: [id])
  profile          CommissionProfile @relation(fields: [profileId], references: [id])
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([userId, periodStart, periodEnd])
  @@index([organizationId, periodStart])
  @@index([userId, status])
  @@map("commission_calculations")
}

// New Enums
enum TriggerType {
  NONE              // Default tier, always applies
  SESSION_COUNT     // Based on number of sessions
  SALES_VOLUME      // Based on package sales value
  BOTH_AND          // Both conditions must be met
  EITHER_OR         // Either condition triggers tier
}

enum CalculationMethod {
  FLAT              // Single tier, simple rates
  PROGRESSIVE       // Highest achieved tier applies to all
  GRADUATED         // Each tier applies to its range
}

enum PeriodType {
  MONTHLY
  QUARTERLY
}

enum CalculationStatus {
  DRAFT             // Calculated but not reviewed
  APPROVED          // Approved for payment
  PAID              // Payment processed
  CANCELLED         // Cancelled/voided
}
```

### 1.3 Update Existing Models
```prisma
// In User model, add:
model User {
  // ... existing fields ...
  
  // Commission v2 fields
  commissionProfileId    String?
  commissionProfile      CommissionProfile? @relation("UserCommissionProfile", fields: [commissionProfileId], references: [id])
  commissionCalculations CommissionCalculation[]
  
  // ... rest of existing fields ...
}

// In Organization model, add relation:
model Organization {
  // ... existing fields ...
  
  // Commission v2 relations
  commissionProfiles    CommissionProfile[]
  commissionCalculations CommissionCalculation[]
  
  // ... rest of existing fields ...
}
```

### 1.4 Create Migration File
```bash
# Generate migration
npx prisma migrate dev --name add_commission_v2_schema --create-only

# This creates a migration file without applying it
# Edit the SQL file to make it idempotent
```

### 1.5 Make Migration Idempotent
```sql
-- migrations/[timestamp]_add_commission_v2_schema.sql

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE "TriggerType" AS ENUM ('NONE', 'SESSION_COUNT', 'SALES_VOLUME', 'BOTH_AND', 'EITHER_OR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CalculationMethod" AS ENUM ('FLAT', 'PROGRESSIVE', 'GRADUATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'QUARTERLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CalculationStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create commission_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "commission_profiles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "calculationMethod" "CalculationMethod" NOT NULL DEFAULT 'PROGRESSIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "commission_profiles_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "commission_profiles" ADD CONSTRAINT "commission_profiles_organizationId_name_key" 
    UNIQUE ("organizationId", "name");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create commission_tiers_v2 table
CREATE TABLE IF NOT EXISTS "commission_tiers_v2" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "profileId" TEXT NOT NULL,
  "tierLevel" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "triggerType" "TriggerType" NOT NULL DEFAULT 'NONE',
  "sessionThreshold" INTEGER,
  "salesThreshold" DOUBLE PRECISION,
  "sessionCommissionPercent" DOUBLE PRECISION,
  "sessionFlatFee" DOUBLE PRECISION,
  "salesCommissionPercent" DOUBLE PRECISION,
  "salesFlatFee" DOUBLE PRECISION,
  "tierBonus" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "commission_tiers_v2_pkey" PRIMARY KEY ("id")
);

-- Create commission_calculations table
CREATE TABLE IF NOT EXISTS "commission_calculations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "periodType" "PeriodType" NOT NULL DEFAULT 'MONTHLY',
  "sessionCount" INTEGER NOT NULL,
  "sessionValue" DOUBLE PRECISION NOT NULL,
  "salesCount" INTEGER NOT NULL,
  "salesValue" DOUBLE PRECISION NOT NULL,
  "achievedTierLevel" INTEGER NOT NULL,
  "achievedTierName" TEXT NOT NULL,
  "sessionCommission" DOUBLE PRECISION NOT NULL,
  "salesCommission" DOUBLE PRECISION NOT NULL,
  "tierBonus" DOUBLE PRECISION NOT NULL,
  "totalCommission" DOUBLE PRECISION NOT NULL,
  "calculationDetails" JSONB NOT NULL,
  "calculationVersion" TEXT NOT NULL DEFAULT 'v2',
  "status" "CalculationStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id")
);

-- Add column to users table if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "commissionProfileId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
  ALTER TABLE "commission_profiles" ADD CONSTRAINT "commission_profiles_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "commission_tiers_v2" ADD CONSTRAINT "commission_tiers_v2_profileId_fkey" 
    FOREIGN KEY ("profileId") REFERENCES "commission_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_profileId_fkey" 
    FOREIGN KEY ("profileId") REFERENCES "commission_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_commissionProfileId_fkey" 
    FOREIGN KEY ("commissionProfileId") REFERENCES "commission_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "commission_profiles_organizationId_isActive_idx" ON "commission_profiles"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "commission_tiers_v2_profileId_idx" ON "commission_tiers_v2"("profileId");
CREATE INDEX IF NOT EXISTS "commission_calculations_organizationId_periodStart_idx" ON "commission_calculations"("organizationId", "periodStart");
CREATE INDEX IF NOT EXISTS "commission_calculations_userId_status_idx" ON "commission_calculations"("userId", "status");

-- Add unique constraints
DO $$ BEGIN
  ALTER TABLE "commission_tiers_v2" ADD CONSTRAINT "commission_tiers_v2_profileId_tierLevel_key" 
    UNIQUE ("profileId", "tierLevel");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_userId_periodStart_periodEnd_key" 
    UNIQUE ("userId", "periodStart", "periodEnd");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### 1.6 Testing Steps
- [ ] Run migration on fresh database
- [ ] Run migration on database with existing data
- [ ] Run migration twice to ensure idempotency
- [ ] Test rollback: `npx prisma migrate reset --skip-seed`
- [ ] Verify all constraints and indexes created
- [ ] Update `/docs/schema.md` with new models

### 1.3 Migration Safety
```sql
-- Example idempotent migration
DO $$ 
BEGIN 
  -- Only create table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE tablename = 'commission_profiles'
  ) THEN
    CREATE TABLE commission_profiles (...);
  END IF;
  
  -- Only add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='commission_profile_id'
  ) THEN
    ALTER TABLE users ADD COLUMN commission_profile_id TEXT;
  END IF;
END $$;
```

---

## PHASE 2: Data Migration Scripts (2 days)

### 2.1 Create Migration Service
```typescript
// src/lib/commission/migration/v1-to-v2.ts
import { prisma } from '@/lib/prisma'
import { CalculationMethod } from '@prisma/client'

export class CommissionMigrationService {
  /**
   * Migrate an organization from v1 to v2 commission system
   */
  async migrateOrganization(organizationId: string) {
    // 1. Get organization and its current setup
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        commissionTiers: {
          orderBy: { minSessions: 'asc' }
        },
        users: {
          where: { role: 'TRAINER' }
        }
      }
    })
    
    if (!org) throw new Error('Organization not found')
    
    // 2. Create profile matching current commission method
    const profileName = `Legacy ${org.commissionMethod} Profile`
    const profile = await prisma.commissionProfile.create({
      data: {
        organizationId,
        name: profileName,
        description: `Migrated from v1 ${org.commissionMethod} system`,
        isDefault: true,
        isActive: true,
        calculationMethod: org.commissionMethod as CalculationMethod,
        tiers: {
          create: org.commissionTiers.map((tier, index) => ({
            tierLevel: index + 1,
            name: `Tier ${index + 1} (${tier.minSessions}${tier.maxSessions ? `-${tier.maxSessions}` : '+'} sessions)`,
            triggerType: 'SESSION_COUNT',
            sessionThreshold: tier.minSessions,
            // Convert percentage from decimal to percentage (0.15 → 15)
            sessionCommissionPercent: tier.percentage,
            // No flat fees in v1
            sessionFlatFee: null,
            salesCommissionPercent: null,
            salesFlatFee: null,
            tierBonus: null
          }))
        }
      }
    })
    
    // 3. Assign profile to all trainers
    await prisma.user.updateMany({
      where: {
        organizationId,
        role: 'TRAINER'
      },
      data: {
        commissionProfileId: profile.id
      }
    })
    
    // 4. Log migration in audit log
    await prisma.auditLog.create({
      data: {
        action: 'COMMISSION_MIGRATION_V1_TO_V2',
        entityType: 'Organization',
        entityId: organizationId,
        userId: null, // System action
        oldValue: {
          method: org.commissionMethod,
          tiersCount: org.commissionTiers.length
        },
        newValue: {
          profileId: profile.id,
          profileName: profile.name,
          trainersAssigned: org.users.length
        },
        metadata: {
          version: 'v1_to_v2',
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return profile
  }
  
  /**
   * Validate that v2 calculations match v1
   */
  async validateMigration(
    organizationId: string,
    testMonth: Date = new Date()
  ): Promise<{
    isValid: boolean
    discrepancies: Array<{
      trainerId: string
      trainerName: string
      v1Total: number
      v2Total: number
      difference: number
    }>
  }> {
    const discrepancies = []
    
    // Get all trainers with profile
    const trainers = await prisma.user.findMany({
      where: {
        organizationId,
        role: 'TRAINER',
        commissionProfileId: { not: null }
      }
    })
    
    for (const trainer of trainers) {
      // Calculate using both systems
      const v1Result = await this.calculateV1Commission(trainer.id, testMonth)
      const v2Result = await this.calculateV2Commission(trainer.id, testMonth)
      
      const difference = Math.abs(v1Result.total - v2Result.total)
      
      if (difference > 0.01) { // Allow for rounding differences
        discrepancies.push({
          trainerId: trainer.id,
          trainerName: trainer.name,
          v1Total: v1Result.total,
          v2Total: v2Result.total,
          difference
        })
      }
    }
    
    return {
      isValid: discrepancies.length === 0,
      discrepancies
    }
  }
  
  /**
   * Rollback migration (keep profiles for audit)
   */
  async rollbackMigration(organizationId: string) {
    // Remove profile assignments but keep profiles
    const result = await prisma.user.updateMany({
      where: {
        organizationId,
        commissionProfileId: { not: null }
      },
      data: {
        commissionProfileId: null
      }
    })
    
    // Log rollback
    await prisma.auditLog.create({
      data: {
        action: 'COMMISSION_MIGRATION_ROLLBACK',
        entityType: 'Organization',
        entityId: organizationId,
        userId: null,
        oldValue: { hasProfiles: true },
        newValue: { 
          hasProfiles: false,
          trainersAffected: result.count
        },
        metadata: {
          reason: 'Manual rollback',
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return result
  }
  
  // Helper methods for calculation comparison
  private async calculateV1Commission(trainerId: string, month: Date) {
    // Use existing v1 calculator
    const { calculateTrainerCommission } = await import('@/lib/commission/calculator')
    const result = await calculateTrainerCommission(
      trainerId, 
      month,
      'PROGRESSIVE' // Will use org's actual method
    )
    return {
      total: result?.commissionAmount || 0
    }
  }
  
  private async calculateV2Commission(trainerId: string, month: Date) {
    // This will be implemented in Phase 3
    // For now, return matching v1 for testing
    return this.calculateV1Commission(trainerId, month)
  }
}
```

### 2.2 Migration Script
```typescript
// scripts/migrate-commission-v2.ts
import { CommissionMigrationService } from '@/lib/commission/migration/v1-to-v2'
import { prisma } from '@/lib/prisma'

async function main() {
  const migrationService = new CommissionMigrationService()
  
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    where: {
      // Only migrate orgs that haven't been migrated yet
      commissionProfiles: {
        none: {}
      }
    }
  })
  
  console.log(`Found ${orgs.length} organizations to migrate`)
  
  for (const org of orgs) {
    console.log(`\nMigrating ${org.name} (${org.id})...`)
    
    try {
      // Migrate
      const profile = await migrationService.migrateOrganization(org.id)
      console.log(`✅ Created profile: ${profile.name}`)
      
      // Validate
      const validation = await migrationService.validateMigration(org.id)
      
      if (validation.isValid) {
        console.log(`✅ Validation passed`)
      } else {
        console.log(`⚠️ Validation failed with ${validation.discrepancies.length} discrepancies`)
        validation.discrepancies.forEach(d => {
          console.log(`  - ${d.trainerName}: v1=${d.v1Total}, v2=${d.v2Total}, diff=${d.difference}`)
        })
        
        // Optionally rollback if discrepancies
        if (process.env.ROLLBACK_ON_DISCREPANCY === 'true') {
          await migrationService.rollbackMigration(org.id)
          console.log(`↩️ Rolled back migration`)
        }
      }
    } catch (error) {
      console.error(`❌ Error migrating ${org.name}:`, error)
    }
  }
  
  console.log('\nMigration complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 2.3 Special Case Migrations
```typescript
// Handle organizations with no existing tiers
async function createDefaultProfile(organizationId: string) {
  return prisma.commissionProfile.create({
    data: {
      organizationId,
      name: 'Default Commission Profile',
      description: 'Default profile for organizations without existing tiers',
      isDefault: true,
      isActive: true,
      calculationMethod: 'PROGRESSIVE',
      tiers: {
        create: [
          {
            tierLevel: 1,
            name: 'Base',
            triggerType: 'NONE',
            sessionCommissionPercent: 0.20, // 20% default
          },
          {
            tierLevel: 2,
            name: 'Standard',
            triggerType: 'SESSION_COUNT',
            sessionThreshold: 20,
            sessionCommissionPercent: 0.25, // 25%
          },
          {
            tierLevel: 3,
            name: 'Premium',
            triggerType: 'SESSION_COUNT',
            sessionThreshold: 40,
            sessionCommissionPercent: 0.30, // 30%
          }
        ]
      }
    }
  })
}

// Handle flat fee requirements for specific orgs
async function createFlatFeeProfile(
  organizationId: string,
  feePerSession: number
) {
  return prisma.commissionProfile.create({
    data: {
      organizationId,
      name: 'Contractor Flat Fee',
      description: `$${feePerSession} per session flat rate`,
      isDefault: false,
      isActive: true,
      calculationMethod: 'FLAT',
      tiers: {
        create: [{
          tierLevel: 1,
          name: 'Flat Rate',
          triggerType: 'NONE',
          sessionFlatFee: feePerSession,
        }]
      }
    }
  })
}
```

### 2.4 Testing Checklist
- [ ] Test with organization using PROGRESSIVE method
- [ ] Test with organization using GRADUATED method
- [ ] Test with organization having no commission tiers
- [ ] Test with organization having irregular tier ranges
- [ ] Verify all trainers get assigned profiles
- [ ] Verify calculations match within 0.01 tolerance
- [ ] Test rollback functionality
- [ ] Check audit logs created correctly

---

## PHASE 3: Calculation Engine (4 days)

### 3.1 Create New Calculator
```typescript
// src/lib/commission/v2/profile-calculator.ts
export class ProfileBasedCalculator {
  async calculate(
    userId: string,
    period: { start: Date; end: Date },
    options?: { saveCalculation: boolean }
  ): Promise<CommissionCalculation> {
    // Implementation following design doc
  }
}
```

### 3.2 Implement Calculation Methods
- [ ] FLAT: Single tier, simple calculation
- [ ] PROGRESSIVE: Achieved tier applies to all
- [ ] GRADUATED: Each tier for its range

### 3.3 Reward Types
- [ ] Session percentage commission
- [ ] Session flat fee
- [ ] Sales percentage commission  
- [ ] Sales flat fee
- [ ] Tier achievement bonuses
- [ ] Hybrid calculations (percentage + flat)

### 3.4 Parallel Calculation System
```typescript
// src/lib/commission/parallel-runner.ts
export async function calculateWithComparison(
  userId: string,
  period: { start: Date; end: Date }
) {
  const [v1Result, v2Result] = await Promise.all([
    calculateV1(userId, period),
    calculateV2(userId, period)
  ]);
  
  if (Math.abs(v1Result.total - v2Result.total) > 0.01) {
    await logDiscrepancy({
      userId,
      period,
      v1: v1Result,
      v2: v2Result,
      difference: v1Result.total - v2Result.total
    });
  }
  
  return process.env.USE_COMMISSION_V2 === 'true' ? v2Result : v1Result;
}
```

### 3.5 Testing
- [ ] Unit tests for each calculation method
- [ ] Edge cases: 0 sessions, negative values, nulls
- [ ] Performance tests with 1000+ trainers
- [ ] Comparison tests v1 vs v2

---

## PHASE 4: Feature Flag System (1 day)

### 4.1 Environment Variables
```env
# .env.local
COMMISSION_VERSION=v1  # v1 or v2
COMMISSION_V2_BETA_ORGS=org1,org2  # Specific orgs for beta
COMMISSION_V2_PARALLEL_RUN=true  # Run both for comparison
COMMISSION_V2_LOG_DISCREPANCIES=true
```

### 4.2 Feature Flag Service
```typescript
// src/lib/feature-flags.ts
export function useCommissionV2(organizationId: string): boolean {
  if (process.env.COMMISSION_VERSION === 'v2') {
    return true;
  }
  
  const betaOrgs = process.env.COMMISSION_V2_BETA_ORGS?.split(',') || [];
  return betaOrgs.includes(organizationId);
}
```

### 4.3 Gradual Rollout Plan
1. Week 1: Internal testing only
2. Week 2: Beta org with parallel validation
3. Week 3: 10% of organizations
4. Week 4: 50% of organizations
5. Week 5: 100% with v1 fallback available

---

## PHASE 5: Admin UI - Profile Management (5 days)

### 5.1 Profile List Page
- [ ] `/settings/commission/profiles`
- [ ] List all profiles with trainer count
- [ ] Create, edit, delete (with confirmations)
- [ ] Mark default profile
- [ ] Clone existing profile

### 5.2 Profile Builder
- [ ] Step 1: Basic info (name, description, method)
- [ ] Step 2: Tier configuration
  - [ ] Dynamic tier addition/removal
  - [ ] Trigger configuration UI
  - [ ] Reward configuration with radio buttons
- [ ] Step 3: Test calculator
  - [ ] Input test metrics
  - [ ] Show calculation breakdown
  - [ ] Compare with other profiles

### 5.3 Tier Builder Component
```tsx
// src/components/commission/TierBuilder.tsx
interface TierBuilderProps {
  tier: CommissionTierV2;
  onChange: (tier: CommissionTierV2) => void;
  onRemove: () => void;
}

// Radio button groups for reward types
// Conditional inputs based on selection
// Validation for required fields
```

### 5.4 Profile Assignment
- [ ] Bulk assignment UI
- [ ] Filter trainers by location/role
- [ ] Preview impact before applying
- [ ] Audit log of changes

### 5.5 Testing UI
- [ ] Mock data for all scenarios
- [ ] Cypress tests for profile creation flow
- [ ] Accessibility testing
- [ ] Mobile responsiveness

---

## PHASE 6: Trainer Assignment UI (2 days)

### 6.1 Update Trainer Edit Page
- [ ] Add "Commission Profile" dropdown
- [ ] Show current vs new calculation preview
- [ ] Effective date selection
- [ ] Save with audit log

### 6.2 Bulk Assignment
- [ ] Select multiple trainers
- [ ] Choose profile to assign
- [ ] Preview commission impact
- [ ] Confirm and apply

### 6.3 Assignment Report
- [ ] Show all trainers and their profiles
- [ ] Filter by profile
- [ ] Export to CSV
- [ ] Last changed date/by whom

---

## PHASE 7: Commission Reports Update (3 days)

### 7.1 Update Existing Reports
- [ ] Modify `/commission` page to use v2 when enabled
- [ ] Add profile name to report
- [ ] Show calculation breakdown
- [ ] Keep v1 UI compatibility

### 7.2 Comparison Mode
- [ ] Side-by-side v1 vs v2 view
- [ ] Highlight discrepancies
- [ ] Export comparison data
- [ ] Discrepancy resolution workflow

### 7.3 New Report Features
- [ ] Group by profile
- [ ] Tier achievement summary
- [ ] Bonus tracking
- [ ] Period-over-period comparison

---

## PHASE 8: API Updates (2 days)

### 8.1 New Endpoints
```typescript
// Profile CRUD
GET    /api/commission/profiles
POST   /api/commission/profiles
PUT    /api/commission/profiles/:id
DELETE /api/commission/profiles/:id

// Calculations
POST   /api/commission/v2/calculate
GET    /api/commission/v2/calculations
POST   /api/commission/v2/approve/:id

// Migration
POST   /api/commission/migrate
GET    /api/commission/migration/status
POST   /api/commission/migration/validate
```

### 8.2 Update Existing Endpoints
- [ ] Add version parameter to existing endpoints
- [ ] Default to v1 for backwards compatibility
- [ ] Add deprecation headers for v1

### 8.3 API Testing
- [ ] Postman collection for all endpoints
- [ ] Load testing with k6
- [ ] Error handling validation

---

## PHASE 9: Testing & Validation (3 days)

### 9.1 Unit Tests
```typescript
describe('Commission V2', () => {
  describe('Flat Fee Calculation', () => {
    it('should calculate $50 per session', () => {
      // Test implementation
    });
  });
  
  describe('Progressive Calculation', () => {
    it('should apply achieved tier to all sessions', () => {
      // Test implementation
    });
  });
  
  describe('V1 Compatibility', () => {
    it('should match v1 for percentage-only tiers', () => {
      // Test implementation
    });
  });
});
```

### 9.2 Integration Tests
- [ ] Full calculation flow
- [ ] Database transactions
- [ ] Profile assignment
- [ ] Migration process

### 9.3 E2E Tests
- [ ] Profile creation flow
- [ ] Trainer assignment
- [ ] Commission calculation
- [ ] Report generation

### 9.4 Performance Tests
- [ ] Calculate 1000 trainers < 10 seconds
- [ ] Profile page load < 2 seconds
- [ ] No memory leaks in calculation

### 9.5 User Acceptance Testing
- [ ] Create UAT script for admin users
- [ ] Test with real commission scenarios
- [ ] Collect feedback on UI/UX
- [ ] Document required changes

---

## PHASE 10: Documentation (2 days)

### 10.1 Technical Documentation
- [ ] Update `/docs/COMMISSION_MODULE_DESIGN.md`
- [ ] API documentation with examples
- [ ] Migration guide
- [ ] Rollback procedures

### 10.2 User Documentation
- [ ] Profile creation guide
- [ ] How to assign profiles
- [ ] Understanding calculations
- [ ] FAQ section

### 10.3 Training Materials
- [ ] Video walkthrough of new system
- [ ] Comparison chart (v1 vs v2)
- [ ] Best practices guide
- [ ] Common profile templates

---

## PHASE 11: Staging Deployment (2 days)

### 11.1 Pre-deployment
- [ ] Review all code with team
- [ ] Run full test suite
- [ ] Check TypeScript strict mode
- [ ] Lint and format code
- [ ] Update changelog

### 11.2 Deploy to Staging
```bash
# Merge feature branch to staging
git checkout staging
git merge feat/commission-v2
git push origin staging

# Run migrations on staging
railway run npx prisma migrate deploy
```

### 11.3 Staging Tests
- [ ] Create test profiles
- [ ] Assign to test trainers
- [ ] Run calculations
- [ ] Verify reports
- [ ] Test rollback procedure

### 11.4 Performance Monitoring
- [ ] Set up DataDog/NewRelic monitoring
- [ ] Create alerts for calculation errors
- [ ] Monitor database query performance
- [ ] Track API response times

---

## PHASE 12: Production Release (3 days)

### 12.1 Beta Release (Day 1)
- [ ] Enable for 1 test organization
- [ ] Monitor calculations closely
- [ ] Run parallel validation
- [ ] Collect feedback

### 12.2 Gradual Rollout (Day 2)
- [ ] Enable for 10% of orgs
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Address any issues

### 12.3 Full Release (Day 3)
- [ ] Enable for all organizations
- [ ] Keep v1 as fallback
- [ ] Monitor for 24 hours
- [ ] Prepare hotfix if needed

### 12.4 Post-Release
- [ ] Remove feature flags after 1 week
- [ ] Archive v1 code after 1 month
- [ ] Final documentation update
- [ ] Retrospective meeting

---

## PHASE 13: Database Cleanup (1 week after stable)

### 13.1 Pre-Cleanup Validation
**Wait Period**: Minimum 1 week after Phase 12 with zero issues

- [ ] Confirm all organizations using v2 profiles
- [ ] Verify no v1 calculations in last 7 days
- [ ] Backup entire database
- [ ] Confirm all trainers have `commissionProfileId` assigned
- [ ] Document current v1 table sizes for archive

### 13.2 Archive V1 Data
```sql
-- Create archive tables before dropping
CREATE TABLE IF NOT EXISTS "commission_tiers_v1_archive" AS 
SELECT * FROM "commission_tiers";

-- Add archive metadata
ALTER TABLE "commission_tiers_v1_archive" 
ADD COLUMN archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN archive_reason TEXT DEFAULT 'v2_migration_complete';
```

### 13.3 Remove V1 Fields from Organization
```typescript
// Migration: remove_commission_v1_fields.sql

-- Step 1: Verify no orgs are using v1 method actively
DO $$
DECLARE
  v1_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v1_count 
  FROM organizations 
  WHERE commissionMethod IS NOT NULL 
  AND id NOT IN (
    SELECT DISTINCT organizationId 
    FROM commission_profiles 
    WHERE isActive = true
  );
  
  IF v1_count > 0 THEN
    RAISE EXCEPTION 'Found % organizations still using v1 commission method', v1_count;
  END IF;
END $$;

-- Step 2: Remove v1 relationship from Organization model
ALTER TABLE "organizations" 
DROP CONSTRAINT IF EXISTS "organizations_commission_tiers_fkey";

-- Step 3: Drop the commissionMethod column
ALTER TABLE "organizations" 
DROP COLUMN IF EXISTS "commissionMethod";

-- Step 4: Drop old commission_tiers table (after archiving)
DROP TABLE IF EXISTS "commission_tiers" CASCADE;
```

### 13.4 Update Prisma Schema
```prisma
// Remove from Organization model:
// - commissionMethod     String    @default("PROGRESSIVE")  ← DELETE THIS
// - commissionTiers      CommissionTier[]                   ← DELETE THIS

// Remove entire model:
// model CommissionTier {                                    ← DELETE ALL
//   id             String        @id @default(cuid())
//   minSessions    Int
//   maxSessions    Int?
//   percentage     Float
//   createdAt      DateTime      @default(now())
//   updatedAt      DateTime      @updatedAt
//   organizationId String?
//   organization   Organization? @relation(...)
//   @@map("commission_tiers")
// }
```

### 13.5 Code Cleanup
```typescript
// Files to remove or update:
const filesToRemove = [
  'src/lib/commission/calculator.ts',        // Old v1 calculator
  'src/lib/commission/ensure-tiers.ts',      // V1 tier management
  'src/components/commission/v1/*',          // V1 UI components
  'src/app/api/commission/method/*',         // V1 method endpoints
]

const filesToUpdate = [
  'src/lib/commission/index.ts',             // Remove v1 exports
  'src/app/(authenticated)/commission/page.tsx', // Remove feature flags
  'src/components/settings/CommissionSettings.tsx', // Remove v1 UI
]
```

### 13.6 Feature Flag Removal
```typescript
// Remove from .env files:
// COMMISSION_VERSION=v2                     ← DELETE
// COMMISSION_V2_BETA_ORGS=                 ← DELETE  
// COMMISSION_V2_PARALLEL_RUN=false         ← DELETE
// COMMISSION_V2_LOG_DISCREPANCIES=false    ← DELETE

// Update all code removing conditionals:
// Before:
if (process.env.COMMISSION_VERSION === 'v2') {
  return calculateV2(...)
} else {
  return calculateV1(...)
}

// After:
return calculateV2(...)  // Now just the standard calculation
```

### 13.7 Update Organization Queries
```typescript
// Before cleanup - organizations might check commissionMethod
const org = await prisma.organization.findUnique({
  where: { id },
  include: {
    commissionTiers: true,  // ← This relation no longer exists
    commissionProfiles: true
  }
})

// After cleanup - only use profiles
const org = await prisma.organization.findUnique({
  where: { id },
  include: {
    commissionProfiles: {
      where: { isActive: true },
      include: { tiers: true }
    }
  }
})
```

### 13.8 Final Validation
- [ ] Run full test suite
- [ ] Check all commission calculations work
- [ ] Verify reports generate correctly
- [ ] Confirm no TypeScript errors
- [ ] Test in staging environment
- [ ] Update API documentation
- [ ] Remove v1 API endpoints from docs

### 13.9 Post-Cleanup Monitoring
```typescript
// Add temporary logging to catch any missed v1 references
class CommissionService {
  constructor() {
    // Log warning if v1 methods called
    if (typeof this.calculateV1 === 'function') {
      console.error('WARNING: V1 commission method still exists')
    }
  }
}

// Monitor for 1 week after cleanup
// Remove monitoring code after confirmation
```

### 13.10 Documentation Updates
- [ ] Update `/docs/schema.md` - remove CommissionTier model
- [ ] Update `/docs/COMMISSION_MODULE_DESIGN.md` - mark as v2 only
- [ ] Update README - remove v1 commission references
- [ ] Archive v1 migration guides
- [ ] Create "Commission System Architecture" doc for v2

### Important Notes:
1. **DO NOT rush this phase** - Wait until v2 is proven stable
2. **Keep archives** - Don't delete v1 data, archive it
3. **Gradual removal** - Can be done over multiple deployments
4. **Communication** - Notify team before cleanup
5. **Backup everything** - Full database backup before any drops

### Cleanup Benefits:
- **Simpler codebase**: Remove ~30% of commission-related code
- **Cleaner schema**: Remove confusion between v1 and v2
- **Better performance**: Remove parallel calculation overhead
- **Reduced complexity**: Single commission system to maintain
- **Clear architecture**: Organizations → Profiles → Tiers (no legacy paths)

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# 1. Switch feature flag
COMMISSION_VERSION=v1

# 2. Restart application
railway restart
```

### Database Rollback (< 30 minutes)
```sql
-- Remove profile assignments but keep profiles
UPDATE users SET commission_profile_id = NULL;

-- Revert to v1 calculation method
UPDATE organizations SET commission_method = 'PROGRESSIVE';
```

### Complete Rollback (< 1 hour)
```bash
# 1. Restore from backup
railway run npx prisma migrate reset --skip-seed

# 2. Apply migrations up to v1
railway run npx prisma migrate deploy

# 3. Restore data from backup
railway run npm run restore-backup
```

---

## Success Criteria

### Functional
- [ ] All v1 calculations match v2 for existing setups
- [ ] Flat fee calculations work correctly
- [ ] Hybrid calculations work correctly
- [ ] Profile assignment works for all trainers
- [ ] Migration completes without data loss

### Performance
- [ ] Calculations complete in < 10s for 1000 trainers
- [ ] No degradation in page load times
- [ ] Database queries optimized with indexes
- [ ] Memory usage stable under load

### Quality
- [ ] Zero critical bugs in production
- [ ] Test coverage > 80%
- [ ] No TypeScript errors
- [ ] All documentation updated

### Business
- [ ] Organizations can create custom profiles
- [ ] Support for flat fee contractors
- [ ] Audit trail for all calculations
- [ ] No disruption to payroll process

---

## Risk Mitigation

### High Risks
1. **Calculation Errors**
   - Mitigation: Parallel run with v1, extensive testing
   - Fallback: Immediate feature flag switch

2. **Data Loss**
   - Mitigation: Comprehensive backups, idempotent migrations
   - Fallback: Restore from backup

3. **Performance Issues**
   - Mitigation: Load testing, gradual rollout
   - Fallback: Scale database, optimize queries

### Medium Risks
1. **User Confusion**
   - Mitigation: Training materials, gradual rollout
   - Resolution: Support documentation, video guides

2. **Integration Issues**
   - Mitigation: Keep v1 compatibility
   - Resolution: API versioning

---

## Timeline Summary

- **Week 1**: Phase 0-2 (Preparation, Schema, Migration)
- **Week 2**: Phase 3-4 (Calculation Engine, Feature Flags)  
- **Week 3**: Phase 5-6 (Admin UI)
- **Week 4**: Phase 7-9 (Reports, API, Testing)
- **Week 5**: Phase 10-12 (Documentation, Deployment)
- **Week 6**: Monitor production (no new development)
- **Week 7**: Phase 13 (Database Cleanup - if stable)

Total: 5 weeks development + 2 weeks stabilization/cleanup

---

## Checklist Before Production

### Code Quality
- [ ] All tests passing
- [ ] TypeScript strict mode clean
- [ ] No console.logs in production code
- [ ] Code reviewed by team
- [ ] Security review completed

### Documentation
- [ ] Technical docs updated
- [ ] User guides created
- [ ] API docs complete
- [ ] Changelog updated

### Infrastructure
- [ ] Database indexes created
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backups verified

### Business
- [ ] Stakeholders informed
- [ ] Training scheduled
- [ ] Support team briefed
- [ ] Rollback plan approved

---

## Post-Launch Monitoring (First Week)

### Daily Checks
- [ ] Calculation accuracy
- [ ] Error rates
- [ ] Performance metrics
- [ ] User feedback

### Weekly Review
- [ ] Discrepancy report
- [ ] Performance analysis
- [ ] User adoption metrics
- [ ] Issue prioritization

---

## Notes & Considerations

1. **Never modify production directly** - All changes through migrations
2. **Keep v1 running** until 100% confident in v2
3. **Document everything** - Future developers need to understand both systems
4. **Test with real data** - Use production-like data in staging
5. **Communication is key** - Keep all stakeholders informed

## Dependencies
- Existing commission system must remain functional
- No changes to session/package tracking
- Prisma migrations must be tested thoroughly
- Railway deployment pipeline must be working

## Definition of Done
- [ ] All tests passing (unit, integration, E2E)
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Deployed to production successfully
- [ ] Monitoring in place
- [ ] No critical bugs for 1 week
- [ ] V1 system can be safely deprecated

---

## Phase 13: Database Cleanup (Post-Stabilization)

**Prerequisites:** V2 system stable for 30+ days with no rollbacks

### Step 1: Archive V1 Data
```sql
-- Create archive tables for historical reference
CREATE TABLE archived_commission_tiers AS 
SELECT *, NOW() as archived_at 
FROM commission_tiers;

CREATE TABLE archived_organization_commission_settings AS
SELECT id, commission_method, NOW() as archived_at 
FROM organizations;
```

### Step 2: Remove V1 Feature Flags
```typescript
// Remove from lib/featureFlags.ts
export const COMMISSION_V2_ENABLED = true; // Remove this line
export const COMMISSION_PARALLEL_MODE = false; // Remove this line

// Clean up all conditional code checking these flags
```

### Step 3: Database Migration - Remove V1 Fields
```sql
-- Migration: 20XX_remove_v1_commission_fields.sql
DO $$
BEGIN
    -- Remove commission_method from organizations
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'commission_method'
    ) THEN
        ALTER TABLE organizations DROP COLUMN commission_method;
    END IF;
    
    -- Drop commission_tiers table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'commission_tiers'
    ) THEN
        DROP TABLE commission_tiers CASCADE;
    END IF;
END $$;
```

### Step 4: Code Cleanup
- [ ] Remove `/lib/commission/legacy/` directory
- [ ] Remove V1 calculation functions
- [ ] Remove parallel calculation code
- [ ] Remove V1 API endpoints
- [ ] Update all imports
- [ ] Remove V1 types from TypeScript definitions

### Step 5: Update All Queries
```typescript
// Before cleanup
const org = await prisma.organization.findUnique({
  where: { id },
  include: {
    commissionTiers: true, // Remove this
    commissionProfiles: true
  }
});

// After cleanup
const org = await prisma.organization.findUnique({
  where: { id },
  include: {
    commissionProfiles: true
  }
});
```

### Step 6: Final Testing
- [ ] Run full test suite
- [ ] Test all commission calculations
- [ ] Verify payroll reports
- [ ] Check all trainer dashboards
- [ ] Validate admin interfaces

### Step 7: Documentation Updates
- [ ] Update API documentation
- [ ] Update database schema docs
- [ ] Remove V1 references from user guides
- [ ] Archive V1 documentation for reference

### Cleanup Checklist
- [ ] V1 data archived
- [ ] Feature flags removed
- [ ] Database fields dropped
- [ ] V1 code removed
- [ ] All imports updated
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No references to `commissionMethod` in codebase
- [ ] No references to `commission_tiers` table
- [ ] Archive backup created and stored securely

### Rollback Considerations
- Keep archive tables for 90 days minimum
- Document V1 → V2 data mapping for potential recovery
- Maintain V1 calculation logic in archived repository branch

### Success Metrics
- Zero commission calculation errors post-cleanup
- All organizations successfully using profiles
- No performance degradation
- Clean codebase with no V1 remnants