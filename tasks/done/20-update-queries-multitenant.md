# Task 20: Update All Queries for Multi-tenant Isolation

**Complexity: 5/10**  
**Priority: CRITICAL (SaaS Foundation)**  
**Status: Not Started**  
**Dependencies: Task 19 (Organization Context)**  
**Estimated Time: 3 hours**

## Objective
Update all database queries to filter by organizationId, ensuring complete data isolation between organizations.

## Implementation Checklist

### API Routes to Update

#### Users API (`/api/users/`)
- [ ] GET `/api/users/route.ts` - Add orgId filter
- [ ] POST `/api/users/route.ts` - Set orgId on create
- [ ] GET `/api/users/[id]/route.ts` - Verify org match
- [ ] PUT `/api/users/[id]/route.ts` - Verify org match
- [ ] DELETE `/api/users/[id]/route.ts` - Verify org match

#### Locations API (`/api/locations/`)
- [ ] GET `/api/locations/route.ts` - Add orgId filter
- [ ] POST `/api/locations/route.ts` - Set orgId on create
- [ ] GET `/api/locations/[id]/route.ts` - Verify org match
- [ ] PUT `/api/locations/[id]/route.ts` - Verify org match

#### Clients API (`/api/clients/`)
- [ ] GET `/api/clients/route.ts` - Filter by trainer's org
- [ ] POST `/api/clients/route.ts` - Inherit org from trainer
- [ ] GET `/api/clients/[id]/route.ts` - Verify org access
- [ ] PUT `/api/clients/[id]/route.ts` - Verify org access
- [ ] Import route - Set org context

#### Sessions API (`/api/sessions/`)
- [ ] GET `/api/sessions/route.ts` - Filter by trainer's org
- [ ] POST `/api/sessions/route.ts` - Inherit org
- [ ] Validation routes - Check org access

#### Packages API (`/api/packages/`)
- [ ] GET `/api/packages/route.ts` - Filter by client's org
- [ ] POST `/api/packages/route.ts` - Inherit from client
- [ ] Templates - Filter by org

#### Dashboard API (`/api/dashboard/`)
- [ ] All dashboard queries - Add org context
- [ ] Statistics calculations - Org-specific

### Query Update Pattern

Before:
```typescript
const users = await prisma.user.findMany({
  where: { role: 'TRAINER' }
})
```

After:
```typescript
const orgId = await getOrganizationId()
const users = await prisma.user.findMany({
  where: { 
    role: 'TRAINER',
    organizationId: orgId
  }
})
```

### Server Components to Update
- [ ] `/app/(authenticated)/users/page.tsx`
- [ ] `/app/(authenticated)/clients/page.tsx`
- [ ] `/app/(authenticated)/sessions/page.tsx`
- [ ] `/app/(authenticated)/packages/page.tsx`
- [ ] `/app/(authenticated)/locations/page.tsx`
- [ ] All dashboard pages

### Special Cases

#### Cross-Organization Queries (Block These)
- [ ] Validate trainer can only see their org's clients
- [ ] Validate sessions only visible within org
- [ ] Block client reassignment across orgs

#### Inheritance Rules
- [ ] Client inherits org from primary trainer
- [ ] Session inherits org from trainer
- [ ] Package inherits org from client

### Testing Queries
Create test to verify isolation:
```typescript
// Test: User from Org A cannot see Org B data
const orgAUser = await createUser({ organizationId: 'org-a' })
const orgBUser = await createUser({ organizationId: 'org-b' })

// When querying as orgAUser
const users = await getUsersForOrg('org-a')
expect(users).not.toContain(orgBUser)
```

### Make organizationId Required
- [ ] Update schema to make organizationId required:
```prisma
organizationId String // Remove the ?
organization   Organization @relation(...)
```
- [ ] Run migration after all queries updated

## Acceptance Criteria
- [ ] No query returns cross-org data
- [ ] All creates set organizationId
- [ ] All updates verify org ownership
- [ ] Deletes only affect own org
- [ ] Dashboard shows org-specific data only

## Testing Checklist
- [ ] Create 2 test organizations
- [ ] Create data in each
- [ ] Login as user from Org A
- [ ] Verify cannot see Org B data
- [ ] Verify cannot modify Org B data
- [ ] Test all major features

## Common Mistakes to Avoid
- Don't forget nested includes
- Check aggregation queries
- Validate in both API and UI
- Don't trust client-provided IDs
- Always verify ownership before updates

## Rollback Plan
- Keep orgId nullable initially
- Test thoroughly in staging
- Have backup of queries
- Can revert middleware if needed

## Notes
- This is the most critical security task
- Take time to test thoroughly
- Every query must be checked
- Consider adding automated tests