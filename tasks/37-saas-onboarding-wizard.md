# Task 37: SaaS Onboarding Wizard

**Complexity: 7/10**  
**Priority: HIGH (Critical for self-service growth)**  
**Status: Not Started**  
**Dependencies: Task 36 (Email Invitation System), Stripe integration**  
**Estimated Time: 8-10 hours**

## Objective
Create a smooth, self-service onboarding flow for new organizations to sign up, set up their team, and start using FitSync immediately.

## Onboarding Flow

### Step 1: Organization Signup
**Route: `/signup`**

```typescript
interface SignupForm {
  // Organization Info
  organizationName: string
  organizationEmail: string
  organizationPhone?: string
  
  // Admin Account
  adminName: string
  adminEmail: string
  adminPassword: string
  
  // Initial Setup
  locationName: string
  timezone: string
}
```

**Validation:**
- Check organization email not already registered
- Check admin email not already in use
- Password strength requirements
- Valid timezone selection

**Actions:**
1. Create Organization (default to FREE tier)
2. Create Admin user (role: ADMIN)
3. Create first Location
4. Generate Stripe customer ID
5. Send welcome email
6. Auto-login and redirect to onboarding

### Step 2: Welcome & Goals
**Route: `/onboarding/welcome`**

```typescript
// Personalized welcome screen
"Welcome to FitSync, {adminName}!"
"Let's get {organizationName} set up in just a few minutes."

// Goal selection (for analytics & customization)
□ Manage trainer commissions
□ Track client sessions
□ Streamline scheduling
□ Generate reports
□ Grow my business

[Continue →]
```

### Step 3: Invite Your Team
**Route: `/onboarding/team`**

```typescript
interface TeamInviteStep {
  showSkipOption: boolean // After 3 seconds
  invitations: {
    email: string
    role: 'TRAINER' | 'PT_MANAGER'
  }[]
}

// UI Elements:
"Invite your team members"
"They'll receive an email invitation to join {organizationName}"

[+ Add team member] - Dynamic form rows
Email: _________ Role: [Dropdown]

[Send Invitations & Continue]
[Skip for now] - Appears after delay
```

**Smart Features:**
- Bulk paste detection (from Excel/CSV)
- Duplicate email prevention
- Show remaining slots based on FREE tier (2 trainers)
- Upgrade prompt if trying to add more

### Step 4: Import Clients (Optional)
**Route: `/onboarding/clients`**

```typescript
// Two options presented:
1. "Upload client list" (CSV template provided)
2. "Add clients manually"
3. "I'll do this later"

// If CSV upload:
- Download template
- Fill with: Name, Email, Phone, Primary Trainer
- Upload and validate
- Show import preview
- Confirm import

// If manual:
- Quick-add form
- Add up to 5 clients quickly
- Bulk add available
```

### Step 5: Set Up Packages (Optional)
**Route: `/onboarding/packages`**

```typescript
"What types of training packages do you offer?"

// Pre-populated suggestions:
□ 10 Session Package
□ 20 Session Package  
□ Monthly Unlimited
□ Drop-in Sessions
[+ Add custom package type]

// For each selected:
- Set default price
- Set default session count
- Set expiration rules

[Continue]
[Skip - I'll set this up later]
```

### Step 6: Configure Commissions
**Route: `/onboarding/commissions`**

```typescript
"How do you calculate trainer commissions?"

( ) Flat rate: ___% of session value
( ) Progressive tiers:
    1-10 sessions: ____%
    11-20 sessions: ____%
    21+ sessions: ____%
( ) Custom per trainer

[Continue]
[Skip - Use defaults]
```

### Step 7: Choose Your Plan
**Route: `/onboarding/billing`**

```typescript
"Start your free trial or choose a plan"

// Show pricing cards with current usage highlighted
Starter (Current)
- 2 trainers (1 of 2 used)
- 50 sessions/month
- 1 location
[Continue with Starter]

Growth - POPULAR
- 10 trainers
- 500 sessions/month
- 3 locations
[Start 14-day trial]

Scale
- Unlimited everything
- Priority support
[Start 14-day trial]

// Note: "No credit card required for Starter plan"
```

### Step 8: Quick Tour
**Route: `/onboarding/tour`**

```typescript
"You're all set! Here's how to get started:"

// Interactive tour highlights:
1. "Log your first session" → Sessions page
2. "View your dashboard" → Dashboard
3. "Manage your team" → Users page
4. "Track commissions" → Reports page

[Start Tour]
[Go to Dashboard]
```

## Implementation Details

### Onboarding State Management
```typescript
// Use localStorage to save progress
interface OnboardingState {
  currentStep: number
  completedSteps: string[]
  organizationId: string
  skippedSteps: string[]
  data: {
    goals?: string[]
    invitations?: any[]
    clients?: any[]
    packages?: any[]
    commissions?: any
  }
}

// Allow users to:
- Go back to previous steps
- Skip optional steps
- Resume if they leave
```

### Progress Indicator Component
```typescript
export function OnboardingProgress({ 
  currentStep, 
  totalSteps 
}: Props) {
  // Visual progress bar
  // Step numbers and titles
  // Checkmarks for completed
  // Current step highlighted
}
```

### Skip & Completion Logic
```typescript
// Required steps: 1, 2
// Optional steps: 3, 4, 5, 6
// Recommended step: 7
// Final step: 8

// If user skips steps, add to "Setup Checklist" 
// in dashboard for later completion
```

## Post-Onboarding Features

### Setup Checklist Widget
Show in dashboard if any steps were skipped:
```typescript
"Complete Your Setup" widget
□ Invite team members (0/2)
□ Add your clients
□ Configure packages
□ Set up commissions
□ Upgrade your plan

[Hide completed] [Dismiss]
```

### Onboarding Emails
1. **Welcome Email** - Immediately after signup
2. **Day 1**: "Getting started guide"
3. **Day 3**: "Have you logged your first session?"
4. **Day 7**: "Tips for managing your team"
5. **Day 14**: "Unlock more with Growth plan"

### Analytics to Track
- Completion rate per step
- Drop-off points
- Time spent per step
- Skip rate per optional step
- Conversion to paid within 14 days
- Feature adoption post-onboarding

## Success Metrics

- [ ] New organizations can sign up in < 5 minutes
- [ ] 80%+ completion rate for required steps
- [ ] 50%+ users invite team members during onboarding
- [ ] 30%+ conversion to paid trial within onboarding
- [ ] Clear value demonstration before payment

## Testing Scenarios

1. **Happy Path**: Complete all steps
2. **Minimal Path**: Skip all optional steps  
3. **Resume Path**: Leave and come back
4. **Error Path**: Invalid inputs, API failures
5. **Upgrade Path**: Hit limits and upgrade
6. **Mobile Path**: Complete on mobile device

## UI/UX Considerations

- Mobile-responsive design
- Clear CTAs and skip options
- Inline validation and helpful errors
- Progress saving
- Loading states for async operations
- Celebration/success animations
- Contextual help tooltips

## Next Steps
- Task 38: Setup checklist dashboard widget
- Task 39: Onboarding email automation
- Task 40: Product tour/tooltips system