# Task 08A: Email Setup

**Complexity: 4/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
**Dependencies: Task 01 (Foundation)**

## Objective
Set up email service infrastructure for sending validation emails, reminders, and notifications using SendGrid or Resend.

## Requirements from PRD
- Email service for session validation
- Template management system
- Reliable delivery with retry logic
- Email tracking and logging

## Implementation Checklist

### Email Service Selection
- [ ] Evaluate SendGrid vs Resend
- [ ] Create service account
- [ ] Obtain API keys
- [ ] Set up sender domain
- [ ] Configure SPF/DKIM records
- [ ] Verify sender email

### Service Integration
- [ ] Install email service SDK
- [ ] Configure API credentials in .env
- [ ] Create email service wrapper
- [ ] Implement send function
- [ ] Add error handling
- [ ] Set up retry logic

### Template System
- [ ] Create base email template
- [ ] Design responsive HTML layout
- [ ] Create plain text versions
- [ ] Add template variables system
- [ ] Implement template rendering
- [ ] Store templates in code/database

### Email Configuration
- [ ] Set default from address
- [ ] Configure reply-to address
- [ ] Set up bounce handling
- [ ] Configure unsubscribe links
- [ ] Add email footer with company info

### Development Environment
- [ ] Set up email preview in development
- [ ] Configure test email addresses
- [ ] Create email log viewer
- [ ] Implement email interceptor for dev
- [ ] Add email testing endpoints

### Monitoring & Logging
- [ ] Log all email sends
- [ ] Track delivery status
- [ ] Monitor bounce rates
- [ ] Track open rates (optional)
- [ ] Set up alerts for failures

## Acceptance Criteria
- [ ] Emails send successfully from application
- [ ] Templates render with variables
- [ ] Failed sends retry automatically
- [ ] All emails logged to database
- [ ] Development emails intercepted
- [ ] Sender domain verified

## Technical Notes
- Use environment variables for API keys
- Implement queue for high volume
- Consider rate limits of service
- Use webhooks for delivery status
- Store email history for 90 days

## Email Service Comparison
```
SendGrid:
- 100 emails/day free
- Good deliverability
- Complex API
- Detailed analytics

Resend:
- 100 emails/day free
- Simple API
- React email support
- Modern developer experience
```

## Environment Variables
```env
# Email Service
EMAIL_SERVICE=resend
EMAIL_API_KEY=your_api_key_here
EMAIL_FROM=noreply@yourgym.com
EMAIL_REPLY_TO=support@yourgym.com
EMAIL_DEV_OVERRIDE=dev@yourgym.com
```

## Files to Create/Modify
- `/src/lib/email/client.ts`
- `/src/lib/email/templates/base.tsx`
- `/src/lib/email/sender.ts`
- `/src/lib/email/types.ts`
- `/src/app/api/email/test/route.ts`
- `/.env.example` (add email variables)
- `/prisma/schema.prisma` (add EmailLog model)