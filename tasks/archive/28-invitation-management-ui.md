# Task 28: Invitation Management UI

**Complexity: 3/10**  
**Priority: HIGH (Team Management)**  
**Status: Not Started**  
**Dependencies: Task 27 (Email Invitations)**  
**Estimated Time: 2 hours**

## Objective
Create UI for managing team invitations including sending, viewing, and revoking.

## Implementation Checklist

### Team Management Page
- [ ] Create `/src/app/(authenticated)/settings/team/page.tsx`:
  - [ ] List current team members
  - [ ] Show pending invitations
  - [ ] "Invite Team Member" button
  - [ ] Bulk actions

### Invite Modal Component
- [ ] Create `/src/components/team/InviteModal.tsx`:
```typescript
interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: () => void
}

// Form fields:
// - Email(s) - support comma-separated
// - Role selection
// - Location assignment (optional)
// - Custom message (optional)
```

### Pending Invitations Table
- [ ] Create `/src/components/team/PendingInvitations.tsx`:
```typescript
// Columns:
// - Email
// - Role
// - Invited by
// - Sent date
// - Expires
// - Status (Pending/Accepted)
// - Actions (Resend/Revoke)
```

### Team Members Table
- [ ] Update existing or create new:
```typescript
// Columns:
// - Name
// - Email
// - Role
// - Location
// - Joined date
// - Last active
// - Actions (Edit/Remove)
```

### Bulk Invite Component
- [ ] Create `/src/components/team/BulkInvite.tsx`:
```typescript
// CSV format:
// email,role,location
// john@example.com,TRAINER,Main Gym
// jane@example.com,CLUB_MANAGER,West Branch

// Features:
// - Paste from spreadsheet
// - Validate before sending
// - Show success/error per row
// - Download template
```

### Invitation Status Badge
- [ ] Create status component:
```typescript
function InvitationStatus({ invitation }) {
  if (invitation.acceptedAt) {
    return <Badge variant="success">Accepted</Badge>
  }
  if (invitation.expiresAt < new Date()) {
    return <Badge variant="destructive">Expired</Badge>
  }
  return <Badge variant="warning">Pending</Badge>
}
```

### Actions Implementation
- [ ] Resend invitation:
```typescript
async function handleResend(invitationId: string) {
  await fetch(`/api/invitations/${invitationId}/resend`, {
    method: 'POST'
  })
  // Refresh list
  // Show success toast
}
```

- [ ] Revoke invitation:
```typescript
async function handleRevoke(invitationId: string) {
  await fetch(`/api/invitations/${invitationId}`, {
    method: 'DELETE'
  })
  // Refresh list
  // Show success toast
}
```

### Role Change Modal
- [ ] Quick role change for existing members:
```typescript
function ChangeRoleModal({ user, onSave }) {
  // Dropdown with roles
  // Confirmation if downgrading
  // Save button
}
```

### Remove Member Confirmation
- [ ] Confirmation dialog:
```typescript
function RemoveMemberDialog({ user, onConfirm }) {
  // Warning about data preservation
  // Option to transfer ownership
  // Confirm button
}
```

## UI/UX Considerations
- Show invitation link for manual sharing
- Copy invitation link button
- Show remaining invitations (if limited)
- Search/filter invitations
- Sort by date, status
- Responsive design for mobile

## Acceptance Criteria
- [ ] Can view team members
- [ ] Can send invitations
- [ ] Can view pending invitations
- [ ] Can resend expired invitations
- [ ] Can revoke invitations
- [ ] Can change member roles
- [ ] Can remove members
- [ ] Bulk invite works

## Testing
- [ ] Send single invitation
- [ ] Send bulk invitations
- [ ] Resend invitation
- [ ] Revoke invitation
- [ ] Change user role
- [ ] Remove team member
- [ ] Search and filter work

## Permissions
- OWNER: All actions
- ADMIN: Invite, change roles (not OWNER)
- PT_MANAGER: Invite trainers only
- Others: View only

## Notes
- Consider invitation templates
- Add invitation history
- Track invitation metrics
- Consider approval workflow