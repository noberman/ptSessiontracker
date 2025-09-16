# Task 15: Cancellation & Offboarding Flow

**Complexity: 5/10**  
**Priority: IMPORTANT (SaaS MVP)**  
**Status: Not Started**  
**Dependencies: Task 14 (SaaS Onboarding), Stripe integration**

## Objective
Implement a smooth cancellation flow that attempts retention, handles data export, manages subscription termination, and provides options for reactivation.

## User Journey
1. User navigates to Settings → Billing
2. Clicks "Cancel Subscription"
3. Retention flow attempts to save customer
4. If proceeding, selects cancellation reason
5. Exports data if desired
6. Confirms cancellation
7. Receives confirmation and reactivation options

## Implementation Checklist

### Cancellation Initiation
- [ ] Cancel button in billing settings (OWNER role only)
- [ ] Require password confirmation
- [ ] Check for pending sessions/validations
- [ ] Warning about data retention policy

### Retention Flow
- [ ] **Step 1: "Before you go" screen**
  - [ ] Show what they'll lose:
    - [ ] Active sessions tracking
    - [ ] Commission calculations
    - [ ] Team access
    - [ ] Historical data (after 30 days)
  - [ ] Offer alternatives:
    - [ ] Downgrade to free tier (if on Pro)
    - [ ] Pause subscription for 1-3 months
    - [ ] Discount offer (20% off for 3 months)
    - [ ] Talk to support

- [ ] **Step 2: Reason selection**
  - [ ] Too expensive
  - [ ] Not using enough
  - [ ] Missing features
  - [ ] Found alternative
  - [ ] Closing business
  - [ ] Other (text input)
  - [ ] Optional detailed feedback

- [ ] **Step 3: Targeted retention**
  Based on reason selected:
  - [ ] Too expensive → Offer discount
  - [ ] Not using → Offer training/onboarding
  - [ ] Missing features → Collect feedback, show roadmap
  - [ ] Alternative → Compare features
  - [ ] Closing → Express understanding

### Data Export
- [ ] **Export options screen**
  - [ ] Export all data (ZIP file):
    - [ ] Clients (CSV)
    - [ ] Sessions (CSV)
    - [ ] Packages (CSV)
    - [ ] Trainers (CSV)
    - [ ] Commission reports (Excel)
  - [ ] Email export link
  - [ ] Download immediately
  - [ ] Skip export option

### Cancellation Execution
- [ ] **Immediate actions:**
  - [ ] Cancel Stripe subscription
  - [ ] Set subscription end date
  - [ ] Send cancellation email
  - [ ] Log cancellation reason
  - [ ] Create audit log entry

- [ ] **End of billing period:**
  - [ ] Downgrade to free tier (if applicable)
  - [ ] Disable Pro features
  - [ ] Restrict user additions
  - [ ] Send reminder email

- [ ] **After 30 days (grace period):**
  - [ ] Deactivate organization
  - [ ] Revoke all user access
  - [ ] Archive data (not delete)
  - [ ] Send final email

### Reactivation Flow
- [ ] **For recently cancelled (< 30 days):**
  - [ ] "Reactivate" button on login
  - [ ] Restore all data immediately
  - [ ] Resume billing
  - [ ] Welcome back email
  - [ ] Offer onboarding if needed

- [ ] **For expired accounts (> 30 days):**
  - [ ] Check if data archived
  - [ ] Offer data restoration (may charge fee)
  - [ ] Require new subscription
  - [ ] Re-verify email

### Access Control During Cancellation
- [ ] **During notice period:**
  - [ ] Full access maintained
  - [ ] Warning banner about pending cancellation
  - [ ] "Resume subscription" option prominent
  - [ ] Export data reminders

- [ ] **After cancellation:**
  - [ ] Read-only access for OWNER (7 days)
  - [ ] No access for other users
  - [ ] Data export still available
  - [ ] Billing history accessible

### Email Communications
- [ ] **Cancellation initiated:**
  - Subject: "We're sorry to see you go"
  - Confirm cancellation details
  - End date clearly stated
  - Export data reminder
  - Reactivation instructions

- [ ] **7 days before end:**
  - Subject: "Your FitSync subscription ends soon"
  - Final reminder to export
  - One-click reactivation
  - What happens next

- [ ] **On cancellation date:**
  - Subject: "Your FitSync subscription has ended"
  - Access details
  - Data retention policy
  - How to reactivate

- [ ] **30 days post-cancellation:**
  - Subject: "Final notice: FitSync data archival"
  - Last chance to reactivate
  - Data will be archived
  - Contact for special requests

### Subscription Pause Option
- [ ] Pause for 1, 2, or 3 months
- [ ] Maintain data but prevent access
- [ ] Auto-resume after pause period
- [ ] Email reminder before resuming
- [ ] Can cancel during pause

### Win-back Campaign
- [ ] **30 days after cancellation:**
  - Email with special offer
  - Highlight new features
  - Success stories

- [ ] **60 days after:**
  - Different angle/offer
  - Case studies
  - Personal reach out for high-value

- [ ] **90 days after:**
  - Final offer
  - Remove from campaign if no response

### Analytics & Reporting
- [ ] Track cancellation funnel:
  - [ ] Billing page → Cancel button
  - [ ] Cancel → Retention accepted
  - [ ] Cancel → Completed
- [ ] Cancellation reasons breakdown
- [ ] Retention offer success rates
- [ ] Reactivation rates
- [ ] Customer lifetime value
- [ ] Churn prediction signals

### Admin Tools
- [ ] View cancelled organizations
- [ ] Cancellation analytics dashboard
- [ ] Manual reactivation override
- [ ] Export cancellation data
- [ ] Win-back campaign management

## Database Considerations
```typescript
// Organization updates
{
  subscriptionStatus: 'CANCELLING' | 'CANCELLED' | 'ARCHIVED'
  cancellationDate: Date
  cancellationReason: string
  cancellationFeedback?: string
  dataExportedAt?: Date
  archiveDate?: Date
  reactivatedAt?: Date
}

// New table: CancellationReasons
{
  id: string
  organizationId: string
  reason: string
  feedback?: string
  offeredRetention?: string
  acceptedRetention: boolean
  createdAt: Date
}
```

## Stripe Integration
- [ ] Handle subscription.cancelled webhook
- [ ] Handle subscription.updated webhook
- [ ] Implement pause using Stripe's pause_collection
- [ ] Manage trial extensions
- [ ] Process refunds if applicable

## Acceptance Criteria
- [ ] OWNER can initiate cancellation
- [ ] Retention offers shown based on reason
- [ ] Data export works correctly
- [ ] Subscription cancelled in Stripe
- [ ] Access restricted appropriately
- [ ] Reactivation works smoothly
- [ ] All emails delivered
- [ ] Analytics tracking working

## Error Handling
- [ ] Stripe API failures
- [ ] Export generation failures
- [ ] Email delivery failures
- [ ] Concurrent cancellation attempts
- [ ] Reactivation of deleted data

## Legal & Compliance
- [ ] Clear data retention policy
- [ ] GDPR compliance (right to deletion)
- [ ] Refund policy clearly stated
- [ ] Terms of service updated
- [ ] Cancellation terms documented

## Testing Requirements
- [ ] Test full cancellation flow
- [ ] Test each retention path
- [ ] Test data export generation
- [ ] Test reactivation scenarios
- [ ] Test email delivery
- [ ] Test Stripe webhooks
- [ ] Test grace period behavior
- [ ] Test archival process

## Future Enhancements
- Exit interview scheduling
- Automated win-back sequences
- Predictive churn prevention
- Loyalty rewards for long-term customers
- Transfer ownership option
- Account merger capabilities