# Task 40: Multi-Location Access Edge Cases & Solutions

## Overview
This document outlines edge cases in the multi-location access system and provides strategies for handling them properly.

## Edge Cases Analysis & Solutions

### 0. Database Cleanup - Migrate from Old Location System

**Current State:**
- Still have `locationId` field on User model (old single-location system)
- New `UserLocation` junction table for multi-location support
- Code checks both systems for backward compatibility
- Creates complexity and potential for bugs

**Risks & Mitigation:**

| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| Data Loss | Users lose location access | 1. Pre-migration backup<br>2. Verification script<br>3. Rollback plan |
| Missing Edge Cases | Some users not migrated | Full audit before migration<br>Count verification |
| Broken Queries | App failures | Staged rollout<br>Feature flag for new system |
| Performance Impact | Slow migration on large dataset | Batch processing<br>Off-peak execution |
| Orphaned References | Broken foreign keys | Referential integrity checks |

**Detailed Migration Plan:**

```typescript
// STEP 1: Audit Current State
async function auditLocationData() {
  const stats = {
    totalUsers: 0,
    usersWithOldLocation: 0,
    usersWithNewLocation: 0,
    usersWithBoth: 0,
    usersWithNeither: 0,
    conflicts: []
  }
  
  const users = await prisma.user.findMany({
    include: { locations: true }
  })
  
  for (const user of users) {
    stats.totalUsers++
    const hasOld = user.locationId !== null
    const hasNew = user.locations.length > 0
    
    if (hasOld && hasNew) {
      stats.usersWithBoth++
      // Check for conflicts
      if (!user.locations.some(l => l.locationId === user.locationId)) {
        stats.conflicts.push({
          userId: user.id,
          oldLocation: user.locationId,
          newLocations: user.locations.map(l => l.locationId)
        })
      }
    } else if (hasOld) {
      stats.usersWithOldLocation++
    } else if (hasNew) {
      stats.usersWithNewLocation++
    } else {
      stats.usersWithNeither++
    }
  }
  
  return stats
}

// STEP 2: Migration with Transaction
async function migrateLocationData() {
  return await prisma.$transaction(async (tx) => {
    // Get users who need migration
    const usersToMigrate = await tx.user.findMany({
      where: {
        locationId: { not: null },
        locations: { none: {} }
      }
    })
    
    console.log(`Found ${usersToMigrate.length} users to migrate`)
    
    // Batch create UserLocation records
    const records = usersToMigrate.map(user => ({
      userId: user.id,
      locationId: user.locationId!
    }))
    
    const result = await tx.userLocation.createMany({
      data: records,
      skipDuplicates: true
    })
    
    console.log(`Created ${result.count} UserLocation records`)
    return result
  })
}

// STEP 3: Verification
async function verifyMigration() {
  const issues = []
  
  // Check all users with old locationId have corresponding UserLocation
  const usersWithOldLocation = await prisma.user.findMany({
    where: { locationId: { not: null } },
    include: { locations: true }
  })
  
  for (const user of usersWithOldLocation) {
    const hasMatchingNew = user.locations.some(
      l => l.locationId === user.locationId
    )
    if (!hasMatchingNew) {
      issues.push({
        userId: user.id,
        issue: 'Missing UserLocation record',
        oldLocationId: user.locationId
      })
    }
  }
  
  return {
    success: issues.length === 0,
    issues
  }
}

// STEP 4: Code Update Checklist
```

**Code Files to Update (Comprehensive Analysis):**

**Core Helper Library:**
```
[ ] /src/lib/user-locations.ts - Remove backward compatibility (lines 28-31)
```

**API Routes - Remove OR conditions and old locationId checks:**
```
[ ] /src/app/api/sessions/route.ts - Remove user.locationId check
[ ] /src/app/api/sessions/list/route.ts - Use UserLocation only
[ ] /src/app/api/clients/route.ts - Remove locationId fallbacks
[ ] /src/app/api/clients/[id]/route.ts - Update location checks
[ ] /src/app/api/clients/list/route.ts - Use UserLocation only
[ ] /src/app/api/clients/import/route.ts - Update import logic
[ ] /src/app/api/users/route.ts - Remove locationId validation
[ ] /src/app/api/users/[id]/route.ts - Update user queries
[ ] /src/app/api/users/list/route.ts - Use UserLocation only
[ ] /src/app/api/packages/route.ts - Update location filtering
[ ] /src/app/api/packages/[id]/route.ts - Update access checks
[ ] /src/app/api/packages/list/route.ts - Use UserLocation only
[ ] /src/app/api/dashboard/route.ts - Remove locationId from queries
[ ] /src/app/api/locations/route.ts - Remove user.locationId check
[ ] /src/app/api/locations/[id]/route.ts - Update access validation
[ ] /src/app/api/commission/route.ts - Remove locationId checks
[ ] /src/app/api/commission/export/route.ts - Update queries
[ ] /src/app/api/trainers/[id]/sessions/route.ts - Update filters
[ ] /src/app/api/invitations/accept/route.ts - Remove locationId assignment
[ ] /src/app/api/auth/signup/route.ts - Remove locationId field
[ ] /src/app/api/auth/google-org-setup/route.ts - Update user creation
```

**Frontend Pages:**
```
[ ] /src/app/(authenticated)/sessions/new/page.tsx - Update queries
[ ] /src/app/(authenticated)/sessions/page.tsx - Update filters
[ ] /src/app/(authenticated)/clients/page.tsx - Update location checks
[ ] /src/app/(authenticated)/clients/new/page.tsx - Update defaults
[ ] /src/app/(authenticated)/clients/[id]/edit/page.tsx - Update form
[ ] /src/app/(authenticated)/packages/page.tsx - Update filters
[ ] /src/app/(authenticated)/packages/new/page.tsx - Update defaults
[ ] /src/app/(authenticated)/packages/[id]/page.tsx - Update queries
[ ] /src/app/(authenticated)/packages/[id]/edit/page.tsx - Update form
[ ] /src/app/(authenticated)/users/page.tsx - Update location display
[ ] /src/app/(authenticated)/users/[id]/edit/page.tsx - Update form
[ ] /src/app/(authenticated)/locations/[id]/page.tsx - Update queries
[ ] /src/app/(authenticated)/commission/page.tsx - Update location filters
```

**Components:**
```
[ ] /src/components/users/UserForm.tsx - Remove locationId fallback (line 1)
[ ] /src/components/users/UserTable.tsx - Update location display
[ ] /src/components/users/UserSearch.tsx - Update search logic
[ ] /src/components/clients/ClientForm.tsx - Update location handling
[ ] /src/components/clients/ClientImportForm.tsx - Remove locationId column
[ ] /src/components/sessions/SessionForm.tsx - Update trainer queries
[ ] /src/components/dashboard/AdminDashboard.tsx - Update queries
[ ] /src/components/dashboard/DashboardWrapper.tsx - Update logic
[ ] /src/components/dashboard/ManagerDashboard.tsx - Update queries
[ ] /src/components/commission/CommissionDashboard.tsx - Update filters
[ ] /src/components/commission/CommissionDashboardSimple.tsx - Update queries
[ ] /src/components/onboarding/steps/DemoStep.tsx - Remove locationId usage
```

**Utilities & Types:**
```
[ ] /src/lib/commission/calculator.ts - Update location logic
[ ] /src/lib/invitation-service.ts - Remove locationId handling
[ ] /src/types/next-auth.d.ts - Remove locationId from session type
```

**Test/Seed/Migration Scripts (Lower Priority):**
```
[ ] /src/app/api/reset-staging-db/route.ts - Update schema
[ ] /src/app/api/reset-staging-db-safe/route.ts - Update schema
[ ] /src/app/api/reset-staging-accurate/route.ts - Update schema
[ ] /src/app/api/seed-staging/route.ts - Update seed data
[ ] /src/app/api/migrate-production/route.ts - Update migration
[ ] /src/app/api/super-admin/import-clone/route.ts - Remove locationId mapping
[ ] /src/app/api/create-admin/route.ts - Update admin creation
[ ] /src/app/api/check-users/route.ts - Update user checks
```

**Total Files to Update: ~50 files**

**Rollback Plan:**
1. Keep backup of production database before migration
2. Keep old code in a feature branch
3. Use feature flag to switch between old/new system:
```typescript
const USE_NEW_LOCATION_SYSTEM = process.env.USE_NEW_LOCATION_SYSTEM === 'true'

const userLocations = USE_NEW_LOCATION_SYSTEM 
  ? user.locations.map(l => l.locationId)
  : [user.locationId].filter(Boolean)
```

**Testing Strategy:**
```
[ ] Unit tests for migration scripts
[ ] Test migration on copy of production data
[ ] Test all location-based features after migration:
    - User creation/editing
    - Session creation
    - Client assignment
    - Location-based filtering
    - Multi-location assignment
    - Invitation flow
[ ] Performance testing with production data volume
[ ] Rollback testing
```

**Success Criteria:**
- Zero users lose location access
- All queries perform same or better
- No broken features
- Clean codebase with single location system

---

### 1. User with No Locations Assigned

**Current Behavior:**
- Users can exist without location assignments
- System has fallbacks but behavior is inconsistent
- Trainers see only directly assigned clients
- Managers see empty lists

**Problems:**
- Inconsistent user experience
- Potential for "orphaned" users who can't access anything
- No clear onboarding path

**Solution Strategy:**
```
[ ] Enforce location assignment during user creation (except ADMIN)
[ ] Add validation in UserForm to require at least one location for non-admins
[ ] Add database constraint or application-level check
[ ] Create onboarding flow for users without locations
[ ] Add warning banner for users with no location access
```

**Implementation:**
- Modify `/src/components/users/UserForm.tsx` to require location selection
- Add middleware check to redirect users without locations to an assignment page
- Add banner component to notify users they need location assignment

---

### 2. Removing Location Access from Primary Trainer

**Current Behavior:**
- Trainer remains primary in database
- Loses visibility of clients in UI
- Cannot create new sessions
- No warning or reassignment flow

**Problems:**
- Data inconsistency
- Clients effectively "orphaned" from trainer's perspective
- No notification to affected parties

**Solution Strategy:**
```
[ ] Add warning dialog when removing location access or archiving trainer
[ ] Show count of affected clients where trainer is primary
[ ] Offer reassignment flow in the removal dialog:
    - Select new trainer from same location
    - Bulk reassign all affected clients
    - Option to proceed without reassignment
[ ] Create audit log of changes
[ ] No client notifications needed (per business requirement)
```

**Implementation Plan:**
1. Create helper function to check affected clients:
```typescript
async function getAffectedClients(userId: string, locationId: string) {
  return prisma.client.findMany({
    where: {
      primaryTrainerId: userId,
      locationId: locationId
    }
  })
}
```

2. Add confirmation dialog in location removal flow
3. Implement bulk reassignment endpoint
4. Add audit logging for trainer changes

---

### 3. PT Manager Location Restrictions

**Current Behavior:**
- Restriction = not having access (working as intended)
- System properly scopes data based on accessible locations

**Solution Strategy:**
```
✅ Already properly implemented
[ ] Document this behavior clearly in user guides
[ ] Add role-specific help text in UI
```

---

### 4. Location Deletion with Active Users

**Current Behavior:**
- `UserLocation` records cascade delete (good)
- Old `locationId` field becomes orphaned (bad)
- No warning about affected users
- Potential foreign key constraint failures

**Problems:**
- Data integrity issues
- Users suddenly lose access without warning
- Clients and sessions orphaned

**Solution Strategy:**
```
[ ] Implement soft delete for locations (add 'archivedAt' field)
[ ] When archiving, show warning if location has:
    - Active trainers/users
    - Active clients  
    - Recent sessions
[ ] Allow proceeding with archive despite warnings
[ ] Add UI for managing archived locations:
    - Show/hide archived locations toggle
    - Unarchive functionality
    - Archived locations shown differently (grayed out)
[ ] Create dedicated archived locations view
```

**Implementation:**
1. Add migration for soft delete:
```sql
ALTER TABLE locations ADD COLUMN "archivedAt" TIMESTAMP;
ALTER TABLE locations ADD COLUMN "archivedBy" VARCHAR(255);
```

2. Update Settings > Locations page:
   - Add "Show Archived" toggle button
   - Display archived locations in separate section or grayed out
   - Add "Archive" and "Unarchive" actions
   - Show archive date and who archived it

3. Archive Warning Dialog:
   - Display counts: "This location has X active trainers and Y clients"
   - Checkbox options for understanding impact
   - Proceed or Cancel buttons

4. Update all queries to exclude archived locations by default:
```typescript
// Default query
where: { 
  archivedAt: null,
  ...otherConditions 
}

// When showing archived
where: includeArchived ? {} : { archivedAt: null }
```

---

### 5. Bulk Import with Location Assignments

**Current Behavior:**
- Only single location assignment supported
- No multi-location import capability

**Solution Strategy:**
```
[ ] Extend CSV format to support multiple locations
[ ] Add location validation during import
[ ] Create location assignment preview
[ ] Support location creation during import (admin only)
```

**CSV Format Options:**
```csv
Option 1: Pipe-separated locations
name,email,locations
"John Doe","john@example.com","Location A|Location B|Location C"

Option 2: Separate location columns
name,email,location1,location2,location3
"John Doe","john@example.com","Location A","Location B","Location C"
```

**Implementation:**
- Update import parser to handle multiple locations
- Add location mapping UI in import wizard
- Validate all locations exist before import
- Create junction table records during import

---

### 6. Trainer Reassignment Impact

**Current Behavior:**
- No warning when trainer loses access
- Clients remain assigned but inaccessible
- No reassignment workflow

**Solution Strategy:**
```
[ ] Create reassignment wizard when removing access
[ ] Implement bulk reassignment API
[ ] Add notification system for affected parties
[ ] Create orphaned client report for admins
[ ] Add "pending reassignment" status
```

**Reassignment Flow:**
1. Detect affected clients when removing location access
2. Present options:
   - Auto-reassign to another trainer at location
   - Mark for manual reassignment
   - Remove trainer assignment
3. Execute reassignment with audit trail
4. Send notifications

---

### 7. Cross-Location Sessions

**Current Behavior:**
- Sessions tied to client's location (correct)
- Trainer must have access to client's location

**Solution Strategy:**
```
✅ Current implementation is correct
[ ] Add clear error messages when trainer lacks location access
[ ] Document this business rule clearly
```

---

## Implementation Priority

### Phase 0: Database Cleanup (Immediate - 3-4 days)

**Day 1: Preparation & Audit**
- [ ] Run audit script on staging and production
- [ ] Document all conflicts and edge cases
- [ ] Create backup of production database
- [ ] Set up feature flag infrastructure

**Day 2: Staging Migration**
- [ ] Run migration script on staging
- [ ] Run verification script
- [ ] Test all features with new system only
- [ ] Fix any issues found

**Day 3: Code Cleanup**
- [ ] Update all queries to use UserLocation only
- [ ] Remove backward compatibility code
- [ ] Deploy to staging with feature flag ON
- [ ] Full regression testing

**Day 4: Production Migration**
- [ ] Run migration during off-peak hours
- [ ] Monitor for errors
- [ ] Gradual feature flag rollout (10% → 50% → 100%)
- [ ] Keep monitoring for 24 hours

**Day 5: Finalization**
- [ ] Create migration to drop locationId column
- [ ] Deploy final cleanup
- [ ] Remove feature flags

### Phase 1: Critical Data Integrity (Week 1)
1. Enforce location assignment for non-admin users
2. Add warnings when removing location access affects clients
3. Implement soft delete for locations

### Phase 2: User Experience (Week 2)
4. Create reassignment workflows
5. Add warning dialogs and confirmations
6. Improve error messages

### Phase 3: Advanced Features (Week 3)
7. Bulk import with multi-location support
8. Orphaned client reports
9. Audit trail enhancements

---

## Database Schema Changes Needed

```prisma
// Add to Location model
model Location {
  // ... existing fields
  archivedAt   DateTime?
  archivedBy   String?     // User ID who archived the location
  
  @@index([archivedAt])
}

// Add to Client model for reassignment tracking
model Client {
  // ... existing fields
  reassignmentPendingSince DateTime?
  previousTrainerId        String?
}

// New audit model for trainer changes
model TrainerChangeLog {
  id              String   @id @default(cuid())
  clientId        String
  fromTrainerId   String?
  toTrainerId     String?
  reason          String   // "location_access_removed", "manual_reassignment", etc.
  performedBy     String
  createdAt       DateTime @default(now())
  
  @@index([clientId])
  @@index([fromTrainerId])
  @@index([toTrainerId])
}
```

---

## API Endpoints Needed

### Check Location Removal Impact
```
GET /api/locations/[id]/removal-impact
Response: {
  affectedUsers: number,
  affectedClients: number,
  recentSessions: number,
  canDelete: boolean,
  warnings: string[]
}
```

### Bulk Reassign Clients
```
POST /api/clients/bulk-reassign
Body: {
  fromTrainerId: string,
  toTrainerId: string,
  clientIds: string[],
  reason: string
}
```

### Archive Location
```
POST /api/locations/[id]/archive
Response: {
  success: boolean,
  archivedAt: DateTime,
  warnings: string[]  // "Has X active trainers", etc.
}
```

### Unarchive Location
```
POST /api/locations/[id]/unarchive
Response: {
  success: boolean,
  location: Location
}
```

### Get Locations (with archived option)
```
GET /api/locations?includeArchived=true
Response: {
  locations: Location[],
  archivedLocations: Location[]  // Separated for easier UI rendering
}
```

---

## UI Components Needed

1. **Location Archive Warning Dialog**
   - Shows counts of affected users and clients
   - Lists warnings but allows proceeding
   - Archive confirmation with understanding checkbox
   - Shows who will be affected

2. **Trainer Removal/Archive Dialog with Reassignment**
   - Shows clients where trainer is primary
   - Dropdown to select replacement trainer
   - Option to bulk reassign all at once
   - Option to proceed without reassignment
   - Shows location compatibility

3. **Archived Locations Management (Settings > Locations)**
   - Toggle button: "Show Archived Locations"
   - Archived locations shown grayed out or in separate section
   - Archive/Unarchive action buttons
   - Display archive date and archived by user
   - Filter/sort options for archived locations

4. **No Location Access Banner**
   - Warns users without location access
   - Links to request access or contact admin

5. **Orphaned Client Report**
   - Admin-only view
   - Shows clients whose trainer lost access
   - Bulk reassignment actions

---

## Testing Requirements

### Test Scenarios:
1. Create user without location → should fail for non-admin
2. Remove location access → should warn and offer reassignment
3. Delete location with active users → should soft delete
4. Import users with multiple locations → should assign all
5. Trainer loses access → clients should be flagged for reassignment

### Edge Case Tests:
- User with only one location cannot remove it
- Admin can exist without locations
- Soft deleted locations don't appear in dropdowns
- Reassignment maintains session history
- Audit trail captures all changes

---

## Success Metrics

- Zero orphaned clients (clients with trainers who can't access them)
- All non-admin users have at least one location
- No data loss from location deletion
- Clear audit trail of all access changes
- Reduced support tickets about access issues

---

## Next Steps

1. Review and approve strategy with team
2. Create subtasks for each implementation phase
3. Update test plans
4. Begin Phase 1 implementation
5. Monitor for additional edge cases in production

---

## Notes

- Consider future multi-tenant scenarios
- Plan for location hierarchies (regions > locations)
- Consider temporary location access for substitutes
- Think about location-based permissions beyond access