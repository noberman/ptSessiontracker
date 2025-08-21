# Task 06A: Session Creation

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
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
- [ ] POST `/api/sessions` - Create new session
- [ ] Validate trainer-client relationship
- [ ] Auto-populate session value from package
- [ ] Generate unique validation token
- [ ] Set validation expiry (30 days)
- [ ] Return session ID and status

### Session Creation Form
- [ ] Client selection dropdown
  - [ ] "My Clients" section (primary trainer)
  - [ ] "All Clients" section (for substitutes)
  - [ ] Visual indicator for substitute sessions
- [ ] Date picker (default: today)
- [ ] Time picker
- [ ] Location display (from trainer's assignment)
- [ ] Package selection (if multiple)
- [ ] Session value display (auto-calculated)
- [ ] Notes field (optional)

### Quick Session Entry
- [ ] "Quick Add" button on dashboard
- [ ] Recent clients shortlist
- [ ] Copy previous session feature
- [ ] Keyboard shortcuts for power users
- [ ] Mobile-optimized interface

### Validation Setup
- [ ] Generate secure validation token
- [ ] Calculate expiry date (30 days)
- [ ] Create validation URL
- [ ] Queue email notification
- [ ] Store token securely

### Data Validation
- [ ] Verify client is active
- [ ] Check trainer permissions
- [ ] Validate session date (not future)
- [ ] Ensure location match
- [ ] Check for duplicate sessions
- [ ] Package availability check

### Substitute Session Handling
- [ ] Detect when trainer isn't primary
- [ ] Show substitute indicator
- [ ] Log substitute relationship
- [ ] Include in substitute reports
- [ ] Notify primary trainer (optional)

## Acceptance Criteria
- [ ] Trainers can create sessions for their clients
- [ ] Substitute trainers can log sessions
- [ ] Session value auto-calculated from package
- [ ] Validation token generated automatically
- [ ] Duplicate sessions prevented
- [ ] Mobile-friendly interface

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