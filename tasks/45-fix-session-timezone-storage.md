# Task 45: Fix Session Timezone Storage for Accurate Commission Calculations

## Problem Statement
Sessions are being stored incorrectly in the database with organization's local time values being treated as UTC. This causes:

1. **Display Issues**: Current display "works" by accident but is technically wrong
2. **Commission Calculation Errors**: Sessions near month boundaries are counted in the wrong month
3. **Data Integrity**: ~596 existing sessions in production have incorrect timestamps
4. **Multi-Organization Support**: No support for organizations in different timezones

## ⚠️ CRITICAL WARNINGS

### Commission Safety - Forward-Only Fix:
1. **NO RETROACTIVE CHANGES** - Do NOT migrate existing session timestamps to avoid affecting November payroll
2. **Keep November sessions in November** - Some are late October sessions but must stay for commission payout
3. **Fix forward only** - Only new sessions after deployment will use proper UTC storage

### What MUST Be Done Together:
1. **Storage + Display MUST be fixed together** - If we fix storage but not display, ALL times will show wrong
2. **All filtering MUST use org timezone** - Commission, reports, exports must filter based on org's local month
3. **NO data migration for existing sessions** - They stay as-is to preserve commission integrity

### Common Pitfalls to Avoid:
- ❌ **DON'T** filter by UTC month boundaries for commission
- ❌ **DON'T** display UTC times directly to users
- ❌ **DON'T** forget to update export functions
- ❌ **DON'T** assume JavaScript Date handles timezones correctly
- ✅ **DO** use a proper timezone library (date-fns-tz)
- ✅ **DO** always convert display times from UTC to org timezone
- ✅ **DO** always convert filter boundaries from org timezone to UTC

### Example of the Issue:
- **Singapore Org Creates**: Nov 1, 2025 at 7:00 AM local time
- **Currently Stores As**: 2025-11-01 07:00:00 (stored as if UTC but actually local)
- **Should Store As**: 2025-10-31 23:00:00 (proper UTC)
- **Commission Impact**: Session incorrectly counts for November instead of October

### Current Display Behavior:
- **SessionDetailsPanel & ValidationPage**: Strip 'Z' suffix, show correct time by accident
- **SessionTable**: Uses raw Date(), may show wrong time
- **Problem**: If we fix storage, current display logic breaks

## Business Impact
- **Payroll Accuracy**: Monthly commissions calculated on wrong month boundaries
- **Multi-Org Support**: Cannot support organizations in different timezones
- **Financial Reporting**: Monthly revenue reports show sessions in wrong periods
- **Tier Progression**: Trainers reach commission tiers based on incorrect month boundaries

## Technical Requirements

### 1. Add Organization Timezone Support
- Add timezone field to Organization model
- Default to "Asia/Singapore" for existing orgs
- Use timezone for all date/time operations

### 2. Fix Session Storage
- Convert from organization's timezone to UTC before storage
- Update all session creation endpoints (manual, import, bulk)
- Store proper UTC timestamps in database

### 3. Fix Commission Calculations
- Convert UTC sessions to organization's timezone for month boundaries
- Ensure commission tiers reset at organization's month boundaries
- Update all commission reports to use org timezone

### 4. Update Display Logic
- Convert UTC to user's viewing context (org timezone)
- Update all components to handle timezone conversion properly
- Maintain backward compatibility during migration

## Implementation Plan

### Phase 1: Add Organization Timezone (Priority: HIGH)
- [ ] Add timezone field to Organization model in `prisma/schema.prisma`
  ```prisma
  model Organization {
    // ... existing fields
    timezone  String  @default("Asia/Singapore")
  }
  ```
- [ ] Create migration to add timezone column with default
- [ ] Update organization settings page to allow timezone selection
- [ ] Add timezone picker component with IANA timezone list

### Phase 2: Fix Session Creation (Priority: HIGH)
- [ ] Update `/src/app/api/sessions/route.ts` to use org timezone
  ```javascript
  // Get organization timezone
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { timezone: true }
  })
  
  // Convert from org timezone to UTC
  const localDateTime = new Date(`${sessionDate}T${sessionTime}:00`)
  // Use a proper timezone library like date-fns-tz
  const utcDateTime = zonedTimeToUtc(localDateTime, org.timezone)
  ```
- [ ] Update `/src/app/api/clients/import/route.ts` for bulk imports
- [ ] Add date-fns-tz or similar library for proper timezone handling
- [ ] Test session creation across month boundaries

### Phase 3: ~~Migrate Existing Data~~ SKIP - No Migration Needed
**IMPORTANT**: We are NOT migrating existing session data to preserve November commission integrity.
- Existing sessions remain with their current timestamps
- November sessions (including late October ones) stay in November for payroll
- Only new sessions after deployment will use proper UTC storage

### Phase 4: Fix Display Logic (Priority: CRITICAL)
**IMPORTANT**: Display logic needs to handle BOTH old and new sessions differently.

**Approach**: Use deployment timestamp as cutoff
- Sessions created BEFORE fix: Display as-is (already "local time" stored incorrectly)
- Sessions created AFTER fix: Convert from UTC to org timezone

- [ ] Create utility functions for timezone conversion
  ```javascript
  // utils/timezone.ts
  const TIMEZONE_FIX_DEPLOYMENT_DATE = new Date('2025-11-15T00:00:00Z') // Set when deploying
  
  export function displaySessionTime(session: Session, orgTimezone: string) {
    // Old sessions: already in local time, display as-is
    if (new Date(session.createdAt) < TIMEZONE_FIX_DEPLOYMENT_DATE) {
      return new Date(session.sessionDate)
    }
    // New sessions: stored as UTC, convert to org timezone
    return utcToZonedTime(session.sessionDate, orgTimezone)
  }
  
  export function orgTimeToUtc(localDate: Date, orgTimezone: string) {
    return zonedTimeToUtc(localDate, orgTimezone)
  }
  
  // For filtering - convert org's month boundaries to UTC for database queries
  export function getMonthBoundariesInUtc(year: number, month: number, orgTimezone: string) {
    const startLocal = new Date(year, month - 1, 1, 0, 0, 0)
    const endLocal = new Date(year, month, 0, 23, 59, 59, 999)
    return {
      start: zonedTimeToUtc(startLocal, orgTimezone),
      end: zonedTimeToUtc(endLocal, orgTimezone)
    }
  }
  ```

#### Components that DISPLAY session times:
- [ ] `/src/components/dashboard/SessionDetailsPanel.tsx` - Session time display
- [ ] `/src/app/validate/[token]/page.tsx` - Validation page time display
- [ ] `/src/components/sessions/SessionTable.tsx` - Session list table
- [ ] `/src/components/dashboard/ManagerDashboard.tsx` - Dashboard session times
- [ ] `/src/components/dashboard/TrainerDashboard.tsx` - Trainer view times
- [ ] `/src/components/commission/CommissionDashboard.tsx` - Commission period display
- [ ] `/src/components/commission/TrainerCommissionView.tsx` - Trainer commission times
- [ ] Email templates that show session times

#### API Routes that FILTER by date:
- [ ] `/src/app/api/sessions/route.ts` - Session creation and listing
- [ ] `/src/app/api/sessions/list/route.ts` - Session filtering
- [ ] `/src/app/api/trainers/[id]/sessions/route.ts` - Trainer session filtering
- [ ] `/src/app/api/dashboard/trainer-details/route.ts` - Dashboard date filtering
- [ ] `/src/app/api/commission/calculate/route.ts` - Commission period filtering

#### Pages that FILTER by month:
- [ ] `/src/app/(authenticated)/sessions/page.tsx` - Session page month filter
- [ ] `/src/app/(authenticated)/commission/page.tsx` - Commission month boundaries
- [ ] `/src/app/(authenticated)/my-commission/page.tsx` - Personal commission months
- [ ] `/src/app/(authenticated)/dashboard/page.tsx` - Dashboard month filtering

#### Export/Report Functions:
- [ ] Commission export - Must show times in org timezone
- [ ] Session export - Must show times in org timezone
- [ ] Any CSV/Excel exports with dates

### Phase 5: Fix Commission Calculations (Priority: CRITICAL)
**KEY CONCEPT**: Commission months are based on ORG'S LOCAL TIME, not UTC!

**IMPORTANT FOR NOVEMBER 2025**: 
- Keep existing November sessions as-is (including late October ones)
- They're already in the "right" month for payroll purposes
- Only apply timezone-aware filtering for sessions created AFTER the fix

- [ ] Update `CommissionCalculatorV2` to use org timezone for month boundaries
  ```javascript
  // WRONG: Using UTC dates directly
  const sessions = await prisma.session.findMany({
    where: {
      sessionDate: {
        gte: new Date(2025, 10, 1), // Nov 1 UTC
        lte: new Date(2025, 10, 30) // Nov 30 UTC
      }
    }
  })
  
  // CORRECT: Convert org's local month to UTC for query
  const org = await getOrganization()
  const novemberInOrgTz = getMonthBoundariesInUtc(2025, 11, org.timezone)
  const sessions = await prisma.session.findMany({
    where: {
      sessionDate: {
        gte: novemberInOrgTz.start, // Oct 31 16:00 UTC for Singapore
        lte: novemberInOrgTz.end     // Nov 30 15:59:59 UTC for Singapore
      }
    }
  })
  ```
- [ ] Update commission dashboard month filters to use org timezone
- [ ] Update commission reports to group by org's local months
- [ ] Test commission calculations across month boundaries
- [ ] Verify tier progression resets at org's month boundary

## Testing Requirements

### Test Cases:
1. **Month Boundary Test**
   - Create session on 1st of month at 7:00 AM in org timezone
   - Verify it stores as last day of previous month at 23:00 UTC (for Singapore)
   - Confirm commission counts for correct month in org timezone

2. **Multi-Org Timezone Test**
   - Create org in Singapore (UTC+8)
   - Create org in New York (UTC-5)
   - Verify same UTC session shows in different months for commission

3. **Display Test**
   - Create session at various times
   - Verify correct display in org's timezone
   - Check validation email timestamps match org timezone

4. **Migration Test**
   - Run migration on test data
   - Verify sessions move to correct months
   - Check commission recalculation for affected months

## Rollback Plan
1. Since no data migration, rollback is simpler:
   - Revert code changes
   - Remove timezone field from Organization model if added
   - Old sessions continue working as before
2. Monitor commission calculations for first month after deployment
3. Track deployment date to know which sessions use new logic

## Success Metrics
- [ ] All NEW sessions store with correct UTC timestamps
- [ ] Existing sessions remain unchanged (no commission disruption)
- [ ] November 2025 commission payout unaffected
- [ ] Commission calculations for future months use org's timezone boundaries
- [ ] All displays show correct time (old sessions as-is, new with conversion)
- [ ] Multi-org support with different timezones works correctly
- [ ] Zero timezone-related support tickets

## Risk Assessment
- **~~High Risk~~**: ~~Migration affects November 2025 commission calculations~~ → **Mitigated by no-migration approach**
- **Medium Risk**: Display components need careful handling of old vs new sessions
- **Low Risk**: Future commission calculations need timezone awareness
- **Low Risk**: Third-party integrations may need updates

## Dependencies
- date-fns-tz or similar timezone library
- Database backup before migration
- Staging environment testing
- Communication to trainers about potential commission adjustments
- List of IANA timezone identifiers for org settings

## Estimated Timeline
- Phase 1: 2 hours (Add org timezone support)
- Phase 2: 3 hours (Fix session creation with timezone library)
- Phase 3: ~~3 hours~~ 0 hours (No migration needed)
- Phase 4: 3 hours (Update display components with old/new logic)
- Phase 5: 2 hours (Fix commission calculations for future months)
- **Total**: 10 hours including testing (reduced from 16)

## Notes
- Organization timezone determines commission month boundaries
- PostgreSQL stores timestamps without timezone (timestamp) by default
- Current display logic accidentally works but will break when storage is fixed
- Commission calculations must respect organization's business hours
- This fix is critical for accurate November 2025 payroll

## Key Decisions
1. **Organization-level timezone** (not user-level or hardcoded)
2. **Store as UTC** for NEW sessions only (preserve existing data)
3. **Display strategy**: Old sessions as-is, new sessions with timezone conversion
4. **Commission boundaries** based on org's local month transitions (future months)
5. **Use proper timezone library** (date-fns-tz) instead of manual offset calculations
6. **NO DATA MIGRATION** to protect November 2025 payroll integrity

## Related Files
- `/prisma/schema.prisma` - Add timezone to Organization model
- `/src/app/api/sessions/route.ts` - Session creation endpoint
- `/src/app/api/clients/import/route.ts` - Bulk import endpoint
- `/src/lib/commission/v2/CommissionCalculatorV2.ts` - Commission calculator
- `/src/app/validate/[token]/page.tsx` - Session validation page
- `/src/components/dashboard/SessionDetailsPanel.tsx` - Dashboard display
- `/src/components/sessions/SessionTable.tsx` - Session list display
- `/scripts/fix-session-timezones.sql` - Migration script (to be created)
- `/src/utils/timezone.ts` - Timezone utilities (to be created)

## Acceptance Criteria
- [ ] Organizations can have different timezones configured
- [ ] NEW sessions store as proper UTC timestamps (after deployment)
- [ ] OLD sessions remain unchanged (before deployment)
- [ ] Display shows correct time (old as-is, new with conversion)
- [ ] November 2025 commission includes all current November sessions
- [ ] Future commission calculations use org timezone for month boundaries
- [ ] No regression in session validation flow
- [ ] Export files show sessions in organization's timezone
- [ ] No data loss or commission disruption