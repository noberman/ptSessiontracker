# Task 17: Add organizationId to Existing Models

**Complexity: 2/10**  
**Priority: CRITICAL (SaaS Foundation)**  
**Status: Not Started**  
**Dependencies: Task 16 (Organization Model)**  
**Estimated Time: 1 hour**

## Objective
Add organizationId field to all existing models to establish multi-tenant relationships.

## Implementation Checklist

### Update Schema.prisma
- [ ] Add to User model:
```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id])
```

- [ ] Add to Location model:
```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id])
```

- [ ] Add to CommissionTier model:
```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id])
```

- [ ] Add to PackageTemplate model:
```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id])
```

- [ ] Update Organization model with relations:
```prisma
locations         Location[]
users             User[]
commissionTiers   CommissionTier[]
packageTemplates  PackageTemplate[]
```

### Create Migration
- [ ] Run `npx prisma migrate dev --name add-organization-relationships`
- [ ] Verify migration created successfully
- [ ] Check migration file for correctness

### Update Type Definitions
- [ ] Update `/src/types/user.ts` to include organizationId
- [ ] Update `/src/types/location.ts` to include organizationId
- [ ] Create types for other models if they don't exist

### Verify Relationships
- [ ] Test that Prisma client generates correctly
- [ ] Verify no TypeScript errors
- [ ] Check that relations are properly defined

## Important Notes
- Keep fields **nullable** (String?) for now - we'll populate them in Task 18
- Don't add organizationId to Client, Session, Package yet (they inherit through relationships)
- Don't update any queries yet - just schema changes
- Don't break existing functionality

## Acceptance Criteria
- [ ] All models have organizationId field
- [ ] Migration runs without errors
- [ ] Existing data still works (nullable fields)
- [ ] TypeScript types updated
- [ ] No runtime errors

## Testing
- [ ] Run migration locally
- [ ] Verify app still starts
- [ ] Check existing features still work
- [ ] Verify Prisma studio shows new fields

## Next Steps
After this task, Task 18 will populate these fields with data for existing Wood Square records.