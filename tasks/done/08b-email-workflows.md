# Task 08B: Email Workflows

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Partially Complete (40%)**  
**Dependencies: Task 08A (Email Setup), Task 06B (Email Validation)**

## Objective
Implement automated email workflows for session validation, reminders, and notifications with proper retry and tracking mechanisms.

## Requirements from PRD
- Email to client for session validation
- Reminder emails for unvalidated sessions
- Monthly report ready notifications
- Trainer notifications for low validation rates

## Implementation Checklist

### Session Validation Email
- [x] Trigger on session creation ✅ COMPLETE
- [x] Include session details ✅ COMPLETE
- [x] Generate validation link ✅ COMPLETE
- [x] Send within 1 minute ✅ COMPLETE
- [x] Handle send failures ✅ COMPLETE (with retry)
- [x] Log delivery status ✅ COMPLETE

### Reminder Workflows
- [ ] ~~Moved to postMVP.md~~

### Email Templates
- [x] Session validation template ✅ COMPLETE
- [ ] ~~Additional templates moved to postMVP.md~~

### Queue Management
- [ ] ~~Moved to postMVP.md~~

### Scheduled Jobs
- [ ] ~~Moved to postMVP.md~~

### Notification Rules
- [ ] ~~Moved to postMVP.md~~

### Email Tracking
- [x] Track send attempts ✅ COMPLETE
- [x] Log delivery status ✅ COMPLETE
- [x] Validation link clicks ✅ COMPLETE (sessions track validation)

## Acceptance Criteria
- [ ] Validation emails sent immediately
- [ ] Reminders sent on schedule
- [ ] Failed emails retry automatically
- [ ] All emails tracked in database
- [ ] Templates render correctly
- [ ] Unsubscribe works properly

## Technical Notes
- Use job queue for scheduled emails
- Implement idempotency keys
- Consider time zones for scheduling
- Batch process reminders for efficiency
- Use database transactions for consistency

## Email Workflow Diagram
```
Session Created
    ↓
Send Validation Email (immediate)
    ↓
Wait 24 hours
    ↓
Check if validated?
    No → Send Reminder 1
    ↓
Wait 6 days
    ↓
Check if validated?
    No → Send Reminder 2
    ↓
Stop reminders
```

## Template Variables
```typescript
interface ValidationEmailData {
  clientName: string
  trainerName: string
  sessionDate: Date
  sessionTime: string
  location: string
  sessionValue: number
  validationUrl: string
  expiryDate: Date
}
```

## Files to Create/Modify
- `/src/lib/email/workflows/validation.ts`
- `/src/lib/email/workflows/reminders.ts`
- `/src/lib/email/templates/validation-email.tsx`
- `/src/lib/email/templates/reminder-email.tsx`
- `/src/lib/queue/email-queue.ts`
- `/src/jobs/email-processor.ts`
- `/src/jobs/reminder-scheduler.ts`
- `/src/app/api/email/unsubscribe/route.ts`