# Task 21: Create PackageType Model

**Complexity: 3/10**  
**Priority: HIGH (SaaS Feature)**  
**Status: Not Started**  
**Dependencies: Task 20 (Multi-tenant queries)**  
**Estimated Time: 2 hours**

## Objective
Replace hardcoded package types (PRIME/ELITE) with organization-specific PackageType model.

## Implementation Checklist

### Database Schema
- [ ] Add PackageType model to schema.prisma:
```prisma
model PackageType {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String    // "Basic", "Premium", "Elite", etc.
  displayName     String    // User-friendly name
  description     String?
  defaultSessions Int?      // Default session count
  defaultPrice    Float?    // Default price
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  
  packages        Package[] // Packages using this type
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("package_types")
}
```

- [ ] Update Package model:
```prisma
model Package {
  // ... existing fields ...
  packageTypeId   String?
  packageType     PackageType? @relation(fields: [packageTypeId], references: [id])
  // Remove or deprecate packageType string field
}
```

- [ ] Update Organization model:
```prisma
model Organization {
  // ... existing fields ...
  packageTypes    PackageType[]
}
```

### Create Migration
- [ ] Run `npx prisma migrate dev --name add-package-types`
- [ ] Verify migration successful

### Default Package Types
Create seed function for new organizations:
```typescript
const defaultPackageTypes = [
  { name: 'basic', displayName: 'Basic Package', defaultSessions: 5 },
  { name: 'standard', displayName: 'Standard Package', defaultSessions: 10 },
  { name: 'premium', displayName: 'Premium Package', defaultSessions: 20 },
  { name: 'elite', displayName: 'Elite Package', defaultSessions: 30 }
]
```

### Migration Script for Existing Data
- [ ] Create `/scripts/migrate-package-types.ts`:
  - [ ] Create package types for Wood Square
  - [ ] Map existing PRIME → Premium
  - [ ] Map existing ELITE → Elite
  - [ ] Update all existing packages

### CRUD API
- [ ] Create `/src/app/api/package-types/route.ts`:
  - [ ] GET - List org's package types
  - [ ] POST - Create new type
- [ ] Create `/src/app/api/package-types/[id]/route.ts`:
  - [ ] GET - Get type details
  - [ ] PUT - Update type
  - [ ] DELETE - Soft delete (set inactive)

### Type Definitions
- [ ] Create `/src/types/package-type.ts`

## Acceptance Criteria
- [ ] PackageType model exists
- [ ] Can create custom package types per org
- [ ] Existing packages migrated
- [ ] API endpoints working
- [ ] Default types created for new orgs

## Testing
- [ ] Create package type
- [ ] Update package type
- [ ] Verify org isolation
- [ ] Test migration script
- [ ] Verify packages link correctly

## Notes
- Keep backward compatibility temporarily
- Don't remove old packageType field yet
- Focus on model and API only
- UI comes in Task 22