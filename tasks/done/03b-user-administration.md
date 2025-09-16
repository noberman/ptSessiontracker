# Task 03B: User Administration

**Complexity: 4/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Partially Complete**  
**Dependencies: Task 03A (User CRUD)**

## Objective
Implement administrative functions for managing user roles, permissions, location assignments, and account status.

## Requirements from PRD
- Role management and assignment
- Location assignment for trainers
- Active/inactive status management
- Permission-based access control

## Implementation Checklist

### Role Management
- [x] Role change interface for admins
- [x] Validate role change permissions
- [x] Prevent last admin removal ✅ COMPLETE
- [ ] ~~Log all role changes to audit~~ (Moved to postMVP.md)
- [x] Handle role downgrade impacts ✅ COMPLETE

### Location Assignment
- [x] Assign trainers to locations
- [ ] Bulk location assignment
- [x] Handle location changes for trainers
- [ ] Update client relationships on location change
- [x] Validate location exists and is active

### Account Status Management
- [x] Activate/deactivate user accounts
- [ ] Bulk status updates
- [x] Prevent self-deactivation
- [ ] Handle deactivation impacts:
  - Reassign clients to new trainer
  - Preserve historical sessions
  - Remove from active lists

### Permission System
- [ ] Define permission matrix by role
- [x] Implement permission checking helpers
- [x] Create role-based UI elements
- [x] API-level permission enforcement
- [ ] Document permission hierarchy

### Bulk Operations
- [ ] ~~Moved to postMVP.md~~

## Acceptance Criteria
- [ ] Only admins can change roles
- [ ] Cannot remove last admin
- [ ] Deactivated users cannot login
- [ ] Location changes reflected immediately
- [ ] ~~All changes logged to audit table~~ (Moved to postMVP.md)

## Technical Notes
- Create permission enum or constants
- Consider impacts on related data
- Implement soft delete pattern
- Cache permission checks for performance

## Permission Matrix
```
TRAINER:
- View own profile
- View assigned clients
- Create/edit sessions

CLUB_MANAGER:
- All trainer permissions
- View club users
- View club reports

PT_MANAGER:
- All club manager permissions
- Access multiple locations
- View all trainers

ADMIN:
- All permissions
- User management
- System configuration
```

## Files to Create/Modify
- `/src/lib/auth/permissions.ts`
- `/src/app/api/users/bulk/route.ts`
- `/src/app/users/admin/page.tsx`
- `/src/components/users/RoleSelector.tsx`
- `/src/components/users/BulkActions.tsx`
- `/src/hooks/usePermissions.ts`