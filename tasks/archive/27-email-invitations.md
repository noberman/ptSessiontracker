# Task 27: Basic Email Invitations

**Complexity: 4/10**  
**Priority: HIGH (Team Management)**  
**Status: Not Started**  
**Dependencies: Task 20 (Multi-tenant)**  
**Estimated Time: 3 hours**

## Objective
Implement email invitation system for adding team members to an organization.

## Implementation Checklist

### Database Schema
- [ ] Add Invitation model to schema.prisma:
```prisma
model Invitation {
  id             String    @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  email          String
  role           Role
  invitedBy      String
  inviter        User      @relation(fields: [invitedBy], references: [id])
  token          String    @unique
  expiresAt      DateTime
  acceptedAt     DateTime?
  
  createdAt      DateTime  @default(now())
  
  @@index([token])
  @@index([organizationId])
  @@map("invitations")
}
```

### Create Invitation API
- [ ] Create `/src/app/api/invitations/route.ts`:
```typescript
export async function POST(req: Request) {
  const { email, role } = await req.json()
  const orgId = await getOrganizationId()
  const userId = await getCurrentUserId()
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })
  
  if (existingUser?.organizationId === orgId) {
    return Response.json(
      { error: 'User already in organization' },
      { status: 400 }
    )
  }
  
  // Create invitation
  const token = generateSecureToken()
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: orgId,
      email,
      role,
      invitedBy: userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  })
  
  // Send email
  await sendInvitationEmail(email, token, organization.name)
  
  return Response.json({ invitation })
}
```

### Accept Invitation Page
- [ ] Create `/src/app/invite/[token]/page.tsx`:
```typescript
export default async function AcceptInvitePage({ params }) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { organization: true }
  })
  
  if (!invitation || invitation.expiresAt < new Date()) {
    return <InvitationExpired />
  }
  
  if (invitation.acceptedAt) {
    return <InvitationAlreadyAccepted />
  }
  
  return <AcceptInvitationForm invitation={invitation} />
}
```

### Accept Invitation API
- [ ] Create `/src/app/api/invitations/accept/route.ts`:
```typescript
export async function POST(req: Request) {
  const { token, name, password } = await req.json()
  
  const invitation = await prisma.invitation.findUnique({
    where: { token }
  })
  
  // Validate invitation
  if (!invitation || invitation.expiresAt < new Date()) {
    return Response.json({ error: 'Invalid invitation' }, { status: 400 })
  }
  
  // Create or update user
  const user = await prisma.user.upsert({
    where: { email: invitation.email },
    create: {
      email: invitation.email,
      name,
      password: await hashPassword(password),
      role: invitation.role,
      organizationId: invitation.organizationId
    },
    update: {
      organizationId: invitation.organizationId,
      role: invitation.role
    }
  })
  
  // Mark invitation as accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() }
  })
  
  return Response.json({ success: true })
}
```

### Invitation Management UI
- [ ] Create `/src/components/invitations/InvitationsList.tsx`:
  - [ ] Show pending invitations
  - [ ] Show accepted invitations
  - [ ] Resend invitation option
  - [ ] Revoke invitation option

### Email Template
- [ ] Create invitation email template:
```html
<h2>You're invited to join {organizationName} on FitSync</h2>
<p>{inviterName} has invited you to join as a {role}.</p>
<a href="{acceptUrl}">Accept Invitation</a>
<p>This invitation expires in 7 days.</p>
```

### Resend Invitation
- [ ] Add resend functionality:
```typescript
export async function POST(req: Request) {
  const { invitationId } = await req.json()
  
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  })
  
  // Generate new token and expiry
  const newToken = generateSecureToken()
  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })
  
  await sendInvitationEmail(...)
}
```

## Acceptance Criteria
- [ ] Can send invitation email
- [ ] Invitation link works
- [ ] Can accept invitation
- [ ] User created with correct org/role
- [ ] Expiry enforced
- [ ] Can resend invitation
- [ ] Can revoke invitation

## Testing
- [ ] Send invitation
- [ ] Accept invitation
- [ ] Try expired invitation
- [ ] Try used invitation
- [ ] Resend invitation
- [ ] Revoke invitation

## Security
- Use secure random tokens
- Validate invitation hasn't been used
- Check expiry dates
- Verify organization access
- Rate limit invitation sending

## Notes
- Consider bulk invitations later
- Add invitation analytics
- Track acceptance rate
- Consider SSO in future