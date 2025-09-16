# Task 18: Migrate Wood Square Data to Organization

**Complexity: 2/10**  
**Priority: CRITICAL (SaaS Foundation)**  
**Status: Not Started**  
**Dependencies: Task 17 (organizationId fields)**  
**Estimated Time: 1 hour**

## Objective
Create and run a data migration script to assign all existing data to Wood Square Fitness organization.

## Implementation Checklist

### Create Migration Script
- [ ] Create `/scripts/migrate-to-organization.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

async function migrateToOrganization() {
  const prisma = new PrismaClient()
  
  // 1. Create Wood Square organization
  const woodSquare = await prisma.organization.create({
    data: {
      name: 'Wood Square Fitness',
      email: 'admin@woodsquarefitness.com',
      subscriptionTier: 'PRO',
      subscriptionStatus: 'ACTIVE'
    }
  })
  
  // 2. Update all users
  await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: woodSquare.id }
  })
  
  // 3. Update all locations
  await prisma.location.updateMany({
    where: { organizationId: null },
    data: { organizationId: woodSquare.id }
  })
  
  // 4. Update all commission tiers
  await prisma.commissionTier.updateMany({
    where: { organizationId: null },
    data: { organizationId: woodSquare.id }
  })
  
  // 5. Update all package templates
  await prisma.packageTemplate.updateMany({
    where: { organizationId: null },
    data: { organizationId: woodSquare.id }
  })
  
  console.log('Migration completed!')
}
```

### Add Package.json Script
- [ ] Add to package.json:
```json
"scripts": {
  "migrate:organization": "tsx scripts/migrate-to-organization.ts"
}
```

### Run Migration
- [ ] Run `npm run migrate:organization`
- [ ] Verify all records updated
- [ ] Check no null organizationId values remain

### Verify Data Integrity
- [ ] Check user count matches
- [ ] Check location count matches
- [ ] Check commission tiers migrated
- [ ] Check package templates migrated
- [ ] Verify in Prisma Studio

### Update Seed Script
- [ ] Modify `/prisma/seed.ts`:
  - [ ] Create organization first
  - [ ] Link all seed data to organization
  - [ ] Test seed script works

### Create Rollback Script (Safety)
- [ ] Create `/scripts/rollback-organization.ts`
- [ ] Sets all organizationId to null
- [ ] Deletes organizations
- [ ] Keep but don't run unless needed

## Validation Queries
```sql
-- Check for any unmigrated data
SELECT COUNT(*) FROM users WHERE "organizationId" IS NULL;
SELECT COUNT(*) FROM locations WHERE "organizationId" IS NULL;
SELECT COUNT(*) FROM commission_tiers WHERE "organizationId" IS NULL;
SELECT COUNT(*) FROM package_templates WHERE "organizationId" IS NULL;
```

## Acceptance Criteria
- [ ] Wood Square organization exists
- [ ] All users linked to organization
- [ ] All locations linked to organization
- [ ] All commission tiers linked
- [ ] All package templates linked
- [ ] No orphaned data
- [ ] App still functions normally

## Testing
- [ ] Run migration script
- [ ] Verify counts in database
- [ ] Test login still works
- [ ] Test creating new records
- [ ] Verify seed script works

## Production Migration Plan
1. Backup database
2. Run migration in staging
3. Verify staging works
4. Run migration in production
5. Monitor for issues

## Notes
- This is a one-time migration
- Keep script for reference
- After this, make organizationId required (Task 20)