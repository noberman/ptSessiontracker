# Schema Improvements Needed

## Package Types - Remove or Make Customizable

### Current Issue
The `packageType` enum in the schema is hardcoded with organization-specific values:
- `PRIME` 
- `ELITE`
- `TRANSFORMATION`

These package types are specific to Wood Square Fitness and won't be relevant for other organizations using the platform.

### Proposed Solutions

#### Option 1: Remove Package Types Entirely
- Remove the `packageType` field from the Package model
- Simplify the schema to focus on session counts and expiration dates
- Package differentiation would be based on:
  - Number of sessions
  - Price
  - Expiration period
  - Custom package names

#### Option 2: Make Package Types Customizable
- Convert `packageType` from an enum to a relation
- Create a new `PackageType` model:
  ```prisma
  model PackageType {
    id          String    @id @default(cuid())
    name        String
    description String?
    locationId  String?
    location    Location? @relation(fields: [locationId], references: [id])
    packages    Package[]
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
  }
  ```
- Allow each location/organization to define their own package types
- Provide default types that can be customized

### Migration Impact
- Will require a database migration
- Need to update all references to packageType throughout the codebase
- Update the package creation/editing forms
- Adjust commission calculation logic if it depends on package types

### Recommendation
**Option 2 (Make Customizable)** is recommended as it provides flexibility while maintaining the ability to categorize packages for reporting and commission purposes.

### Implementation Priority
Medium - This change will improve platform scalability but existing functionality works for current users.