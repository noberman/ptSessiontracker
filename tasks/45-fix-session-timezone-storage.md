# Task 45: Fix Session Timezone Storage for Accurate Commission Calculations

## Problem Statement
Sessions are being stored incorrectly in the database with organization's local time values being treated as UTC. This causes:

1. **Display Issues**: Current display "works" by accident but is technically wrong
2. **Commission Calculation Errors**: Sessions near month boundaries are counted in the wrong month
3. **Data Integrity**: ~596 existing sessions in production have incorrect timestamps
4. **Multi-Organization Support**: No support for organizations in different timezones

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

### Phase 3: Migrate Existing Data (Priority: HIGH)
- [ ] Create migration script `/scripts/fix-session-timezones.sql`
  ```sql
  -- For Singapore organizations (UTC+8)
  -- Current data is stored as local time, need to mark it as UTC
  -- This means subtracting 8 hours from the stored value
  UPDATE sessions s
  SET "sessionDate" = "sessionDate" - INTERVAL '8 hours'
  FROM organizations o
  WHERE s."organizationId" = o.id
  AND o.timezone = 'Asia/Singapore';
  ```
- [ ] Create backup before migration
- [ ] Run on staging environment first
- [ ] Verify sessions moved to correct months

### Phase 4: Fix Display Logic (Priority: HIGH)
- [ ] Create utility function for UTC to org timezone conversion
  ```javascript
  // utils/timezone.ts
  export function utcToOrgTime(utcDate: Date, orgTimezone: string) {
    return utcToZonedTime(utcDate, orgTimezone)
  }
  ```
- [ ] Update `/src/components/dashboard/SessionDetailsPanel.tsx`
- [ ] Update `/src/app/validate/[token]/page.tsx`
- [ ] Update `/src/components/sessions/SessionTable.tsx`
- [ ] Ensure all components use org timezone for display

### Phase 5: Fix Commission Calculations (Priority: HIGH)
- [ ] Update `CommissionCalculatorV2` to use org timezone for month boundaries
  ```javascript
  // Convert period dates to org timezone for queries
  const orgStart = zonedTimeToUtc(startOfMonth, org.timezone)
  const orgEnd = zonedTimeToUtc(endOfMonth, org.timezone)
  ```
- [ ] Update commission dashboard month filters
- [ ] Test commission calculations across month boundaries
- [ ] Verify tier progression with corrected dates

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
1. Keep backup of sessions table before migration
2. Prepare rollback SQL to restore original timestamps
   ```sql
   UPDATE sessions s
   SET "sessionDate" = "sessionDate" + INTERVAL '8 hours'
   FROM organizations o
   WHERE s."organizationId" = o.id
   AND o.timezone = 'Asia/Singapore';
   ```
3. Remove timezone field from Organization model if needed
4. Monitor commission calculations for first month after deployment

## Success Metrics
- [ ] All new sessions store with correct UTC timestamps
- [ ] Existing sessions migrated to proper UTC values
- [ ] Commission calculations accurately reflect org's timezone month boundaries
- [ ] All displays show correct time in org's timezone
- [ ] Multi-org support with different timezones works correctly
- [ ] Zero timezone-related support tickets

## Risk Assessment
- **High Risk**: Migration affects November 2025 commission calculations
- **High Risk**: Display components may break if not all updated
- **Medium Risk**: Some trainers may see commission tier changes
- **Low Risk**: Third-party integrations may need updates

## Dependencies
- date-fns-tz or similar timezone library
- Database backup before migration
- Staging environment testing
- Communication to trainers about potential commission adjustments
- List of IANA timezone identifiers for org settings

## Estimated Timeline
- Phase 1: 3 hours (Add org timezone support)
- Phase 2: 4 hours (Fix session creation with timezone library)
- Phase 3: 3 hours (Migrate existing data with testing)
- Phase 4: 4 hours (Update all display components)
- Phase 5: 2 hours (Fix commission calculations)
- **Total**: 16 hours including testing

## Notes
- Organization timezone determines commission month boundaries
- PostgreSQL stores timestamps without timezone (timestamp) by default
- Current display logic accidentally works but will break when storage is fixed
- Commission calculations must respect organization's business hours
- This fix is critical for accurate November 2025 payroll

## Key Decisions
1. **Organization-level timezone** (not user-level or hardcoded)
2. **Store as UTC** in database for consistency
3. **Display in org timezone** for all users in that org
4. **Commission boundaries** based on org's local month transitions
5. **Use proper timezone library** instead of manual offset calculations

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
- [ ] New sessions store as proper UTC timestamps
- [ ] Display shows correct time in organization's timezone
- [ ] Commission calculations use org timezone for month boundaries
- [ ] October sessions ending at 11 PM UTC (7 AM Nov 1 Singapore) count for October
- [ ] Migration moves existing sessions to correct UTC values
- [ ] No regression in session validation flow
- [ ] Export files show sessions in organization's timezone