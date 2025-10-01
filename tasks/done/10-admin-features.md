# Task 10: Super Admin Features (Beta Management)

**Complexity: 5/10** (Reduced from 7/10)  
**Priority: HIGH (Critical for Beta Phase)**  
**Status: Not Started**  
**Dependencies: Authentication system, Organization structure**  
**Estimated Time: 10-12 hours**

## Objective
Implement a focused super admin system that allows Noah to effectively debug beta tester issues by: 
1. Seeing exactly what users see (Login As)
2. Exporting and cloning organization data for local debugging
3. Tracking issues with simple notes

## Core Problem Being Solved
Beta testers (non-technical gym operators) will encounter issues they can't properly describe. We need to:
1. See exactly what they see (Login As)
2. Reproduce their bugs locally with their exact data (Clone & Debug)
3. Fix issues without touching production data

## Implementation Approach

### PRODUCTION Features (What Beta Testers Will Use)

#### Phase 1: Super Admin Foundation (30 min)
- [ ] Add SUPER_ADMIN role to User model:
```prisma
enum Role {
  TRAINER
  PT_MANAGER
  CLUB_MANAGER
  ADMIN
  SUPER_ADMIN  // Platform administrator
}
```

- [ ] Database-based super admin (NOT hardcoded):
```typescript
// Check role from database - more flexible and secure
async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'SUPER_ADMIN'
}

// Initial super admin setup (run once via seed script)
await prisma.user.create({
  data: {
    email: 'admin@fitventures.sg',
    name: 'Platform Admin',
    role: 'SUPER_ADMIN',
    password: await hash(process.env.SUPER_ADMIN_INITIAL_PASSWORD!),
    active: true
    // No organizationId - platform-wide access
  }
})
```

- [ ] Middleware redirect:
```typescript
// Check role and redirect to super admin dashboard
if (session.user.role === 'SUPER_ADMIN') {
  return redirect('/super-admin')
}
```

#### Phase 2: Super Admin Dashboard (2 hours)
- [ ] Create `/super-admin/page.tsx` with organization list:
```typescript
interface OrgListItem {
  id: string
  name: string
  plan: 'FREE' | 'GROWTH' | 'SCALE'
  createdAt: Date
  lastActivity: Date  // Last login by any user
  userCount: number
  sessionCount: number
  hasRealData: boolean  // Has non-demo sessions
}
```

- [ ] Simple table with actions:
```typescript
<Table>
  <Row>
    <Cell>{org.name}</Cell>
    <Cell>{org.plan}</Cell>
    <Cell>{timeAgo(org.lastActivity)}</Cell>  // "2 hours ago"
    <Cell>{org.userCount} users</Cell>
    <Cell>
      <Button onClick={loginAs(org.id)}>Login As →</Button>
      <Button onClick={exportData(org.id)}>Export Data</Button>
      <Button onClick={viewNotes(org.id)}>Notes</Button>
    </Cell>
  </Row>
</Table>
```

#### Phase 3: Login As Feature (4 hours) - CRITICAL
- [ ] **Fully Interactive** temporary token approach (can perform actions as user):
```typescript
// /api/super-admin/login-as
async function loginAs(request: Request) {
  // 1. Verify requester is super admin (check database role)
  const isAdmin = await isSuperAdmin(session.user.id)
  if (!isAdmin) {
    return forbidden()
  }
  
  // 2. Get target user (usually org admin)
  const targetUser = await prisma.user.findFirst({
    where: { 
      organizationId: request.orgId,
      role: 'ADMIN'
    }
  })
  
  // 3. Create temporary token in database (expires in 1 hour)
  const tempToken = await prisma.tempAuthToken.create({
    data: {
      token: cuid(),
      userId: targetUser.id,
      adminId: session.user.id,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      metadata: {
        organizationId: request.orgId,
        targetUserName: targetUser.name,
        reason: request.reason || 'Beta support'
      }
    }
  })
  
  // 4. Log this action for audit trail
  await prisma.adminAuditLog.create({
    data: {
      adminId: session.user.id,
      action: 'LOGIN_AS_START',
      targetUserId: targetUser.id,
      targetOrgId: request.orgId,
      metadata: { reason: request.reason }
    }
  })
  
  // 5. Return URL with token (opens in new tab)
  return { 
    url: `/auth/temp-login?token=${tempToken.token}`,
    expiresAt: tempToken.expiresAt
  }
}
```

- [ ] Visual indicator during impersonation:
```typescript
// Show banner at top of every page
{session?.impersonating && (
  <div className="bg-red-500 text-white p-2 text-center fixed top-0 w-full z-50">
    ⚠️ SUPER ADMIN MODE - Viewing as {session.user.name} from {session.organization.name}
    <button onClick={closeTab}>✕ Exit Admin Mode</button>
  </div>
)}
```

- [ ] Auto-revoke token on tab close:
```typescript
// Client-side: Revoke token when tab closes
useEffect(() => {
  const handleTabClose = async () => {
    if (session?.tempToken) {
      await fetch('/api/auth/revoke-token', {
        method: 'POST',
        body: JSON.stringify({ token: session.tempToken }),
        keepalive: true  // Ensures request completes even as tab closes
      })
    }
  }
  
  window.addEventListener('beforeunload', handleTabClose)
  return () => window.removeEventListener('beforeunload', handleTabClose)
}, [session])

// Server-side: Mark token as revoked
async function revokeToken(token: string) {
  await prisma.tempAuthToken.update({
    where: { token },
    data: { 
      revokedAt: new Date(),
      usedAt: new Date()  // Prevents reuse
    }
  })
  
  // Log the end of impersonation
  await prisma.adminAuditLog.create({
    data: {
      action: 'LOGIN_AS_END',
      // ... other fields
    }
  })
}
```

#### Phase 4: Data Export - JSON Format (2 hours)
- [ ] Export as JSON (not SQL) for flexibility:
```typescript
// /api/super-admin/export
async function exportOrganization(orgId: string) {
  // JSON format chosen because:
  // - Human-readable for debugging
  // - Can modify before importing (fix data issues)
  // - Platform agnostic
  // - Works with version control
  // - Allows partial imports
  
  const data = {
    metadata: {
      exportedAt: new Date(),
      exportedBy: session.user.email,
      organizationId: orgId,
      version: '1.0',
      recordCounts: {
        users: 0,
        clients: 0,
        sessions: 0,
        packages: 0
      }
    },
    organization: await prisma.organization.findUnique({ where: { id: orgId } }),
    users: await prisma.user.findMany({ where: { organizationId: orgId } }),
    clients: await prisma.client.findMany({ where: { organizationId: orgId } }),
    packages: await prisma.package.findMany({ where: { organizationId: orgId } }),
    sessions: await prisma.session.findMany({ where: { organizationId: orgId } }),
    commissionTiers: await prisma.commissionTier.findMany({ where: { organizationId: orgId } }),
    locations: await prisma.location.findMany({ where: { organizationId: orgId } })
  }
  
  // Update counts
  data.metadata.recordCounts = {
    users: data.users.length,
    clients: data.clients.length,
    sessions: data.sessions.length,
    packages: data.packages.length
  }
  
  return Response.json(data, {
    headers: {
      'Content-Disposition': `attachment; filename="${orgId}_export_${Date.now()}.json"`
    }
  })
}
```

#### Phase 5: Simple Notes System (1 hour)
- [ ] Add notes to Organization model:
```prisma
model Organization {
  // ... existing fields
  adminNotes    String?   @db.Text  // Simple text field for now
  lastIssue     String?   // Quick description of last problem
  lastIssueDate DateTime? // When it happened
}
```

- [ ] Notes UI in super admin dashboard:
```typescript
<NotesSection orgId={orgId}>
  <TextArea 
    value={notes} 
    onChange={updateNotes}
    placeholder="Track issues, conversations, fixes..."
  />
  <Input 
    value={lastIssue}
    placeholder="Last issue: Commission showing wrong for..."
  />
  <Button onClick={saveNotes}>Save Notes</Button>
</NotesSection>
```

### LOCAL-ONLY Features (Development Environment)

#### Phase 6: Clone Import System (3 hours)
**Purpose**: Reproduce exact bugs locally with production data for safe debugging

- [ ] Environment check for safety:
```typescript
// Only allow clone import in local development
function canImportClone(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_CLONE_IMPORT === 'true' &&
    !process.env.DATABASE_URL?.includes('railway') && // Not production DB
    !process.env.DATABASE_URL?.includes('supabase')    // Not any cloud DB
  )
}
```

- [ ] Import interface at `/super-admin/import-clone`:
```typescript
interface CloneImporter {
  // Upload the JSON export from production
  file: File
  
  // Options
  prefix: string  // Default: "CLONE_"
  resetPasswords: boolean  // Default: true (all passwords become 'test123')
  preserveRelationships: boolean  // Default: true (maintain all data links)
}
```

- [ ] Clone creation logic:
```typescript
async function importClone(data: ExportedData) {
  // 1. Create cloned organization
  const clonedOrg = await prisma.organization.create({
    data: {
      ...data.organization,
      id: undefined,  // New ID
      name: `CLONE_${data.organization.name}_${Date.now()}`,
      stripeCustomerId: null,  // Clear Stripe
      isClone: true,  // Mark as clone
    }
  })
  
  // 2. Clone users with email prefix
  for (const user of data.users) {
    await prisma.user.create({
      data: {
        ...user,
        id: undefined,
        email: `clone_${user.email}`,  // Prevent conflicts
        password: await hash('test123'),  // Same password for all
        organizationId: clonedOrg.id
      }
    })
  }
  
  // 3. Clone all related data with new IDs
  // ... clients, packages, sessions, etc.
  
  return clonedOrg
}
```

- [ ] Visual indicators for clones:
```typescript
// Show clearly in UI that this is a clone
{org.isClone && (
  <Badge className="bg-purple-500">
    🧪 CLONE - {org.clonedFrom} - Safe to break!
  </Badge>
)}
```

#### Phase 7: Clone Management (30 min)
- [ ] List all clones:
```typescript
const clones = await prisma.organization.findMany({
  where: { isClone: true },
  orderBy: { createdAt: 'desc' }
})
```

- [ ] Bulk cleanup:
```typescript
// Delete all test clones with one click
async function deleteAllClones() {
  const clones = await prisma.organization.findMany({
    where: { isClone: true }
  })
  
  for (const clone of clones) {
    // Delete all related data cascade
    await prisma.organization.delete({
      where: { id: clone.id }
    })
  }
}
```

## Complete Debug Workflow

1. **Beta tester reports**: "My commission is showing wrong"
2. **You open super admin dashboard**
3. **Click "Login As"** → Opens their exact view in new tab
4. **See the issue** → Take screenshot, understand problem
5. **Click "Export Data"** → Download their complete data
6. **Close tab** → Ends impersonation
7. **In LOCAL environment** → Go to `/super-admin/import-clone`
8. **Upload export** → Creates perfect replica
9. **Debug locally** → Reproduce issue with exact data
10. **Test fix** → Verify solution works
11. **Deploy fix** → Push to staging → production
12. **Clean up clone** → Delete when done

## Security Considerations

1. **Super Admin Access**:
   - Role stored in database (more flexible than hardcoding)
   - Only specific users can have SUPER_ADMIN role
   - Cannot self-assign role (must be done via database)
   - Full audit log of all actions

2. **Login As Security**:
   - Temporary tokens only (1 hour max)
   - New tab isolation
   - Clear visual indicators
   - Cannot perform destructive actions
   - Auto-logout on tab close

3. **Data Export Security**:
   - Only super admin can export
   - Exports logged with timestamp
   - No automatic exports

4. **Clone Safety**:
   - Only works in development
   - Clones clearly marked
   - Different email addresses
   - Cannot connect to production services

## What We're NOT Building (Simplifications)

- ❌ Complex health metrics (they'll tell you if something's wrong)
- ❌ Automated monitoring (not needed for 5-10 orgs)
- ❌ Quick fix buttons (can fix in database if needed)
- ❌ Activity tracking (overkill for beta)
- ❌ Communication hub (they'll email/text you)
- ❌ Real-time updates (manual refresh is fine)

## Success Metrics

- [ ] Can see exactly what beta tester sees in < 10 seconds
- [ ] Can export and clone org data in < 2 minutes
- [ ] Can reproduce reported issues locally 100% of time
- [ ] Beta testers never need to share passwords
- [ ] All admin actions are logged

## Database Changes

```prisma
// Add to schema.prisma

enum Role {
  TRAINER
  PT_MANAGER
  CLUB_MANAGER
  ADMIN
  SUPER_ADMIN  // New
}

model Organization {
  // ... existing fields
  adminNotes    String?   @db.Text
  lastIssue     String?
  lastIssueDate DateTime?
  isClone       Boolean   @default(false)  // For local clones
  clonedFrom    String?   // Original org ID
  clonedAt      DateTime?
}

model AdminAuditLog {
  id            String   @id @default(cuid())
  adminId       String
  action        String   // LOGIN_AS, EXPORT_DATA, etc.
  targetUserId  String?
  targetOrgId   String?
  metadata      Json?
  createdAt     DateTime @default(now())
  
  admin         User     @relation(fields: [adminId], references: [id])
  
  @@map("admin_audit_logs")
}

model TempAuthToken {
  id            String    @id @default(cuid())
  token         String    @unique @default(cuid())
  userId        String    // User being impersonated
  adminId       String    // Super admin who created it
  expiresAt     DateTime  // Auto-expire after 1 hour
  usedAt        DateTime? // When first used
  revokedAt     DateTime? // When tab closed or manually revoked
  metadata      Json?     // Store org info, reason, etc.
  createdAt     DateTime  @default(now())
  
  user          User      @relation("TokenUser", fields: [userId], references: [id])
  admin         User      @relation("TokenAdmin", fields: [adminId], references: [id])
  
  @@index([token])
  @@index([expiresAt])
  @@map("temp_auth_tokens")
}
```

## Files to Create/Modify

### Production Files
- `/src/app/super-admin/page.tsx` - Main dashboard
- `/src/app/super-admin/layout.tsx` - Custom layout (no regular nav)
- `/src/app/api/super-admin/login-as/route.ts` - Generate temp token
- `/src/app/api/super-admin/export/route.ts` - Export org data
- `/src/app/api/super-admin/notes/route.ts` - Save notes
- `/src/app/auth/temp-login/page.tsx` - Handle temp token login
- `/src/components/super-admin/ImpersonationBanner.tsx` - Red warning banner

### Local-Only Files
- `/src/app/super-admin/import-clone/page.tsx` - Import UI
- `/src/app/api/super-admin/import-clone/route.ts` - Clone creation
- `/src/app/api/super-admin/delete-clones/route.ts` - Cleanup

### Modify
- `/src/middleware.ts` - Add super admin routing
- `/src/lib/auth.ts` - Handle temp tokens
- `/prisma/schema.prisma` - Add models

## Implementation Priority

1. **Week 1**: Super admin dashboard + Login As (CRITICAL)
2. **Week 1**: Data export (CRITICAL)
3. **Week 2**: Clone import system (HIGH)
4. **Week 2**: Notes system (MEDIUM)

## Next Steps
- Implement this before beta launch
- Test with fake issue scenarios
- Document the debug workflow for future reference