# Task 39: Multi-Location Access for Trainers and PT Managers

## Context
**Single Organization Production Data**
- One company (your Snap Fitness franchise)
- You are the sole developer
- Have production backups
- Can tolerate brief downtime if needed

## Risk Level: MODERATE
- Complexity: 8/10
- Data Risk: Low (adding tables, not modifying existing)
- Business Impact: Manageable (single organization)
- Recovery: Easy (have backups, can rollback)

## Recommended Approach: Two-Phase Migration
Since you have:
- Full control of the system
- Backups available
- Only one organization affected
- Ability to fix issues immediately

**Phase 1: Parallel Systems (Current Task)**
1. Add junction table alongside existing locationId
2. Update all queries to check BOTH systems
3. Test thoroughly in staging
4. Deploy to production
5. Monitor for issues

**Phase 2: Remove Legacy Field (Future Task)**
1. Verify all data migrated correctly
2. Confirm all features working with junction table
3. Remove locationId field from User model
4. Update queries to ONLY use junction table
5. Deploy removal migration

## Problem Statement
Currently, users (trainers/PT managers) can only be assigned to a single location. This is too restrictive because:
- PT Managers need to oversee trainers across ALL locations in their organization
- Trainers often work at multiple gym locations
- The import function doesn't show PT Managers/trainers who aren't assigned to the specific location
- **Real-world example**: A Chinese-speaking trainer at Location A needs to be assignable to Chinese-speaking clients at Location B

## Requirements
1. **Admins**: ONLY role with automatic access to ALL locations (via role-based check)
2. **PT Managers**: Use junction table same as trainers (manage specific regions, NOT all locations)
   - Example: PT Manager A assigned to locations 1-5, PT Manager B assigned to locations 6-10
   - NO automatic organization-wide access
3. **Club Managers**: Use junction table (usually one location, could be multiple)
4. **Trainers**: Use junction table (one or multiple locations)
5. **Core Business Rule**: Anyone with access to a location can work with clients at that location
6. **Migration Strategy**:
   - Phase 1: BOTH `locationId` AND `user_locations` table work in parallel
   - Phase 2: Remove `locationId`, use ONLY `user_locations` table
7. **Access Model** (Phase 1):
   - Admins: `role === 'ADMIN'` grants automatic access to all locations
   - Everyone else: Check BOTH `locationId` OR entry in `user_locations` table
8. **Access Model** (Phase 2):
   - Admins: `role === 'ADMIN'` grants automatic access to all locations  
   - Everyone else: Must have explicit entry in `user_locations` table
9. No data loss during migration

## Implementation Overview - What We're Actually Doing

### Phase 1 Steps (Current Task - DO THESE NOW):
1. ✅ Create UserLocation junction table in schema
2. ✅ Create migration that copies all locationId values to junction table
3. ✅ Test migration locally
4. ⬜ Commit and push to staging
5. ⬜ Deploy migration to staging database
6. ⬜ Update API queries to check BOTH locationId AND junction table
7. ⬜ Test that existing features still work
8. ⬜ Build UI to assign multiple locations to users
9. ⬜ Test multi-location features
10. ⬜ Deploy to production

### Phase 2 Steps (Future Task - DO AFTER PHASE 1 IS STABLE):
1. ⬜ Wait 1+ week to ensure Phase 1 is stable
2. ⬜ Verify all data successfully migrated to junction table
3. ⬜ Update ALL queries to use ONLY junction table
4. ⬜ Remove locationId field from schema
5. ⬜ Deploy removal migration
6. ⬜ Monitor and verify

## PHASE 1: Parallel Systems Implementation

### Step 0: Pre-Migration Preparation

**Quick Safety Checks:**

1. **Take Production Backup**:
```bash
# Simple backup
DATABASE_URL="postgresql://[PROD_URL]:44961/railway" pg_dump > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Note Current Numbers** (for verification):
```sql
-- Quick check of what we're migrating
SELECT role, COUNT(*) FROM users WHERE "locationId" IS NOT NULL GROUP BY role;
```

3. **Have Rollback Ready**:
```sql
-- If something goes wrong
DROP TABLE IF EXISTS user_locations CASCADE;
```

### Step 1: Create Database Schema Changes
**Files to modify:**
- `/prisma/schema.prisma`

**Actions:**
1. Add new UserLocation model (junction table):
```prisma
model UserLocation {
  id          String   @id @default(cuid())
  userId      String
  locationId  String
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  @@unique([userId, locationId])
  @@map("user_locations")
}
```

2. Update User model to add relation:
```prisma
  locations        UserLocation[]  // Many-to-many via junction table
```

3. Update Location model to add relation:
```prisma
  userAccess       UserLocation[]  // Users with access to this location
```

4. **IMPORTANT**: Keep existing `locationId` field in User model (DO NOT REMOVE YET)

### Step 2: Create Migration with Safety Checks

**Add safety validations to migration:**
```sql
-- Start transaction
BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS user_locations ...;

-- Verify table created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_locations') THEN
    RAISE EXCEPTION 'Table creation failed';
  END IF;
END $$;

-- Copy data with validation
INSERT INTO user_locations ...;

-- Verify data copied correctly
DO $$
DECLARE
  original_count INTEGER;
  copied_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM users WHERE "locationId" IS NOT NULL AND role != 'ADMIN';
  SELECT COUNT(*) INTO copied_count FROM user_locations;
  
  IF original_count != copied_count THEN
    RAISE EXCEPTION 'Data copy mismatch: % original vs % copied', original_count, copied_count;
  END IF;
END $$;

-- If we get here, commit
COMMIT;
```

### Step 3: Staged Migration Execution (Following MIGRATION-WORKFLOW.md)
**CRITICAL**: Follow the 3-stage migration process

#### Phase 1: Local Development (Port 24951):
```bash
# Create migration locally
npm run migrate:dev -- --name add-user-location-junction

# Verify with Prisma Studio
npm run studio

# Test thoroughly locally
```

#### Phase 2: Staging Deployment (Port 24999):
```bash
# Push to staging branch
git checkout staging
git merge feature/multi-location-access
git push origin staging

# Apply to staging database
DATABASE_URL="[STAGING_DATABASE_URL]" npx prisma migrate deploy

# Verify staging
DATABASE_URL="[STAGING_DATABASE_URL]" npx prisma migrate status
```

#### Phase 3: Production Deployment (Port 44961):
```bash
# ONLY after staging verification
git checkout main
git merge staging
git push origin main

# Apply to production (BE VERY CAREFUL - REAL DATA)
DATABASE_URL="postgresql://[PROD_URL]:44961/railway" npx prisma migrate deploy

# Verify production
DATABASE_URL="postgresql://[PROD_URL]:44961/railway" npx prisma migrate status
```

**Migration should:**
1. Create user_locations table
2. Copy existing user.locationId data to user_locations table (via SQL in migration)
3. Maintain existing locationId field for backward compatibility

### Step 3: Create Data Migration
**The migration SQL should include:**
```sql
-- Copy existing location assignments to junction table
-- For ALL users with a location (including PT Managers, Club Managers, Trainers)
INSERT INTO user_locations (id, "userId", "locationId", "createdAt")
SELECT 
    gen_random_uuid(),
    id as "userId",
    "locationId",
    NOW() as "createdAt"
FROM users
WHERE "locationId" IS NOT NULL
AND role != 'ADMIN';  -- Everyone except Admins needs junction entries

-- Add indexes for performance
CREATE INDEX idx_user_locations_user_id ON user_locations("userId");
CREATE INDEX idx_user_locations_location_id ON user_locations("locationId");
CREATE INDEX idx_user_locations_composite ON user_locations("userId", "locationId");
```

**What this does:**
1. Runs automatically during migration
2. Copies ALL users' locationId to junction table (except ADMIN role)
3. Creates redundancy - data exists in BOTH places
4. Enables parallel operation of both systems

### Step 4: Update Queries to Check BOTH Systems (Parallel Operation)
**Files to modify:**
- `/src/app/api/users/list/route.ts`
- `/src/app/api/users/[id]/route.ts`
- `/src/app/api/clients/import/route.ts`

**Changes:**
1. When fetching trainers, include UserLocation relations:
```typescript
const trainers = await prisma.user.findMany({
  where: {
    role: { in: ['TRAINER', 'PT_MANAGER'] },
    active: true,
    organizationId,
    OR: [
      // Check old system (locationId field)
      { locationId: targetLocationId },
      // Check new system (junction table)
      {
        locations: {
          some: {
            locationId: targetLocationId
          }
        }
      }
    ]
  },
  include: {
    locations: true
  }
})
```

### Step 5: Update Import Form Logic
**Files to modify:**
- `/src/components/clients/ClientImportForm.tsx`
- `/src/app/api/clients/import/route.ts`

**Changes:**
1. Remove location-based filtering for PT Managers (they can be assigned to any client)
2. For trainers, check both primary location AND UserLocation records
3. Update trainer selection dropdown to show all trainers who have access to the client's location
4. Add visual indicator for multi-location trainers (e.g., "Works at multiple locations")
5. **Business Logic**: If client is at Location B, show all trainers who have Location B in their access list

### Step 6: Create Location Management UI
**Files to create:**
- `/src/components/users/UserLocationManager.tsx`

**Files to modify:**
- `/src/app/(authenticated)/users/[id]/edit/page.tsx`

**Features:**
1. **For Admins**: 
   - Display: "Has access to all locations (organization-wide role)"
   - No checkboxes needed - access is automatic
2. **For PT Managers**:
   - Checkbox list of all organization locations
   - Pre-select their managed locations (typically a region/group)
   - Save selections to UserLocation junction table
   - Label: "Managed Locations" (they oversee these locations)
3. **For Club Managers**:
   - Checkbox list (usually just one location, but could be multiple)
   - Save to junction table
   - Label: "Assigned Locations"
4. **For Trainers**: 
   - Checkbox list of locations they can work at
   - Save to junction table
   - Label: "Work Locations"

**UI Logic**:
```typescript
if (user.role === 'ADMIN') {
  return <div>Access to all locations (organization-wide)</div>
} else {
  // PT Managers, Club Managers, and Trainers all use checkboxes
  return <LocationCheckboxes 
    label={getLocationLabel(user.role)} 
    multiple={true}
  />
}
```

### Step 7: Update Session Creation Validation
**Files to modify:**
- `/src/app/api/sessions/route.ts`
- `/src/app/(authenticated)/sessions/new/page.tsx`

**Changes:**
1. When creating a session, validate trainer has access to client's location
2. Check both primary location and UserLocation records
3. PT Managers can create sessions at any location

### Step 8: Update Client Assignment Logic
**Files to modify:**
- `/src/app/(authenticated)/clients/new/page.tsx`
- `/src/app/(authenticated)/clients/[id]/edit/page.tsx`
- `/src/app/api/clients/route.ts`

**Changes:**
1. When selecting primary trainer for a client:
   - Get client's location
   - Show ALL trainers who have access to that location
   - Include PT Managers (they have universal access)
2. Validation: Ensure selected trainer has access to client's location
3. Display: Show trainer's primary location + additional locations

**Example Query:**
```typescript
// Get users available for a client at locationId
const availableTrainers = await prisma.user.findMany({
  where: {
    active: true,
    organizationId,
    OR: [
      { role: 'ADMIN' },  // Admins only - automatic access to all locations
      { 
        // Everyone else (PT_MANAGER, CLUB_MANAGER, TRAINER) needs explicit access
        AND: [
          { role: { in: ['PT_MANAGER', 'TRAINER'] } },  // Can train clients
          {
            OR: [
              { locationId: clientLocationId }, // Primary location
              { 
                locations: {
                  some: { locationId: clientLocationId } // Additional locations via junction
                }
              }
            ]
          }
        ]
      }
    ]
  }
})
```

**Key Principle**: 
- **Role-based access**: PT_MANAGER and ADMIN roles grant universal location access
- **Explicit access**: TRAINER role requires junction table entries

### Step 9: Update Existing Forms and Displays
**Files to modify:**
- `/src/components/users/UserTable.tsx` - Show multiple locations
- `/src/app/(authenticated)/users/[id]/page.tsx` - Display all locations
- `/src/components/sessions/SessionForm.tsx` - Filter trainers by location access

**Changes:**
1. Display comma-separated list of locations for multi-location users
2. Add badge or indicator for users with multiple locations
3. Update filtering logic to consider all user locations

## Practical Checklist

### Before Starting:
- [ ] Production backup taken
- [ ] Note current trainer/location counts
- [ ] Pick a low-usage time (evening/weekend)

### During Migration:
- [ ] Run migration
- [ ] Check junction table has data
- [ ] Quick test with one trainer

### After Migration:
- [ ] Verify trainers still have location access
- [ ] Test client import
- [ ] Test session creation
- [ ] Keep backup for a week

## Migration Stages Checklist (MUST FOLLOW ORDER)

### Stage 1: Local Development (Port 24951)
- [ ] Create migration with `npm run migrate:dev`
- [ ] Verify schema changes in Prisma Studio
- [ ] Test data migration (existing locations copied)
- [ ] Run full application test suite
- [ ] Commit schema.prisma AND migration files

### Stage 2: Staging (Port 24999)
- [ ] Merge to staging branch
- [ ] Apply migration with `prisma migrate deploy`
- [ ] Check migration status
- [ ] Test key scenarios:
  - [ ] PT Manager can be assigned to clients at multiple locations
  - [ ] Trainer with multi-location works correctly
  - [ ] Import function shows correct trainers
  - [ ] Session creation validates locations properly
  - [ ] Existing single-location users still work
- [ ] If all works, proceed to production

### Stage 3: Production (Port 44961)
- [ ] Take backup BEFORE migration
- [ ] Merge staging to main
- [ ] Apply migration with `prisma migrate deploy`
- [ ] Verify migration status
- [ ] Test critical flows immediately
- [ ] Monitor logs for 24 hours

## Testing Checklist
- [ ] Existing single-location users still work correctly
- [ ] Can assign trainer to multiple locations via edit form
- [ ] PT Managers show up for all location imports
- [ ] Trainers only show for their assigned locations
- [ ] Session creation validates location access
- [ ] Client import shows correct trainers per location
- [ ] No data loss from existing location assignments
- [ ] Database migration runs without errors
- [ ] Rollback plan tested if migration fails

## Edge Cases to Handle
1. User with no locations assigned (should they see anything?)
2. Removing location access from a trainer who is primary trainer for clients at that location
3. PT Manager explicitly restricted from certain locations
4. Location deleted while users have access to it
5. Bulk operations (importing many users with location assignments)
6. **Trainer reassignment**: What happens to existing client relationships when trainer loses access to a location?
7. **Cross-location sessions**: Can a trainer create sessions for their client at a different location they both have access to?

## PHASE 2: Remove Legacy locationId Field (Future Task)

### Prerequisites
- Phase 1 deployed and stable for at least 1 week
- All features tested and working with junction table
- Verify all users have their locations in junction table
- Production backup taken

### Step 1: Verify Data Migration Complete
```typescript
// Script to verify all locationId values are in junction table
const usersWithLocationId = await prisma.user.findMany({
  where: { locationId: { not: null } }
})

for (const user of usersWithLocationId) {
  const hasJunctionEntry = await prisma.userLocation.findFirst({
    where: { userId: user.id, locationId: user.locationId }
  })
  if (!hasJunctionEntry) {
    console.error(`Missing junction entry for ${user.name}`)
  }
}
```

### Step 2: Update All Queries
Remove all references to `locationId` field, use ONLY junction table:
```typescript
// OLD (Phase 1 - checking both)
OR: [
  { locationId: targetLocationId },
  { locations: { some: { locationId: targetLocationId } } }
]

// NEW (Phase 2 - junction only)
{ locations: { some: { locationId: targetLocationId } } }
```

### Step 3: Create Removal Migration
```bash
npm run migrate -- --name remove-user-location-id
```

Schema change:
```prisma
model User {
  // Remove these lines:
  // locationId      String?
  // location        Location?     @relation(fields: [locationId], references: [id])
  
  // Keep only:
  locations       UserLocation[]  // All locations via junction table
}
```

### Step 4: Deploy Phase 2
1. Test removal migration locally
2. Deploy to staging and verify
3. Deploy to production
4. Monitor for any issues

### Phase 2 Rollback Plan
If issues arise after removing locationId:
1. Revert the code deployment
2. The junction table still has all data
3. Re-add locationId field as nullable
4. Restore locationId values from junction table

## Success Criteria
1. **PT Managers can be assigned to manage specific locations** (NOT all locations automatically)
   - Example: PT Manager A manages locations 1-5, PT Manager B manages locations 6-10
2. **Trainers can be assigned to work at multiple specific locations**
3. **When assigning a primary trainer to a client**: Show all trainers who have access to the client's location
4. **When importing clients**: Can assign any trainer who has access to that client's location
5. **When creating sessions**: Trainer can only create sessions for clients at locations they have access to
6. **Only ADMIN role has automatic access to all locations** (via role-based check)
7. Import function shows appropriate trainers based on location access
8. No breaking changes to existing functionality
9. Clean migration path with no data loss

## Rollback Plan (Per MIGRATION-WORKFLOW.md)

### Before Migration:
```bash
# Backup production data BEFORE migration
DATABASE_URL="[PROD_URL]:44961/railway" pg_dump --data-only > backup_before_multilocation.sql
DATABASE_URL="[PROD_URL]:44961/railway" pg_dump --schema-only > schema_before_multilocation.sql
```

### If Migration Fails:
1. **In Staging**: Fix and retry - DO NOT proceed to production
2. **In Production**: 
   - Check Railway logs for exact error
   - Rollback deployment in Railway dashboard if needed
   - Restore from backup if data affected
   - Document issue for post-mortem

### Rollback Migration:
```bash
# Create a revert migration that drops the junction table
npm run migrate:dev -- --name revert-user-location-junction

# In the migration, add:
DROP TABLE IF EXISTS user_locations;
```

### Feature Flag Approach:
```typescript
// Add environment variable
MULTI_LOCATION_ENABLED=false

// Check in code
if (process.env.MULTI_LOCATION_ENABLED === 'true') {
  // Use new multi-location logic
} else {
  // Use existing single location
}
```

## Notes
- **Performance Consideration**: Junction table adds JOIN operations to queries
  - Impact is minimal for < 1000 users
  - MUST add indexes for larger scale:
    ```sql
    CREATE INDEX idx_user_locations_user_id ON user_locations("userId");
    CREATE INDEX idx_user_locations_location_id ON user_locations("locationId");
    CREATE INDEX idx_user_locations_composite ON user_locations("userId", "locationId");
    ```
  - Consider caching trainer lists if performance becomes an issue
- **Role Hierarchy**:
  - Admin: Organization-wide (no junction entries needed)
  - PT Manager: Regional/multiple locations (junction table)
  - Club Manager: Usually single location (junction table)
  - Trainer: One or multiple locations (junction table)
- **Scalability**: As organization grows, PT Managers can be assigned regions (e.g., North Region = locations 1-5)
- Consider adding "home location" or "primary location" concept for scheduling defaults
- **Business Context**: 
  - Enables specialty trainers (language, expertise) to serve clients across locations
  - Allows PT Managers to effectively manage regions instead of entire organization
- **Key Principle**: Location access determines work eligibility at that location