# Task 11: Location Management

**Complexity: 3/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: ✅ COMPLETE**  
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
- [x] GET `/api/locations` - List all locations
- [x] GET `/api/locations/[id]` - Get location details
- [x] POST `/api/locations` - Create new location
- [x] PUT `/api/locations/[id]` - Update location
- [x] DELETE `/api/locations/[id]` - Soft delete

### Location Management Page
- [x] List view of all locations
- [x] Add new location button
- [x] Edit location details
- [x] Active/inactive status
- [x] View assigned trainers
- [x] View client count

### Location Form
- [x] Location name (required)
- [ ] ~~Address field~~ (not needed per requirements)
- [ ] ~~City, state, zip~~ (not needed per requirements)
- [ ] ~~Phone number~~ (not needed per requirements)
- [ ] ~~Email address~~ (not needed per requirements)
- [ ] ~~Manager assignment~~ (not needed per requirements)
- [x] Active status toggle

### Location Assignment
- [x] Assign trainers to location (via user management)
- [x] Assign clients to location (via client creation)
- [ ] Bulk reassignment tools
- [ ] Transfer between locations
- [x] Assignment validation

### Access Control
- [x] Club managers see only their location
- [x] PT managers see multiple locations
- [x] Admins see all locations
- [x] Location-based data filtering
- [x] Cross-location restrictions

### Location Dashboard
- [x] Location statistics:
  - [x] Active trainers
  - [x] Total clients
  - [x] Sessions this month
  - [x] Revenue metrics
- [x] Trainer list for location
- [x] Recent activity (clients list)

### Location Switching
- [x] Location selector dropdown (in dashboards)
- [ ] Remember last selected
- [x] Quick switch interface
- [x] Apply to all views
- [x] Permission-based options

## Acceptance Criteria
- [x] Locations can be created and edited
- [x] Trainers properly assigned to locations
- [x] Location filtering works throughout app
- [x] Access control enforced properly
- [x] Soft delete preserves data integrity
- [x] Location statistics accurate

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