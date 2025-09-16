# Task 03A: User CRUD Operations

**Complexity: 4/10**  
**Priority: CORE (MVP)**  
**Status: ✅ COMPLETE**  
**Dependencies: Task 02 (Authentication)**

## Objective
Implement Create, Read, Update, and Delete operations for user management with proper form validation and error handling.

## Requirements from PRD
- Trainer profile management
- Manager account creation
- User listing and search
- Basic user information editing

## Implementation Checklist

### API Routes
- [x] GET `/api/users` - List all users with pagination
- [x] GET `/api/users/[id]` - Get single user details
- [x] POST `/api/users` - Create new user
- [x] PUT `/api/users/[id]` - Update user information
- [x] DELETE `/api/users/[id]` - Soft delete (set inactive)

### User List Page
- [x] Table view of all users
- [x] Search by name or email
- [x] Filter by role
- [x] Filter by location
- [x] Sort by name, email, role
- [x] Pagination controls

### User Creation Form
- [x] Name input field
- [x] Email input with validation
- [x] Password field with strength indicator
- [x] Role selection dropdown
- [x] Location assignment dropdown
- [x] Form validation and error messages

### User Edit Form
- [x] Pre-populate current user data
- [x] Allow name and email updates
- [x] Password change (optional field)
- [x] Prevent self-role changes
- [x] Update audit log

### User Profile View
- [x] Display user information
- [x] Show assigned location
- [x] List assigned clients (for trainers)
- [x] Display creation and update timestamps
- [x] Activity status indicator

## Acceptance Criteria
- [x] Admin can create new users
- [x] Users listed with proper pagination
- [x] Search filters work correctly
- [x] Email uniqueness validated
- [x] Passwords hashed before storage
- [x] Audit log tracks all changes

## Technical Notes
- Hash passwords with bcrypt
- Validate email format
- Check email uniqueness
- Only admins can create/edit users
- Soft delete preserves data integrity

## Files to Create/Modify
- `/src/app/api/users/route.ts`
- `/src/app/api/users/[id]/route.ts`
- `/src/app/users/page.tsx`
- `/src/app/users/new/page.tsx`
- `/src/app/users/[id]/edit/page.tsx`
- `/src/components/users/UserForm.tsx`
- `/src/components/users/UserTable.tsx`