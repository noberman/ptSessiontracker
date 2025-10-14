# Task 40: Multi-Location Access Edge Cases & Solutions

**Last Updated:** October 2024  
**Current Status:** Multi-location system deployed, edge cases need addressing

## Overview
This document outlines critical edge cases in the multi-location access system and provides implementation strategies. The multi-location junction table (UserLocation) is now the primary system, but several data integrity and UX issues need resolution.

## Current State Assessment

### ✅ What's Already Done:
- UserLocation junction table created and populated
- Application code uses UserLocation exclusively for access checks
- Multi-location UI components functional
- PT Managers and Club Managers can have multiple locations

### ❌ What Still Needs Work:
- Old `locationId` field still exists in schema (but unused by app)
- ~~No safeguards when removing location access from trainers~~ ✅ Completed
- ~~Locations can be hard deleted (no soft delete)~~ ✅ Completed
- ~~No audit trail for access changes~~ ✅ Completed (audit logs implemented)
- ~~Missing validation for location requirements~~ ✅ Completed

## Critical Edge Cases & Solutions

### Priority 1: Data Integrity Issues (IMMEDIATE)

#### 1.1 Users with No Locations Assigned

**Current Problem:**
- Users can exist without ANY location assignments
- No validation or enforcement in place
- These users can't access any data but can still log in
- No clear path to fix their access

**Impact:** High - Creates "zombie" users who are locked out

**Solution:**
```typescript
// Add validation in user creation/update
if (role !== 'ADMIN' && (!locationIds || locationIds.length === 0)) {
  throw new Error('Non-admin users must have at least one location assigned')
}
```

**Implementation Tasks:**
- [x] Add validation to `/api/users/route.ts` POST endpoint
- [x] Add validation to `/api/users/[id]/route.ts` PUT endpoint  
- [x] Add database check constraint or application-level validation
- [ ] Create cleanup script for existing users without locations
- [ ] Add warning banner in UI for affected users

---

#### 1.2 Removing Location Access from Primary Trainers

**Current Problem:**
- When removing a trainer's location access, their assigned clients become orphaned
- No warning system or reassignment flow
- Clients remain in database but are inaccessible to the trainer
- No way to track these orphaned relationships

**Impact:** Critical - Breaks trainer-client relationships

**Solution:**
```typescript
// Check for affected clients before removing access
const affectedClients = await prisma.client.findMany({
  where: {
    primaryTrainerId: trainerId,
    locationId: locationBeingRemoved
  }
})

if (affectedClients.length > 0) {
  // Show warning and offer reassignment
}
```

**Implementation Tasks:**
- [x] Create `/api/users/[id]/clients` endpoint (checks affected clients)
- [x] Build warning dialog component (LocationRemovalDialog)
- [x] Implement bulk reassignment API
- [x] Add audit logging for trainer changes
- [x] Create orphaned client report for admins

---

#### 1.3 Hard Deletion of Locations

**Current Problem:**
- Locations can be permanently deleted via database
- UserLocation records cascade delete, stranding users
- No warning about active users/clients/sessions
- No way to recover deleted locations

**Impact:** Critical - Data loss and access issues

**Solution: Implement Soft Delete**
```prisma
model Location {
  // ... existing fields
  archivedAt    DateTime?
  archivedBy    String?
  archivedReason String?
  
  @@index([archivedAt])
}
```

**Implementation Tasks:**
- [x] Add soft delete fields to Location model (archivedAt, archivedBy)
- [x] Create migration for soft delete columns
- [x] Update all queries to exclude archived by default
- [x] Build archive/unarchive UI in Settings > Locations
- [x] Add archive warning dialog with impact summary
- [x] Implement archive-impact endpoint for dependency checking
- [x] Add restore functionality for archived locations

---

### Priority 2: Database Cleanup (1-2 DAYS)

#### 2.1 Remove Legacy locationId Field

**Current State:**
- `locationId` field exists but is no longer used by application
- 36 references remain across 14 files (mostly compatibility code)
- Can cause confusion and potential bugs

**Simplified Cleanup Plan:**

```typescript
// Step 1: Verify no code depends on locationId
const files = [
  '/src/app/api/users/[id]/route.ts',  // Lines 57-60, 109-111 still check locationId
  '/src/app/api/locations/[id]/route.ts',  // Line 88 checks locationId
  '/src/app/api/super-admin/import-clone/route.ts',  // Uses for cloning
  // ... other files with references
]

// Step 2: Update remaining references to use UserLocation
// Step 3: Create migration to drop column
// Step 4: Deploy and monitor
```

**Files Still Using locationId (Quick Fixes Needed):**
```
[ ] /src/app/api/users/[id]/route.ts - Lines 35, 57-60, 109-111
[ ] /src/app/api/locations/[id]/route.ts - Line 88
[ ] /src/lib/auth.ts - Session type includes locationId
[ ] /src/app/api/super-admin/import-clone/route.ts - Cloning logic
[ ] Total: ~14 files with 36 references (most are read-only for compatibility)
```

**Implementation Tasks:**
- [ ] Update permission checks to use getUserAccessibleLocations()
- [ ] Remove locationId from User type definitions
- [ ] Create migration to drop locationId column
- [ ] Test thoroughly in staging before production
- [ ] Keep backup for rollback if needed

---

### Priority 3: User Experience Improvements (3-5 DAYS)

#### 3.1 Reassignment Workflows

**Gap:** No UI for bulk reassigning clients when trainer loses access

**Solution Components:**
1. **Reassignment Dialog:**
   - Shows affected clients
   - Dropdown to select new trainer
   - Option to bulk reassign or handle individually
   
2. **Audit Trail:**
```prisma
model TrainerChangeLog {
  id              String   @id @default(cuid())
  clientId        String
  fromTrainerId   String?
  toTrainerId     String?
  reason          String   // "location_access_removed", "manual", etc.
  performedBy     String
  createdAt       DateTime @default(now())
}
```

3. **Orphaned Client Report:**
   - Admin dashboard widget
   - Shows clients whose trainers can't access them
   - Quick reassignment actions

---

## New Edge Cases Discovered

### 4.1 Inconsistent Permission Checks
**Problem:** Some APIs still use old locationId for permissions
**Solution:** Standardize all checks to use getUserAccessibleLocations()

### 4.2 Invitation Location Sync
**Problem:** Invitations have locationIds array but may not create UserLocation records properly
**Solution:** Verify invitation acceptance creates proper junction records

### 4.3 Cross-Location Session Creation
**Current:** Working correctly - sessions tied to client's location
**Verify:** Trainer must have access to client's location to create session

---

## Implementation Roadmap

### Week 1: Critical Data Integrity
**Goal:** Prevent data corruption and access issues

**Day 1-2:**
- [ ] Implement location requirement validation
- [ ] Add warnings for removing trainer access
- [ ] Create affected client checks

**Day 3-4:**
- [ ] Implement soft delete for locations
- [ ] Add archive/unarchive UI
- [ ] Create impact assessment endpoints

**Day 5:**
- [ ] Testing and bug fixes
- [ ] Deploy to staging

### Week 2: Database Cleanup & UX
**Goal:** Remove technical debt and improve workflows

**Day 1-2:**
- [ ] Remove locationId references from code
- [ ] Create and test migration
- [ ] Update all permission checks

**Day 3-5:**
- [ ] Build reassignment workflows
- [ ] Create audit trail
- [ ] Implement orphaned client reports
- [ ] Testing and deployment

---

## Database Schema Changes Required

```prisma
// Add to Location model (soft delete)
model Location {
  // ... existing fields
  archivedAt      DateTime?
  archivedBy      String?    // User ID who archived
  archivedReason  String?    // Optional reason for archiving
  
  @@index([archivedAt])
}

// Add audit trail for trainer changes
model TrainerChangeLog {
  id              String   @id @default(cuid())
  clientId        String
  fromTrainerId   String?
  toTrainerId     String?
  reason          String
  performedBy     String
  metadata        Json?     // Additional context
  createdAt       DateTime @default(now())
  
  client          Client   @relation(fields: [clientId], references: [id])
  fromTrainer     User?    @relation("FromTrainer", fields: [fromTrainerId], references: [id])
  toTrainer       User?    @relation("ToTrainer", fields: [toTrainerId], references: [id])
  performedByUser User     @relation("PerformedBy", fields: [performedBy], references: [id])
  
  @@index([clientId])
  @@index([fromTrainerId])
  @@index([toTrainerId])
  @@map("trainer_change_logs")
}

// Update User model (remove after cleanup)
model User {
  // REMOVE: locationId String?
  // REMOVE: location Location? @relation(...)
  // KEEP: locations UserLocation[]
}
```

---

## API Endpoints Needed

### Check Location Removal Impact
```typescript
GET /api/locations/[id]/removal-impact
Response: {
  affectedUsers: number,
  affectedClients: number,
  recentSessions: number,
  orphanedClients: Client[], // Clients who would lose their trainer
  warnings: string[]
}
```

### Bulk Reassign Clients
```typescript
POST /api/clients/bulk-reassign
Body: {
  fromTrainerId: string,
  toTrainerId: string,
  clientIds: string[],
  reason: string
}
Response: {
  success: boolean,
  reassigned: number,
  failed: string[]
}
```

### Archive/Unarchive Location
```typescript
POST /api/locations/[id]/archive
Body: {
  reason?: string,
  reassignTrainers?: boolean
}

POST /api/locations/[id]/unarchive
Response: {
  success: boolean,
  location: Location
}
```

### Get Orphaned Clients Report
```typescript
GET /api/reports/orphaned-clients
Response: {
  clients: Array<{
    id: string,
    name: string,
    location: string,
    primaryTrainer: string,
    issue: string // "trainer_no_access" | "trainer_inactive"
  }>,
  totalCount: number
}
```

---

## UI Components Needed

### 1. Location Access Warning Dialog
```tsx
interface LocationAccessWarningProps {
  trainer: User
  locationBeingRemoved: Location
  affectedClients: Client[]
  onConfirm: (reassignTo?: string) => void
  onCancel: () => void
}

// Shows:
// - "Removing access to [Location] will affect X clients"
// - List of affected clients
// - Option to select replacement trainer
// - Confirm/Cancel buttons
```

### 2. Location Archive Dialog
```tsx
interface LocationArchiveDialogProps {
  location: Location
  impact: {
    users: number
    clients: number
    recentSessions: number
  }
  onConfirm: (reason: string) => void
}

// Shows:
// - Impact summary
// - Reason input field
// - Warning about consequences
// - Archive/Cancel buttons
```

### 3. Orphaned Client Alert (Dashboard)
```tsx
// Dashboard widget showing:
// - Count of orphaned clients
// - Quick link to full report
// - One-click reassignment for critical cases
```

---

## Testing Checklist

### Data Integrity Tests
- [ ] Cannot create/update user without location (non-admin)
- [ ] Warning appears when removing trainer's location access
- [ ] Clients flagged when trainer loses access
- [ ] Soft delete prevents data loss
- [ ] Archived locations excluded from dropdowns

### Permission Tests
- [ ] All APIs use getUserAccessibleLocations()
- [ ] No references to old locationId in permission checks
- [ ] Cross-location access properly validated

### UX Tests
- [ ] Reassignment flow works smoothly
- [ ] Archive/unarchive locations functional
- [ ] Orphaned client report accurate
- [ ] Audit trail captures all changes

### Migration Tests
- [ ] LocationId removal doesn't break existing data
- [ ] All users maintain their access after migration
- [ ] Rollback plan tested and documented

---

## Success Metrics

### Immediate (Week 1)
- Zero users without location access (except admins)
- Zero orphaned client relationships
- All location deletions use soft delete

### Short-term (Week 2)
- LocationId field completely removed
- 100% of permission checks use new system
- Audit trail for all access changes

### Long-term (Month 1)
- 50% reduction in support tickets about access issues
- Zero data loss from location management
- Clear audit trail for compliance

---

## Migration Scripts

### Find Users Without Locations
```typescript
async function findUsersWithoutLocations() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' },
      locations: { none: {} }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  })
  
  console.log(`Found ${users.length} users without locations:`)
  users.forEach(u => console.log(`- ${u.name} (${u.email}) - ${u.role}`))
  return users
}
```

### Find Orphaned Clients
```typescript
async function findOrphanedClients() {
  const clients = await prisma.client.findMany({
    where: {
      primaryTrainerId: { not: null }
    },
    include: {
      primaryTrainer: {
        include: {
          locations: true
        }
      },
      location: true
    }
  })
  
  const orphaned = clients.filter(client => {
    if (!client.primaryTrainer) return false
    
    const trainerLocationIds = client.primaryTrainer.locations.map(l => l.locationId)
    return !trainerLocationIds.includes(client.locationId)
  })
  
  console.log(`Found ${orphaned.length} orphaned clients`)
  return orphaned
}
```

### Cleanup LocationId References
```bash
# Quick migration to remove locationId after all code updated
npx prisma migrate dev --name remove-legacy-location-id

# In the migration file:
ALTER TABLE users DROP COLUMN "locationId";
```

---

## Notes & Considerations

### Why These Edge Cases Matter
1. **Data Integrity**: Orphaned relationships break the app's core functionality
2. **User Experience**: Trainers/managers get confused when they can't access expected data
3. **Compliance**: Audit trails required for business operations
4. **Scalability**: Clean data model essential as organization grows

### Future Enhancements (Not Urgent)
- Location hierarchies (regions > locations)
- Temporary location access for substitute trainers
- Location-based permissions beyond just access
- Automated reassignment based on rules

### Key Decisions Made
- UserLocation junction table is now the single source of truth
- Admins have implicit access to all locations (role-based, not junction table)
- Soft delete preferred over hard delete for locations
- Audit trail essential for trainer-client relationship changes

---

## Quick Start Guide

### For Immediate Implementation:
1. Run the orphaned client script to assess current state
2. Implement location requirement validation (Priority 1.1)
3. Add soft delete to locations (Priority 1.3)
4. Fix permission checks in the 4 critical files

### Command Reference:
```bash
# Check for orphaned clients in production
npm run script:find-orphaned-clients

# Audit users without locations
npm run script:audit-user-locations

# Test migration locally first
npm run migrate:dev -- --name add-location-soft-delete

# Deploy to staging for testing
git checkout staging && npm run migrate:deploy

# Production deployment (after testing)
git checkout main && npm run migrate:deploy
```

---

**Document Status:** Updated for October 2024 state
**Next Review:** After Priority 1 implementation
**Owner:** Development Team
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