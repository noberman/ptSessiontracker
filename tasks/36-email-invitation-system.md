# Task 36: Email Invitation System

**Complexity: 6/10**  
**Priority: HIGH (Core onboarding functionality)**  
**Status: Not Started**  
**Dependencies: Email service (SendGrid/Resend), Organization structure**  
**Estimated Time: 6-8 hours**

## Objective
Implement a complete invitation system allowing organization admins to invite trainers via email, track invitation status, and enable self-service onboarding.

## Database Schema

```prisma
model Invitation {
  id             String      @id @default(cuid())
  email          String
  role           Role        @default(TRAINER)
  organizationId String
  invitedById    String
  status         InvitationStatus @default(PENDING)
  token          String      @unique @default(cuid())
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  invitedBy      User        @relation(fields: [invitedById], references: [id])
  
  @@unique([email, organizationId])
  @@index([token])
  @@index([status])
  @@map("invitations")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

## Implementation Phases

### Phase 1: Database & Core Logic
- [ ] Add Invitation model to schema
- [ ] Create invitation service functions:
  ```typescript
  // lib/invitation-service.ts
  export async function createInvitation({
    email,
    role,
    organizationId,
    invitedById,
  }) {
    // Check if user already exists in org
    // Check invitation limits based on subscription
    // Generate secure token
    // Set expiration (7 days)
    // Create invitation record
    // Return invitation
  }

  export async function sendInvitationEmail(invitation) {
    // Generate invitation link
    // Send email with template
    // Log email event
  }

  export async function acceptInvitation(token: string) {
    // Validate token
    // Check expiration
    // Create/update user account
    // Add to organization
    // Mark invitation as accepted
    // Send welcome email
  }
  ```

### Phase 2: API Endpoints
- [ ] POST `/api/invitations` - Send invitation
  ```typescript
  // Check admin permissions
  // Validate email
  // Check subscription limits
  // Create & send invitation
  // Return invitation status
  ```

- [ ] GET `/api/invitations` - List invitations
  ```typescript
  // Return pending/accepted/expired invitations
  // Include invitation details and status
  ```

- [ ] POST `/api/invitations/[id]/resend` - Resend invitation
  ```typescript
  // Check if invitation is pending
  // Generate new token if needed
  // Resend email
  ```

- [ ] POST `/api/invitations/[id]/cancel` - Cancel invitation
  ```typescript
  // Mark invitation as cancelled
  // Prevent acceptance
  ```

- [ ] POST `/api/invitations/accept` - Accept invitation
  ```typescript
  // Validate token
  // Create account or add to org
  // Return redirect to login/dashboard
  ```

### Phase 3: UI Components

#### Invitation Management Page (`/settings/team/invitations`)
```typescript
export function InvitationsPage() {
  // Tabs: Pending | Accepted | Expired
  // Show invitation list with:
  // - Email
  // - Role
  // - Sent date
  // - Status
  // - Actions (Resend/Cancel)
  // 
  // "Invite New Member" button
}
```

#### Invite Modal Component
```typescript
export function InviteTeamMemberModal() {
  // Email input (with validation)
  // Role selector
  // Location assignment (optional)
  // Send button
  // Show remaining invites based on plan
}
```

#### Invitation Acceptance Page (`/invitation/[token]`)
```typescript
export function AcceptInvitationPage() {
  // Show organization name
  // Show who invited them
  // If no account: signup form
  // If has account: login prompt
  // Accept button
  // Success/error messages
}
```

### Phase 4: Email Templates

#### Invitation Email
```html
Subject: You're invited to join {organizationName} on FitSync

Hi there,

{inviterName} has invited you to join {organizationName} as a {role} on FitSync.

FitSync helps personal training teams manage sessions, track commissions, and streamline operations.

[Accept Invitation] - Button linking to /invitation/{token}

This invitation expires in 7 days.

Best regards,
The FitSync Team
```

#### Welcome Email (after acceptance)
```html
Subject: Welcome to {organizationName} on FitSync!

Welcome {userName}!

You've successfully joined {organizationName} as a {role}.

Here's what you can do:
- Log sessions with clients
- Track your performance
- View commission reports
- Manage your schedule

[Go to Dashboard] - Link to login

Need help getting started? Check out our guide: [link]
```

### Phase 5: Usage Limit Integration
- [ ] Check invitation limits based on subscription tier:
  ```typescript
  // Starter: Can invite up to 2 trainers total
  // Growth: Can invite up to 10 trainers total
  // Scale: Unlimited invitations
  
  export async function canSendInvitation(organizationId: string) {
    const org = await getOrganization(organizationId)
    const tier = SUBSCRIPTION_TIERS[org.subscriptionTier]
    
    const activeUsers = await countActiveUsers(organizationId)
    const pendingInvites = await countPendingInvitations(organizationId)
    
    const totalSlots = activeUsers + pendingInvites
    
    if (tier.limits.trainers === -1) return { allowed: true }
    if (totalSlots >= tier.limits.trainers) {
      return { 
        allowed: false, 
        reason: `You've reached your limit of ${tier.limits.trainers} team members. Upgrade to invite more.`
      }
    }
    
    return { allowed: true }
  }
  ```

### Phase 6: Bulk Invitation Features
- [ ] CSV upload for multiple invitations
- [ ] Bulk resend for pending invitations
- [ ] Invitation analytics (sent, accepted, conversion rate)

## Security Considerations

1. **Token Security**
   - Use cryptographically secure random tokens
   - Tokens should be single-use
   - Implement rate limiting on acceptance endpoint

2. **Permission Checks**
   - Only ADMIN and PT_MANAGER can send invitations
   - Users can only view invitations for their organization

3. **Email Validation**
   - Validate email format
   - Check for disposable email addresses
   - Prevent inviting existing organization members

## Success Metrics

- [ ] Admins can invite team members via email
- [ ] Invitations expire after 7 days
- [ ] Invited users can accept and join organization
- [ ] Invitation limits enforced based on subscription
- [ ] Resend capability for pending invitations
- [ ] Clear status tracking for all invitations

## Testing Checklist

- [ ] Send invitation successfully
- [ ] Accept invitation with new account
- [ ] Accept invitation with existing account
- [ ] Resend invitation works
- [ ] Cancel invitation prevents acceptance
- [ ] Expired invitations can't be accepted
- [ ] Usage limits properly enforced
- [ ] Email templates render correctly

## Next Steps
- Task 37: SaaS Onboarding Wizard (uses invitation system)
- Task 38: Team management dashboard
- Task 39: Role-based permissions refinement