# Task 03A: User CRUD Operations

**Complexity: 4/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
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
- [ ] GET `/api/users` - List all users with pagination
- [ ] GET `/api/users/[id]` - Get single user details
- [ ] POST `/api/users` - Create new user
- [ ] PUT `/api/users/[id]` - Update user information
- [ ] DELETE `/api/users/[id]` - Soft delete (set inactive)

### User List Page
- [ ] Table view of all users
- [ ] Search by name or email
- [ ] Filter by role
- [ ] Filter by location
- [ ] Sort by name, email, role
- [ ] Pagination controls

### User Creation Form
- [ ] Name input field
- [ ] Email input with validation
- [ ] Password field with strength indicator
- [ ] Role selection dropdown
- [ ] Location assignment dropdown
- [ ] Form validation and error messages

### User Edit Form
- [ ] Pre-populate current user data
- [ ] Allow name and email updates
- [ ] Password change (optional field)
- [ ] Prevent self-role changes
- [ ] Update audit log

### User Profile View
- [ ] Display user information
- [ ] Show assigned location
- [ ] List assigned clients (for trainers)
- [ ] Display creation and update timestamps
- [ ] Activity status indicator

## Acceptance Criteria
- [ ] Admin can create new users
- [ ] Users listed with proper pagination
- [ ] Search filters work correctly
- [ ] Email uniqueness validated
- [ ] Passwords hashed before storage
- [ ] Audit log tracks all changes

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