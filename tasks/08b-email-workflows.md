# Task 08B: Email Workflows

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
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
- [ ] Trigger on session creation
- [ ] Include session details
- [ ] Generate validation link
- [ ] Send within 1 minute
- [ ] Handle send failures
- [ ] Log delivery status

### Reminder Workflows
- [ ] First reminder after 24 hours
- [ ] Second reminder after 7 days
- [ ] Stop after validation
- [ ] Configurable reminder schedule
- [ ] Bulk reminder processing
- [ ] Track reminder count

### Email Templates
- [ ] Session validation template
- [ ] Reminder template (variant 1)
- [ ] Final reminder template
- [ ] Validation success confirmation
- [ ] Monthly report ready
- [ ] Low validation rate alert

### Queue Management
- [ ] Implement email queue
- [ ] Priority levels (immediate/scheduled)
- [ ] Retry failed sends (3 attempts)
- [ ] Exponential backoff
- [ ] Dead letter queue
- [ ] Queue monitoring

### Scheduled Jobs
- [ ] Daily reminder check (9 AM)
- [ ] Weekly validation report
- [ ] Monthly commission report notification
- [ ] Cleanup old email logs
- [ ] Queue health check

### Notification Rules
- [ ] Manager alert: <70% validation rate
- [ ] Trainer alert: Pending validations
- [ ] Admin alert: Email delivery failures
- [ ] Client notification preferences
- [ ] Unsubscribe handling

### Email Tracking
- [ ] Track send attempts
- [ ] Log delivery status
- [ ] Record open events (optional)
- [ ] Track click events
- [ ] Validation link clicks
- [ ] Report email metrics

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