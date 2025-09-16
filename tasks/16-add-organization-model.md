# Task 16: Add Organization Model

**Complexity: 3/10**  
**Priority: CRITICAL (SaaS Foundation)**  
**Status: Not Started**  
**Dependencies: None**  
**Estimated Time: 2 hours**

## Objective
Create the Organization model as the top-level entity for multi-tenant architecture.

## Implementation Checklist

### Database Schema
- [ ] Add Organization model to schema.prisma:
```prisma
model Organization {
  id                String    @id @default(cuid())
  name              String
  email             String
  phone             String?
  subscriptionTier  SubscriptionTier @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  stripeCustomerId  String?   @unique
  stripeSubscriptionId String?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@map("organizations")
}

enum SubscriptionTier {
  FREE
  PRO
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
}
```

### Database Migration
- [ ] Run `npx prisma migrate dev --name add-organization-model`
- [ ] Verify migration created successfully
- [ ] Test migration runs without errors

### Basic CRUD API
- [ ] Create `/src/app/api/organizations/route.ts`:
  - [ ] GET - List organizations (admin only)
  - [ ] POST - Create new organization
- [ ] Create `/src/app/api/organizations/[id]/route.ts`:
  - [ ] GET - Get organization details
  - [ ] PUT - Update organization
  - [ ] DELETE - Soft delete (set status)

### Type Definitions
- [ ] Create `/src/types/organization.ts`:
```typescript
export interface Organization {
  id: string
  name: string
  email: string
  phone?: string
  subscriptionTier: 'FREE' | 'PRO'
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: Date
  updatedAt: Date
}
```

### Seed Data
- [ ] Update `/prisma/seed.ts`:
  - [ ] Create default "Wood Square Fitness" organization
  - [ ] Set as PRO tier
  - [ ] Add sample organization for testing

### Basic Validation
- [ ] Organization name required, min 2 characters
- [ ] Email must be valid format
- [ ] Phone optional but validated if provided
- [ ] Subscription tier must be valid enum

## Acceptance Criteria
- [ ] Organization model exists in database
- [ ] Can create organization via API
- [ ] Can retrieve organization via API
- [ ] Can update organization details
- [ ] Migration runs successfully
- [ ] Seed data includes organizations

## Testing
- [ ] Test organization creation
- [ ] Test validation rules
- [ ] Test API endpoints
- [ ] Verify database constraints

## Notes
- This is foundation - no UI needed yet
- Keep it simple, just the model and basic API
- Don't add relationships to other models yet (next task)
- Don't implement billing logic yet