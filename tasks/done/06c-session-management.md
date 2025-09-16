# Task 06C: Session Management

**Complexity: 4/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Not Started**  
**Dependencies: Task 06A (Session Creation), Task 06B (Email Validation)**

## Objective
Implement comprehensive session management including viewing, editing, and tracking session history with proper permissions.

## Requirements from PRD
- View session history
- Edit session details (with restrictions)
- Track validation status
- Identify substitute sessions
- Session reporting and filtering

## Implementation Checklist

### Session List API
- [x] GET `/api/sessions` - List with filters
- [x] GET `/api/sessions/[id]` - Get session details
- [x] PUT `/api/sessions/[id]` - Update session
- [x] DELETE `/api/sessions/[id]` - Cancel session
- [ ] GET `/api/sessions/stats` - Session statistics

### Session List View
- [x] Table with session information
- [x] Filter by date range
- [x] Filter by trainer
- [x] Filter by client
- [x] Filter by validation status
- [x] Filter by location
- [x] Sort options
- [x] Pagination

### Session Details Page
- [x] Display all session information
- [x] Show validation status prominently
- [x] Indicate if substitute session
- [x] Show package information
- [x] Display notes
- [x] Edit button (if permitted)
- [ ] ~~Audit history~~ (Moved to postMVP.md)

### Session Editing
- [x] Edit date/time (admin only)
- [x] Update notes
- [ ] Change session value (manager only)
- [x] Cannot edit validated sessions (trainers)
- [ ] ~~Log all changes to audit~~ (Moved to postMVP.md)
- [x] Reason required for edits

### Validation Status Management
- [x] Visual indicators for status:
  - [x] ✅ Validated
  - [x] ⏳ Pending
  - [x] ⚠️ Expired
  - [ ] ❌ Cancelled
- [x] Resend validation email option
- [x] Manual validation (admin only)
- [x] Validation rate by trainer

### Substitute Session Tracking
- [x] Mark substitute sessions clearly
- [ ] ~~Filter for substitute sessions~~ (Moved to postMVP.md)
- [ ] ~~Substitute session report~~ (Moved to postMVP.md)
- [ ] ~~Track coverage patterns~~ (Moved to postMVP.md)
- [ ] ~~Notify primary trainer~~ (Moved to postMVP.md)

### Session Analytics
- [x] Sessions per trainer (in dashboard)
- [x] Sessions per client (in client details)
- [x] Validation rates (in dashboard)
- [ ] Average sessions per day/week
- [ ] ~~Peak session times~~ (Moved to postMVP.md)
- [ ] No-show tracking

## Acceptance Criteria
- [x] All sessions viewable with appropriate filters
- [x] Edit permissions enforced properly
- [x] Validation status clearly visible
- [x] Substitute sessions identifiable
- [ ] ~~Changes logged to audit trail~~ (Moved to postMVP.md)
- [x] Reports exportable to CSV (in dashboard)

## Technical Notes
- Implement soft delete for cancellations
- Cache frequently accessed session lists
- Use database views for complex queries
- Consider read replicas for reports
- Index by trainer, client, date

## Permission Matrix
```
TRAINER:
- View own sessions
- Edit own pending sessions
- Add notes to sessions

CLUB_MANAGER:
- View club sessions
- Edit club sessions
- Manual validation

PT_MANAGER:
- View all sessions
- Edit all sessions
- Override validation

ADMIN:
- All permissions
- Delete sessions
- Modify validated sessions
```

## Files to Create/Modify
- `/src/app/api/sessions/route.ts`
- `/src/app/api/sessions/[id]/route.ts`
- `/src/app/sessions/page.tsx`
- `/src/app/sessions/[id]/page.tsx`
- `/src/app/sessions/[id]/edit/page.tsx`
- `/src/components/sessions/SessionTable.tsx`
- `/src/components/sessions/SessionFilters.tsx`
- `/src/components/sessions/ValidationStatus.tsx`