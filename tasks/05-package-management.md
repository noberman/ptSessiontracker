# Task 05: Package Management

**Complexity: 4/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Not Started**  
**Dependencies: Task 04 (Client Management)**

## Objective
Implement package management system for tracking client training packages, session values, and remaining sessions.

## Requirements from PRD
- Define package types (e.g., "12 sessions for $1,200")
- Calculate per-session value automatically
- Link packages to clients
- Track remaining sessions (display only, not blocking)

## Implementation Checklist

### Package CRUD Operations
- [ ] GET `/api/packages` - List all packages
- [ ] GET `/api/packages/[id]` - Get package details
- [ ] POST `/api/packages` - Create new package
- [ ] PUT `/api/packages/[id]` - Update package
- [ ] DELETE `/api/packages/[id]` - Soft delete

### Package Creation Form
- [ ] Package name/description
- [ ] Total package value ($)
- [ ] Total number of sessions
- [ ] Auto-calculate per-session value
- [ ] Client selection dropdown
- [ ] Active status toggle
- [ ] Start date (optional)
- [ ] Expiry date (optional)

### Package List View
- [ ] Table with package information
- [ ] Filter by client
- [ ] Filter by active status
- [ ] Show sessions used/remaining
- [ ] Show total value and per-session value
- [ ] Sort by client, value, sessions

### Client Package Assignment
- [ ] Assign package to client
- [ ] Multiple packages per client allowed
- [ ] Set primary/active package
- [ ] Package history for client
- [ ] Transfer package between clients

### Session Tracking
- [ ] Count sessions used per package
- [ ] Calculate remaining sessions
- [ ] Display progress bar/indicator
- [ ] Warning when package near completion
- [ ] Report on expired packages

### Package Analytics
- [ ] Average package value
- [ ] Most popular package types
- [ ] Package completion rates
- [ ] Revenue per package type
- [ ] Unused session value

## Acceptance Criteria
- [ ] Packages created with auto-calculated session value
- [ ] Multiple packages can be assigned to one client
- [ ] Session count updates when sessions logged
- [ ] Remaining sessions displayed accurately
- [ ] Expired packages marked appropriately
- [ ] Package history preserved when deleted

## Technical Notes
- Session value = Total Value ÷ Total Sessions
- Don't block session creation if package exceeded
- Consider package templates for common types
- Track package modifications in audit log
- Index by client_id for performance

## Common Package Examples
```
- Starter: 5 sessions for $500 ($100/session)
- Standard: 12 sessions for $1,200 ($100/session)
- Premium: 24 sessions for $2,160 ($90/session)
- Elite: 50 sessions for $4,000 ($80/session)
```

## Files to Create/Modify
- `/src/app/api/packages/route.ts`
- `/src/app/api/packages/[id]/route.ts`
- `/src/app/packages/page.tsx`
- `/src/app/packages/new/page.tsx`
- `/src/app/packages/[id]/edit/page.tsx`
- `/src/components/packages/PackageForm.tsx`
- `/src/components/packages/PackageTable.tsx`
- `/src/components/packages/SessionProgress.tsx`