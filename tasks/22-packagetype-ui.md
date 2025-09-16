# Task 22: Package Type Management UI

**Complexity: 4/10**  
**Priority: HIGH (SaaS Feature)**  
**Status: Not Started**  
**Dependencies: Task 21 (PackageType Model)**  
**Estimated Time: 2 hours**

## Objective
Create UI for organizations to manage their custom package types.

## Implementation Checklist

### Package Types Management Page
- [ ] Create `/src/app/(authenticated)/settings/package-types/page.tsx`
- [ ] List all organization's package types
- [ ] Show active/inactive status
- [ ] Sort by sortOrder
- [ ] Add "New Package Type" button

### Package Type Form Component
- [ ] Create `/src/components/package-types/PackageTypeForm.tsx`:
```typescript
interface PackageTypeFormData {
  name: string
  displayName: string
  description?: string
  defaultSessions?: number
  defaultPrice?: number
  isActive: boolean
  sortOrder: number
}
```
- [ ] Fields:
  - [ ] Internal name (lowercase, no spaces)
  - [ ] Display name (user-friendly)
  - [ ] Description (optional)
  - [ ] Default sessions (optional)
  - [ ] Default price (optional)
  - [ ] Active toggle
  - [ ] Sort order

### Package Type List Component
- [ ] Create `/src/components/package-types/PackageTypeList.tsx`
- [ ] Table with columns:
  - [ ] Display Name
  - [ ] Description
  - [ ] Default Sessions
  - [ ] Default Price
  - [ ] Status (Active/Inactive)
  - [ ] Actions (Edit, Toggle Active)
- [ ] Drag-and-drop to reorder

### Update Package Creation
- [ ] Modify `/src/components/packages/PackageForm.tsx`:
  - [ ] Replace hardcoded dropdown with dynamic package types
  - [ ] Load types from API
  - [ ] Only show active types
  - [ ] Pre-fill defaults if available

### Edit Package Type Page
- [ ] Create `/src/app/(authenticated)/settings/package-types/[id]/edit/page.tsx`
- [ ] Load existing type
- [ ] Show usage count (packages using this type)
- [ ] Warn before deactivating if in use

### Quick Actions
- [ ] Bulk activate/deactivate
- [ ] Reset to defaults option
- [ ] Clone package type

### Validation Rules
- [ ] Name must be unique per org
- [ ] Display name required
- [ ] Cannot delete if packages exist
- [ ] Cannot deactivate last active type

## UI/UX Considerations
- Show helper text explaining package types
- Preview how it appears to trainers
- Indicate which are default vs custom
- Show warning when editing types in use

## Acceptance Criteria
- [ ] Can view all package types
- [ ] Can create new package type
- [ ] Can edit existing types
- [ ] Can activate/deactivate types
- [ ] Can reorder types
- [ ] Package creation uses dynamic types
- [ ] Proper validation and error handling

## Testing
- [ ] Create new package type
- [ ] Edit package type
- [ ] Deactivate type
- [ ] Create package with custom type
- [ ] Verify type appears in dropdown
- [ ] Test validation rules

## Notes
- Admin/Owner only feature
- Changes apply immediately
- Consider caching type list
- Update package filters to use types