# Task 29: Organization Settings Page

**Complexity: 3/10**  
**Priority: HIGH (Core Feature)**  
**Status: Not Started**  
**Dependencies: Task 20 (Multi-tenant)**  
**Estimated Time: 2 hours**

## Objective
Create organization settings page for managing organization profile and preferences.

## Implementation Checklist

### Settings Layout
- [ ] Create `/src/app/(authenticated)/settings/layout.tsx`:
```typescript
// Sidebar navigation:
// - General (Organization profile)
// - Team (Member management)
// - Billing (Subscription)
// - Package Types
// - Commission Tiers
// - Integrations (future)
// - Security (future)
```

### Organization Profile Page
- [ ] Create `/src/app/(authenticated)/settings/page.tsx`:
```typescript
// Fields:
// - Organization name
// - Contact email
// - Phone number
// - Time zone
// - Business hours
// - Address (optional)
// - Logo upload (future)
```

### Organization Form Component
- [ ] Create `/src/components/settings/OrganizationForm.tsx`:
```typescript
interface OrganizationFormData {
  name: string
  email: string
  phone?: string
  timezone: string
  businessHours?: {
    monday: { open: string; close: string }
    // ... other days
  }
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
}
```

### Update Organization API
- [ ] Update `/src/app/api/organizations/[id]/route.ts`:
```typescript
export async function PUT(req: Request) {
  const orgId = await getOrganizationId()
  const data = await req.json()
  
  // Validate user is OWNER or ADMIN
  const user = await getCurrentUser()
  if (!['OWNER', 'ADMIN'].includes(user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      // Store additional settings in JSON field
      settings: {
        timezone: data.timezone,
        businessHours: data.businessHours,
        address: data.address
      }
    }
  })
  
  return Response.json({ organization: updated })
}
```

### Settings Navigation Component
- [ ] Create `/src/components/settings/SettingsNav.tsx`:
```typescript
const settingsLinks = [
  { href: '/settings', label: 'General', icon: Settings },
  { href: '/settings/team', label: 'Team', icon: Users },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings/package-types', label: 'Package Types', icon: Package },
  { href: '/settings/commission', label: 'Commission', icon: DollarSign }
]
```

### Usage Statistics Widget
- [ ] Show on settings dashboard:
```typescript
function UsageStats({ organization }) {
  return (
    <Card>
      <CardHeader>Usage This Month</CardHeader>
      <CardContent>
        <div>Trainers: {trainersCount} / {limit}</div>
        <div>Sessions: {sessionsCount} / {limit}</div>
        <div>Storage: {storageUsed} / {limit}</div>
      </CardContent>
    </Card>
  )
}
```

### Danger Zone Section
- [ ] Add organization deletion (OWNER only):
```typescript
function DangerZone() {
  // Only show to OWNER
  return (
    <Card className="border-red-500">
      <CardHeader>Danger Zone</CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={handleDelete}>
          Delete Organization
        </Button>
        <p className="text-sm text-muted">
          This will permanently delete all data
        </p>
      </CardContent>
    </Card>
  )
}
```

### Organization Logo Upload (Basic)
- [ ] Add logo field to schema:
```prisma
logoUrl String?
```
- [ ] Simple URL input for now
- [ ] Display in header when set

### Notification Preferences
- [ ] Add preferences section:
```typescript
// Email notifications:
// - New session validations
// - Monthly reports
// - Payment updates
// - Team changes
```

## Acceptance Criteria
- [ ] Can view organization details
- [ ] Can update organization info
- [ ] Settings sidebar navigation works
- [ ] Only OWNER/ADMIN can edit
- [ ] Changes save successfully
- [ ] Usage stats display correctly

## Testing
- [ ] Update organization name
- [ ] Update contact info
- [ ] Navigate between settings
- [ ] Test permission restrictions
- [ ] Verify changes persist

## Permissions
- OWNER: Full access
- ADMIN: Edit most settings
- Others: View only

## Future Enhancements
- Custom branding/theming
- API keys management
- Webhook configuration
- Data export settings
- Audit log viewer
- Advanced security settings

## Notes
- Keep it simple initially
- Focus on essential settings
- Add advanced features later
- Consider settings versioning