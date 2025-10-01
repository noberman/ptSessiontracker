# Task 33: Organization Switcher

**Complexity: 3/10**  
**Priority: LOW (Future Enhancement)**  
**Status: Not Started**  
**Dependencies: Task 20 (Multi-tenant)**  
**Estimated Time: 2 hours**

## Current State (as of Dec 2024)
**IMPORTANT**: The database foundation for multi-org support has been partially implemented:
- ✅ Email unique constraint removed from User model
- ✅ Compound unique constraint added: (email + organizationId)
- ✅ Same email can exist in multiple organizations
- ⚠️ **BUT**: Currently requires separate user accounts (different passwords) for each org
- ⚠️ **NOT IMPLEMENTED**: True organization switching with single sign-on
- ⚠️ **CURRENT BEHAVIOR**: User must log out and log in with credentials for different org

This task describes the FULL implementation needed for proper organization switching with a single user account.

## Objective
Allow users who belong to multiple organizations to switch between them without logging out.

## Implementation Checklist

### Update User Model
- [ ] Add many-to-many relationship:
```prisma
model User {
  // ... existing fields ...
  organizations UserOrganization[]
  activeOrganizationId String?
  activeOrganization Organization? @relation(fields: [activeOrganizationId], references: [id])
}

model UserOrganization {
  id             String @id @default(cuid())
  userId         String
  user           User @relation(fields: [userId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  role           Role
  joinedAt       DateTime @default(now())
  
  @@unique([userId, organizationId])
  @@map("user_organizations")
}
```

### Create Organization Switcher Component
- [ ] Create `/src/components/navigation/OrgSwitcher.tsx`:
```typescript
function OrgSwitcher() {
  const session = useSession()
  const [organizations, setOrganizations] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    fetchUserOrganizations()
  }, [])
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            <span>{currentOrg.name}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent>
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organizations.map(org => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
          >
            <Check 
              className={cn(
                "h-4 w-4 mr-2",
                org.id === currentOrg.id ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="flex flex-col">
              <span>{org.name}</span>
              <span className="text-xs text-muted">{org.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={createNewOrg}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Switch Organization API
- [ ] Create `/src/app/api/organizations/switch/route.ts`:
```typescript
export async function POST(req: Request) {
  const { organizationId } = await req.json()
  const userId = await getCurrentUserId()
  
  // Verify user has access to organization
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    }
  })
  
  if (!membership) {
    return Response.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Update active organization
  await prisma.user.update({
    where: { id: userId },
    data: { activeOrganizationId: organizationId }
  })
  
  // Update session
  // This depends on your auth implementation
  // May need to refresh JWT token
  
  return Response.json({ success: true })
}
```

### Update Auth Context
- [ ] Modify session to use active organization:
```typescript
// In auth callbacks
async session({ session, token }) {
  const user = await prisma.user.findUnique({
    where: { id: token.id },
    include: { activeOrganization: true }
  })
  
  session.user.organizationId = user.activeOrganizationId || user.organizationId
  session.user.organization = user.activeOrganization
  
  return session
}
```

### Get User Organizations API
- [ ] Create `/src/app/api/user/organizations/route.ts`:
```typescript
export async function GET() {
  const userId = await getCurrentUserId()
  
  const memberships = await prisma.userOrganization.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          subscriptionTier: true
        }
      }
    }
  })
  
  return Response.json({ organizations: memberships })
}
```

### Add to Navigation
- [ ] Update main navigation:
```typescript
<nav>
  <div className="px-4 py-2">
    <OrgSwitcher />
  </div>
  <Separator />
  {/* Rest of navigation */}
</nav>
```

### Remember Last Organization
- [ ] Store in localStorage:
```typescript
function switchOrganization(orgId: string) {
  localStorage.setItem('lastOrganizationId', orgId)
  // API call to switch
  // Reload page or update context
}
```

### Handle Organization Invites
- [ ] When accepting invite to new org:
```typescript
// If user already exists
if (existingUser) {
  // Add to new organization
  await prisma.userOrganization.create({
    data: {
      userId: existingUser.id,
      organizationId: invitation.organizationId,
      role: invitation.role
    }
  })
  
  // Switch to new org
  await prisma.user.update({
    where: { id: existingUser.id },
    data: { activeOrganizationId: invitation.organizationId }
  })
}
```

### Visual Indicators
- [ ] Show current org in header
- [ ] Badge for notification count per org
- [ ] Different color themes per org (future)

## Acceptance Criteria
- [ ] Can see all organizations
- [ ] Can switch between orgs
- [ ] Session updates on switch
- [ ] Data isolation maintained
- [ ] Remember last selected
- [ ] Can join multiple orgs

## Testing
- [ ] Create user with 1 org
- [ ] Invite to second org
- [ ] Accept invitation
- [ ] Switch between orgs
- [ ] Verify data isolation
- [ ] Check permissions per org

## Edge Cases
- User removed from org while active
- Organization deleted
- Subscription expired
- Different roles in different orgs
- Concurrent sessions

## Future Enhancements
- Organization profiles/avatars
- Quick switcher keyboard shortcut
- Recent organizations
- Favorite organizations
- SSO per organization

## Notes
- Rare use case initially
- Most users single org
- Consider performance impact
- May need session refresh