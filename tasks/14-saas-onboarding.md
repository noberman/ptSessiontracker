# Task 14: SaaS Onboarding Flow

**Complexity: 6/10**  
**Priority: CRITICAL (SaaS MVP)**  
**Status: Not Started**  
**Dependencies: Organization model, Stripe integration**

## Objective
Create a seamless onboarding flow for new organizations signing up from the landing page, enabling them to set up their gym and start using FitSync within minutes.

## User Journey
1. User clicks "Start Free Trial" on landing page (fitsync.io)
2. Creates owner account and organization
3. Completes 3-step setup wizard
4. Invites team members
5. Begins using the platform

## Implementation Checklist

### Step 1: Sign Up & Organization Creation
- [ ] Combined signup form at `/signup`
  - [ ] Organization name (required)
  - [ ] Your name (required)
  - [ ] Email (required)
  - [ ] Password with strength indicator
  - [ ] Phone (optional)
  - [ ] Terms of service checkbox
- [ ] Email verification flow
- [ ] Create organization record
- [ ] Create owner user account with OWNER role
- [ ] Auto-login after email verification
- [ ] Welcome email with getting started guide

### Step 2: Initial Setup Wizard (3 Steps)

#### Step 2.1: Location Setup
- [ ] Add first location (can skip)
  - [ ] Location name
  - [ ] Set as default location
- [ ] Option to add multiple locations
- [ ] Skip option (can add later)
- [ ] Progress indicator (Step 1 of 3)

#### Step 2.2: Commission Configuration
- [ ] Select commission method:
  - [ ] Progressive Tier (recommended, pre-selected)
  - [ ] Graduated Tier
  - [ ] Package-Based
  - [ ] Target-Based
  - [ ] Custom (advanced)
- [ ] For Progressive Tier (default):
  - [ ] Pre-filled with standard tiers (0-30: 25%, 31-60: 30%, 61+: 35%)
  - [ ] Option to customize percentages
  - [ ] Option to add/remove tiers
- [ ] Save and continue
- [ ] Skip option (use defaults)
- [ ] Progress indicator (Step 2 of 3)

#### Step 2.3: Package Types Setup
- [ ] Default package types pre-populated:
  - [ ] Basic (5 sessions)
  - [ ] Standard (10 sessions)
  - [ ] Premium (20 sessions)
  - [ ] Elite (30 sessions)
- [ ] Option to:
  - [ ] Rename package types
  - [ ] Add custom package types
  - [ ] Remove unwanted types
  - [ ] Set pricing (optional)
- [ ] Skip option (use defaults)
- [ ] Progress indicator (Step 3 of 3)

### Step 3: Team Invitation
- [ ] Invite team members screen
  - [ ] Bulk email input (comma-separated)
  - [ ] Role selection per invite (Trainer, Manager, Admin)
  - [ ] Location assignment (if locations created)
  - [ ] Custom message (optional)
- [ ] Send invitations
- [ ] Skip option (invite later)
- [ ] Show pending invitations

### Step 4: Dashboard & First Actions
- [ ] Redirect to owner dashboard
- [ ] Show onboarding checklist widget:
  - [ ] ✓ Organization created
  - [ ] ✓ Location added (if done)
  - [ ] ✓ Commission tiers configured
  - [ ] ✓ Package types set up
  - [ ] ○ Invite team members
  - [ ] ○ Add first client
  - [ ] ○ Create first session
  - [ ] ○ Upgrade to Pro ($15/month)
- [ ] Dismissible getting started tips
- [ ] Quick action buttons
- [ ] Support/help widget

### Subscription Integration
- [ ] Free tier limitations:
  - [ ] 2 trainers max
  - [ ] 50 sessions/month
  - [ ] Basic features only
- [ ] Upgrade prompts at limits
- [ ] Stripe checkout for Pro upgrade
- [ ] Subscription management in settings

### Database Seeding
When new organization is created:
- [ ] Create default commission tiers
- [ ] Create default package types
- [ ] Create sample data (optional, for demo)
- [ ] Set default settings
- [ ] Initialize audit log

### Email Templates
- [ ] Welcome email to owner
- [ ] Team invitation email
- [ ] Email verification
- [ ] Setup completion confirmation

### Error Handling
- [ ] Organization name uniqueness
- [ ] Email already in use
- [ ] Invalid invitation emails
- [ ] Stripe payment failures
- [ ] Network errors with retry

### Analytics & Tracking
- [ ] Track funnel conversion:
  - [ ] Landing → Signup
  - [ ] Signup → Email verified
  - [ ] Verified → Setup complete
  - [ ] Setup → First session
  - [ ] Free → Pro upgrade
- [ ] Track setup choices (commission type, package types)
- [ ] Track time to complete onboarding
- [ ] Track invitation acceptance rate

## Acceptance Criteria
- [ ] User can sign up and create org in < 1 minute
- [ ] Setup wizard completable in < 3 minutes
- [ ] All steps skippable except org creation
- [ ] Mobile-responsive throughout
- [ ] Clear progress indication
- [ ] Graceful error handling
- [ ] Immediate platform access after signup

## UI/UX Considerations
- Clean, minimal design matching landing page
- Large, friendly form fields
- Clear value propositions at each step
- Progress bar showing completion
- Skip options don't feel like failure
- Celebrate completion with confetti or animation
- Helpful tooltips and examples

## Technical Notes
- Use React Hook Form for form management
- Implement proper form validation
- Store wizard progress in localStorage
- Allow returning to incomplete setup
- Use database transactions for organization creation
- Implement proper error boundaries
- Consider implementing via Next.js app directory

## Testing Requirements
- [ ] E2E test for complete flow
- [ ] Test all skip paths
- [ ] Test validation errors
- [ ] Test email delivery
- [ ] Test Stripe integration
- [ ] Test mobile responsiveness
- [ ] Load test for concurrent signups

## Future Enhancements (Post-MVP)
- Import data from competitors
- Video tutorials at each step
- Live chat support during onboarding
- Templates for different gym types
- Advanced customization options
- API access setup
- Webhooks configuration