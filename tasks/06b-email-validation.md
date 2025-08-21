# Task 06B: Email Validation System

**Complexity: 6/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
**Dependencies: Task 06A (Session Creation), Task 08A (Email Setup)**

## Objective
Implement secure email-based session validation system allowing clients to confirm training sessions with one-click validation.

## Requirements from PRD
- Email sent to client immediately after session creation
- Email contains session details and confirmation link
- One-click confirmation (no login required)
- Validation timestamp recorded
- Sessions without validation are flagged in reports
- Validation links expire after 30 days

## Implementation Checklist

### Validation API Endpoint
- [ ] GET `/api/sessions/validate/[token]` - Validation page
- [ ] POST `/api/sessions/validate/[token]` - Process validation
- [ ] Check token validity and expiry
- [ ] Update session validated_at timestamp
- [ ] Log validation event
- [ ] Handle expired tokens gracefully

### Email Template
- [ ] Create HTML email template
- [ ] Include session details:
  - [ ] Trainer name
  - [ ] Session date and time
  - [ ] Location
  - [ ] Session value
- [ ] Prominent validation button
- [ ] Mobile-responsive design
- [ ] Plain text fallback

### Validation Landing Page
- [ ] Public page (no auth required)
- [ ] Display session details
- [ ] Confirm button
- [ ] Already validated message
- [ ] Expired token message
- [ ] Success confirmation

### Token Management
- [ ] Generate cryptographically secure tokens
- [ ] Store token hash in database
- [ ] Set 30-day expiry
- [ ] One-time use enforcement
- [ ] Token lookup optimization

### Validation Tracking
- [ ] Track validation status
- [ ] Record validation timestamp
- [ ] Log client IP address
- [ ] Track email open rates (optional)
- [ ] Monitor validation rates

### Reminder System
- [ ] Identify unvalidated sessions
- [ ] Send reminder after 24 hours
- [ ] Send final reminder after 7 days
- [ ] Stop reminders after validation
- [ ] Manager notification for low validation rates

### Security Measures
- [ ] Rate limit validation attempts
- [ ] Prevent token enumeration
- [ ] HTTPS-only validation links
- [ ] Log suspicious activity
- [ ] Token rotation on use

## Acceptance Criteria
- [ ] Clients receive email within 1 minute
- [ ] One-click validation works without login
- [ ] Expired tokens show appropriate message
- [ ] Validated sessions marked in system
- [ ] Validation rate trackable in reports
- [ ] Mobile-friendly validation process

## Technical Notes
- Use crypto.randomBytes for tokens
- Store SHA-256 hash of tokens
- Consider email delivery service SLA
- Implement idempotent validation
- Use database index on token field

## Email Template Structure
```html
Hi [Client Name],

Please confirm your training session:

📅 Date: [Date]
⏰ Time: [Time]
👤 Trainer: [Trainer Name]
📍 Location: [Location]
💰 Session Value: $[Value]

[CONFIRM SESSION BUTTON]

This link expires in 30 days.

Thanks,
[Gym Name] Team
```

## Validation Flow
```
1. Client receives email
2. Clicks validation link
3. Opens validation page
4. Reviews session details
5. Clicks confirm button
6. Session marked as validated
7. Success message displayed
8. Email notification to trainer (optional)
```

## Files to Create/Modify
- `/src/app/api/sessions/validate/[token]/route.ts`
- `/src/app/validate/[token]/page.tsx`
- `/src/lib/email/templates/session-validation.tsx`
- `/src/lib/sessions/token-generator.ts`
- `/src/lib/sessions/validation-service.ts`
- `/src/components/validation/ValidationForm.tsx`
- `/src/jobs/validation-reminders.ts`