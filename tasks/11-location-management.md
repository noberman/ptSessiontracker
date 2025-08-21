# Task 11: Location Management

**Complexity: 3/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Not Started**  
**Dependencies: Task 03A (User CRUD)**

## Objective
Implement location (gym club) management system with CRUD operations and multi-location access control.

## Requirements from PRD
- Multiple club locations support
- Location-based access control
- Location assignment for trainers and clients
- Location-based filtering throughout system

## Implementation Checklist

### Location CRUD Operations
- [ ] GET `/api/locations` - List all locations
- [ ] GET `/api/locations/[id]` - Get location details
- [ ] POST `/api/locations` - Create new location
- [ ] PUT `/api/locations/[id]` - Update location
- [ ] DELETE `/api/locations/[id]` - Soft delete

### Location Management Page
- [ ] List view of all locations
- [ ] Add new location button
- [ ] Edit location details
- [ ] Active/inactive status
- [ ] View assigned trainers
- [ ] View client count

### Location Form
- [ ] Location name (required)
- [ ] Address field
- [ ] City, state, zip
- [ ] Phone number
- [ ] Email address
- [ ] Manager assignment
- [ ] Active status toggle

### Location Assignment
- [ ] Assign trainers to location
- [ ] Assign clients to location
- [ ] Bulk reassignment tools
- [ ] Transfer between locations
- [ ] Assignment validation

### Access Control
- [ ] Club managers see only their location
- [ ] PT managers see multiple locations
- [ ] Admins see all locations
- [ ] Location-based data filtering
- [ ] Cross-location restrictions

### Location Dashboard
- [ ] Location statistics:
  - [ ] Active trainers
  - [ ] Total clients
  - [ ] Sessions this month
  - [ ] Revenue metrics
- [ ] Trainer list for location
- [ ] Recent activity

### Location Switching
- [ ] Location selector dropdown
- [ ] Remember last selected
- [ ] Quick switch interface
- [ ] Apply to all views
- [ ] Permission-based options

## Acceptance Criteria
- [ ] Locations can be created and edited
- [ ] Trainers properly assigned to locations
- [ ] Location filtering works throughout app
- [ ] Access control enforced properly
- [ ] Soft delete preserves data integrity
- [ ] Location statistics accurate

## Technical Notes
- Index foreign keys for performance
- Cache location list
- Validate location assignments
- Handle location deletion carefully
- Consider timezone per location

## Location Data Model
```typescript
interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  managerId?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  
  // Relations
  trainers: User[]
  clients: Client[]
  sessions: Session[]
}
```

## Location Hierarchy
```
Admin
  └─ All Locations

PT Manager
  ├─ Main Gym
  ├─ West Branch
  └─ North Branch

Club Manager
  └─ Main Gym (only)

Trainer
  └─ Assigned Location (only)
```

## Files to Create/Modify
- `/src/app/api/locations/route.ts`
- `/src/app/api/locations/[id]/route.ts`
- `/src/app/locations/page.tsx`
- `/src/app/locations/new/page.tsx`
- `/src/app/locations/[id]/edit/page.tsx`
- `/src/app/locations/[id]/page.tsx`
- `/src/components/locations/LocationForm.tsx`
- `/src/components/locations/LocationSelector.tsx`
- `/src/components/locations/LocationStats.tsx`
- `/src/hooks/useLocation.ts`