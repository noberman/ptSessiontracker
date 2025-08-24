# Task 06A: Session Creation

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: ✅ COMPLETE**  
**Dependencies: Task 04 (Client Management), Task 05 (Package Management)**

## Objective
Implement the core session creation workflow allowing trainers to log completed sessions with automatic value calculation and validation setup.

## Requirements from PRD
- Trainer selects client from their assigned list
- System auto-populates package type and session value
- Captures: Date, time, location, trainer, client
- Session marked as "Pending Validation"

## Implementation Checklist

### Session Creation API
- [x] POST `/api/sessions` - Create new session
- [x] Validate trainer-client relationship
- [x] Auto-populate session value from package
- [x] Generate unique validation token
- [x] Set validation expiry (30 days)
- [x] Return session ID and status

### Session Creation Form
- [x] Client selection dropdown
  - [x] "My Clients" section (primary trainer)
  - [x] "All Clients" section (for substitutes)
  - [x] Visual indicator for substitute sessions
- [x] Date picker (default: today)
- [x] Location display (from trainer's assignment)
- [x] Package selection (if multiple)
- [x] Session value display (auto-calculated)
- [x] Notes field (optional)

### Quick Session Entry
- [ ] "Quick Add" button on dashboard
- [ ] Recent clients shortlist
- [ ] Copy previous session feature
- [ ] Keyboard shortcuts for power users
- [ ] Mobile-optimized interface

### Validation Setup
- [x] Generate secure validation token
- [x] Calculate expiry date (30 days)
- [x] Store token securely
- [ ] Create validation URL
- [ ] Queue email notification

### Data Validation
- [x] Verify client is active
- [x] Check trainer permissions
- [x] Validate session date (not future)
- [x] Ensure location match
- [x] Package availability check

### Substitute Session Handling
- [ ] Detect when trainer isn't primary
- [ ] Show substitute indicator
- [ ] Log substitute relationship
- [ ] Include in substitute reports
- [ ] Notify primary trainer (optional)

## Acceptance Criteria
- [x] Trainers can create sessions for their clients
- [x] Substitute trainers can log sessions
- [x] Session value auto-calculated from package
- [x] Validation token generated automatically
- [x] Mobile-friendly interface

## Technical Notes
- Use crypto for token generation
- Validate all inputs server-side
- Use database transaction for consistency
- Consider rate limiting for API
- Index validation tokens for lookup

## Session Creation Flow
```
1. Trainer opens session form
2. Selects client (shows if substitute)
3. Confirms date/time
4. Reviews session value
5. Submits form
6. System generates validation token
7. Session saved as "Pending"
8. Email queued for client
```

## Files to Create/Modify
- `/src/app/api/sessions/route.ts`
- `/src/app/sessions/new/page.tsx`
- `/src/components/sessions/SessionForm.tsx`
- `/src/components/sessions/ClientSelector.tsx`
- `/src/components/sessions/QuickAdd.tsx`
- `/src/lib/sessions/validation.ts`
- `/src/hooks/useClientSessions.ts`