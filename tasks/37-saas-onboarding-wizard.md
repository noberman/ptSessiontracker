# Task 37: SaaS Onboarding Wizard

**Complexity: 8/10**  
**Priority: HIGH (Critical for self-service growth)**  
**Status: Not Started**  
**Dependencies: Task 36 (Email Invitation System), Stripe integration, NextAuth**  
**Estimated Time: 10-12 hours**

## Objective
Create a smooth, self-service onboarding flow for new organizations to sign up, set up their team, and start using FitSync immediately with instant value demonstration.

## Onboarding Flow (7 Steps)

### Step 1: Organization Signup
**Route: `/signup`**

```typescript
// Google OAuth Option (Primary)
[Continue with Google]
--- or ---
[Sign up with email]

// Email Signup Form
interface SignupForm {
  // Organization Info
  organizationName: string
  
  // Admin Account
  adminName: string
  adminEmail: string
  adminPassword: string
  
  // Auto-generated
  locationName: string // Defaults to organizationName
}
```

**Google OAuth Flow:**
1. User clicks "Continue with Google"
2. Authenticate with Google
3. Collect only organizationName
4. Auto-populate name and email from Google
5. Create Organization + Admin + Location

**Email Flow Actions:**
1. Create Organization (default to FREE tier)
2. Create Admin user (role: ADMIN)
3. Create first Location
4. Generate Stripe customer ID
5. Send welcome email
6. Auto-login and redirect to `/onboarding/welcome`

### Step 2: Personal Welcome
**Route: `/onboarding/welcome`**

```typescript
"Welcome to FitSync, {adminName}! 👋"

[Video thumbnail or founder photo]

"Hi, I'm Noah - I built FitSync because I saw how broken 
commission tracking was in gyms. As a trainer/manager myself, 
I experienced the spreadsheet nightmare firsthand.

FitSync is still evolving, and YOUR feedback shapes what 
we build next. We read every message.

Let's get {organizationName} set up!"

- Noah, Founder

// Quick poll (optional, for analytics)
"What brought you to FitSync?"
( ) Commission headaches
( ) Client management  
( ) Team coordination
( ) Other

[Questions? Message me] [Continue →]
```

### Step 3: Invite Your Team
**Route: `/onboarding/team`**

```typescript
"Invite your team members"
"They'll receive an email invitation to join {organizationName}"

Email: _________ Role: [Trainer ▼]
[+ Add team member]

Remaining slots: 2 (Free plan)

[Send Invitations & Continue]
[Skip for now] - Appears after 3 seconds
```

**Smart Features:**
- Bulk paste detection (from Excel/CSV)
- Show remaining slots based on FREE tier
- Upgrade prompt if exceeding limits
- Uses existing invitation system

### Step 4: Package Setup
**Route: `/onboarding/packages`**

```typescript
"What training packages are you selling?"
"Add the packages your clients typically purchase"

Package name: [10 Session Package]
Sessions: [10]
Price: $[500]

Quick add templates:
[5 Sessions] [10 Sessions] [20 Sessions] [Monthly]

[+ Add another package]

[Continue] [Skip for now]
```

**Note:** Client import removed from onboarding - moved to post-onboarding

### Step 5: Configure Commissions
**Route: `/onboarding/commissions`**

```typescript
"How do you calculate trainer commissions?"

( ) Flat rate: [50]% of session value
(•) Progressive tiers (Recommended):
    1-10 sessions:  [40]%
    11-20 sessions: [50]%  
    21+ sessions:   [60]%
( ) Custom per trainer

[Continue] [Use defaults (50% flat)]
```

### Step 6: Choose Your Plan
**Route: `/onboarding/billing`**

```typescript
"Choose your plan"

    FREE (Current)          GROWTH               SCALE
    $0/month               $49/month            $149/month
    ✓ 2 trainers           ✓ 10 trainers        ✓ Unlimited
    ✓ 50 sessions          ✓ 500 sessions       ✓ Unlimited
    ✓ 1 location           ✓ 3 locations        ✓ Unlimited
    
    You have: 1 trainer
    
[Continue with Free]   [14-day trial]        [14-day trial]

"No credit card required for Free plan"
```

### Step 7: See the Magic! ✨
**Route: `/onboarding/demo`**

```typescript
"Let's see FitSync in action!"

// Decision modal
"How would you like to experience FitSync?"

[Quick Demo - Recommended]        [Try It Yourself]
See instant calculations          Experience full validation
with test data (30 seconds)      with your email (2 minutes)

// Option A: Quick Demo (Default)
┌─────────────────────────────────────┐
│ Demo Session Results:               │
│                                     │
│ Client: Alex Johnson (Demo)         │
│ Package: 10 Sessions ($500)         │
│ Session: Completed yesterday        │
│ Status: ✓ Client validated          │
│                                     │
│ Session value: $50                  │
│ Your commission: $25 (50%)          │
│ Month to date: $25                  │
└─────────────────────────────────────┘

[Try it with my email] [Go to Dashboard]

// Option B: Full Experience
Step 1: "Create a test client with YOUR email"
- Name: Your Name (Test)
- Email: [pre-filled with user email]
- Package: [dropdown of their packages]
[Create Client]

Step 2: "Log a session"
[Pre-filled session form]
[Log Session]

Step 3: "Check your email!"
"We sent a validation request to {email}"

Step 4: "Session validated! ✨"
"Commission earned: $25"
"This is how your clients validate sessions!"

[Go to Dashboard]
```

## Implementation Details

### Google OAuth Integration
```typescript
// pages/api/auth/[...nextauth].ts
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  CredentialsProvider({...})
]

// Signup page UI
<button onClick={() => signIn('google', { 
  callbackUrl: '/onboarding/org-setup' 
})}>
  <GoogleIcon /> Continue with Google
</button>
```

### Demo Data Management
```typescript
interface DemoData {
  client: {
    name: "Alex Johnson (Demo)"
    email: "demo@fitsync.internal"
    isDemo: true // Flag for identification
  }
  package: {
    name: string // User's package or "10 Session Package"
    isDemo: true
  }
  session: {
    date: Date // Yesterday
    validated: true
    isDemo: true
  }
}

// Bulk cleanup option
async function clearDemoData(organizationId: string) {
  await prisma.client.deleteMany({
    where: { organizationId, isDemo: true }
  })
  // Also clean packages, sessions with isDemo flag
}

// UI indicators
{client.isDemo && <Badge variant="secondary">Demo</Badge>}
{client.isDemo && <Button size="sm" onClick={deleteDemo}>Remove</Button>}
```

### Smart Fallbacks
```typescript
// If user skipped packages
if (!packages.length) {
  await createDefaultPackages(orgId, [
    { name: "10 Session Package", sessions: 10, price: 500 },
    { name: "5 Session Package", sessions: 5, price: 275 }
  ])
}

// If user skipped commissions
if (!commissionConfig) {
  await setDefaultCommission(orgId, {
    method: "FLAT",
    rate: 50
  })
}
```

### Onboarding State Management
```typescript
interface OnboardingState {
  currentStep: number
  completedSteps: string[]
  organizationId: string
  skippedSteps: string[]
  data: {
    welcomePoll?: string
    invitations?: Array<{email: string, role: string}>
    packages?: Array<{name: string, sessions: number, price: number}>
    commissionMethod?: string
    demoChoice?: 'quick' | 'full'
  }
}

// localStorage key: 'onboarding_state'
// Clear on completion
```

### Progress Indicator Component
```typescript
export function OnboardingProgress({ currentStep, totalSteps }: Props) {
  return (
    <div className="flex items-center justify-center mb-8">
      {[...Array(totalSteps)].map((_, i) => (
        <div key={i} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${i < currentStep ? 'bg-green-500 text-white' : 
              i === currentStep ? 'bg-blue-500 text-white' : 
              'bg-gray-200'}
          `}>
            {i < currentStep ? '✓' : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-16 h-1 ${
              i < currentStep ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
```

## Post-Onboarding Features

### Setup Checklist Widget (Dashboard)
```typescript
// Show if any steps were skipped or demo data exists
"Complete Your Setup"
□ Clear demo data (1 demo client)
□ Invite team members (1/2)
□ Import your clients [Start]
□ Log your first real session
□ Configure payment method

[Dismiss] [Hide completed]
```

### Empty States with CTAs
- No real clients? → "Import your clients" [Import CSV] [Add Client]
- Only demo session? → "Log your first real session" [New Session]
- No team? → "Invite team members" [Invite]

## Success Metrics

- [ ] Time to value: < 5 minutes from signup to seeing commission calculation
- [ ] Completion rate: 90%+ for required steps (1, 2, 7)
- [ ] Demo interaction: 100% see commission calculation
- [ ] Google OAuth adoption: 60%+ use Google signup
- [ ] Team invitation: 40%+ invite at least one member

## Testing Scenarios

1. **Google OAuth Path**: Sign up with Google → Complete flow
2. **Email Path**: Traditional signup → Complete flow
3. **Skip Everything Path**: Skip all optional steps → Still see demo
4. **Power User Path**: Fill everything → Try full validation
5. **Resume Path**: Leave at step 3 → Come back → Continue
6. **Mobile Path**: Complete entire flow on mobile

## Technical Requirements

1. **Google OAuth Setup**
   - Google Cloud Console project
   - OAuth 2.0 credentials
   - NextAuth configuration

2. **Demo Data**
   - Add `isDemo` boolean to Client, Package, Session models
   - Migration to add field
   - Cleanup functions

3. **Video/Image Assets**
   - Founder photo or video for welcome
   - Loom/YouTube embed for video option

4. **State Persistence**
   - localStorage for progress
   - Session storage for temp data
   - Clear on completion

## Next Steps
- Task 38: Feedback Collection System
- Task 39: Onboarding email automation
- Task 40: Client import wizard (post-onboarding)