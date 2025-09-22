# Task 19: Organization Context Middleware

**Complexity: 4/10**  
**Priority: CRITICAL (SaaS Foundation)**  
**Status: Not Started**  
**Dependencies: Task 18 (Data Migration)**  
**Estimated Time: 2 hours**

## Objective
Create middleware to automatically inject organization context into all requests and queries.

## Implementation Checklist

### Update NextAuth Session
- [ ] Modify `/src/lib/auth.ts` callbacks:
```typescript
callbacks: {
  async session({ session, token }) {
    if (token) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.organizationId = token.organizationId as string // ADD THIS
    }
    return session
  },
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      token.role = user.role
      token.organizationId = user.organizationId // ADD THIS
    }
    return token
  }
}
```

### Update Type Definitions
- [ ] Update `/src/types/next-auth.d.ts`:
```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      organizationId: string // ADD THIS
    }
  }
  interface User {
    id: string
    email: string
    name: string
    role: Role
    organizationId: string // ADD THIS
  }
}
```

### Create Organization Context Helper
- [ ] Create `/src/lib/organization-context.ts`:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getOrganizationId(): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    throw new Error('No organization context')
  }
  return session.user.organizationId
}

export function createOrgFilter(organizationId: string) {
  return { organizationId }
}
```

### Create Prisma Middleware
- [ ] Create `/src/lib/prisma-middleware.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

export function withOrganization(prisma: PrismaClient, orgId: string) {
  // This returns a wrapped prisma client that auto-filters
  // Implementation depends on needs
  return prisma
}
```

### Update API Route Helper
- [ ] Create `/src/lib/api-helpers.ts`:
```typescript
export async function withOrgContext(
  handler: (orgId: string, req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const orgId = await getOrganizationId()
    return handler(orgId, req)
  }
}
```

### Add Validation Middleware
- [ ] Create middleware to validate org access:
```typescript
export async function validateOrgAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return user?.organizationId === organizationId
}
```

## Update Pattern Example
Before:
```typescript
// API Route
const users = await prisma.user.findMany()
```

After:
```typescript
// API Route
const orgId = await getOrganizationId()
const users = await prisma.user.findMany({
  where: { organizationId: orgId }
})
```

## Testing Checklist
- [ ] User can only see their org's data
- [ ] Session includes organizationId
- [ ] API calls fail without org context
- [ ] Cross-org access is blocked

## Acceptance Criteria
- [ ] Session includes organizationId
- [ ] Helper functions work correctly
- [ ] Can get org context in API routes
- [ ] Can get org context in server components
- [ ] Existing auth still works

## Security Considerations
- Never trust client-provided organizationId
- Always get from authenticated session
- Validate user belongs to organization
- Log suspicious access attempts

## Notes
- Don't update all queries yet (that's Task 20)
- Just set up the infrastructure
- Keep backward compatibility for now
- This prepares for Task 20