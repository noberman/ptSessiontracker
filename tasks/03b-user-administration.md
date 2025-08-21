# Task 03B: User Administration

**Complexity: 4/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Not Started**  
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
- [ ] Role change interface for admins
- [ ] Validate role change permissions
- [ ] Prevent last admin removal
- [ ] Log all role changes to audit
- [ ] Handle role downgrade impacts

### Location Assignment
- [ ] Assign trainers to locations
- [ ] Bulk location assignment
- [ ] Handle location changes for trainers
- [ ] Update client relationships on location change
- [ ] Validate location exists and is active

### Account Status Management
- [ ] Activate/deactivate user accounts
- [ ] Bulk status updates
- [ ] Prevent self-deactivation
- [ ] Handle deactivation impacts:
  - Reassign clients to new trainer
  - Preserve historical sessions
  - Remove from active lists

### Permission System
- [ ] Define permission matrix by role
- [ ] Implement permission checking helpers
- [ ] Create role-based UI elements
- [ ] API-level permission enforcement
- [ ] Document permission hierarchy

### Bulk Operations
- [ ] Select multiple users for actions
- [ ] Bulk activate/deactivate
- [ ] Bulk location assignment
- [ ] Export user list to CSV
- [ ] Confirmation dialogs for bulk actions

## Acceptance Criteria
- [ ] Only admins can change roles
- [ ] Cannot remove last admin
- [ ] Deactivated users cannot login
- [ ] Location changes reflected immediately
- [ ] All changes logged to audit table
- [ ] Bulk operations work with confirmation

## Technical Notes
- Create permission enum or constants
- Use database transactions for bulk operations
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