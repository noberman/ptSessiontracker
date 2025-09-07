# Task 04: Client Management

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Partially Complete**  
**Dependencies: Task 03A (User CRUD)**

## Objective
Implement comprehensive client management system including CRUD operations, trainer assignments, and bulk import capabilities.

## Requirements from PRD
- Client profile management
- Primary trainer assignment
- Client search and filtering
- Bulk import from Excel/CSV
- Session history tracking

## Implementation Checklist

### Client CRUD Operations
- [x] GET `/api/clients` - List with pagination
- [x] GET `/api/clients/[id]` - Get client details
- [x] POST `/api/clients` - Create new client
- [x] PUT `/api/clients/[id]` - Update client
- [x] DELETE `/api/clients/[id]` - Soft delete

### Client List Page
- [x] Table view with client information
- [x] Search by name or email
- [x] Filter by location
- [x] Filter by primary trainer
- [x] Filter by active status
- [x] Sort functionality
- [x] Pagination controls

### Client Creation/Edit Form
- [x] Name input (required)
- [x] Email input with validation (required)
- [x] Phone number (optional)
- [x] Location selection
- [x] Primary trainer assignment
- [x] Active status toggle
- [x] Form validation and error handling

### Primary Trainer Assignment
- [x] Dropdown of available trainers at location
- [x] Quick reassignment interface
- [ ] Bulk reassignment for trainer departures
- [x] Show unassigned clients prominently
- [x] Assignment history in audit log

### Client Profile View
- [x] Display all client information
- [x] Show current packages
- [x] Session history table
- [x] Primary trainer information
- [x] Total sessions completed
- [x] Validation rate statistics

### Bulk Import
- [ ] CSV/Excel file upload interface
- [ ] Column mapping configuration
- [ ] Validation before import
- [ ] Error reporting for failed rows
- [ ] Duplicate detection (by email)
- [ ] Import summary report

### Search & Filtering
- [x] Real-time search as you type
- [x] Multiple filter combinations
- [ ] Save filter preferences
- [ ] Export filtered results
- [x] Clear all filters option

## Acceptance Criteria
- [x] Clients can be created with all required fields
- [x] Email uniqueness is enforced
- [x] Primary trainer can be assigned/changed
- [ ] Bulk import handles 100+ records
- [x] Search returns results instantly
- [x] Deactivated clients hidden by default

## Technical Notes
- Index email field for uniqueness
- Validate email format on frontend and backend
- Use transactions for bulk operations
- Consider pagination for large datasets
- Cache frequently accessed client lists

## Import Template Structure
```csv
Name,Email,Phone,Location,Primary Trainer Email
John Doe,john@example.com,555-0100,Main Gym,trainer@gym.com
Jane Smith,jane@example.com,555-0101,Main Gym,trainer@gym.com
```

## Files to Create/Modify
- `/src/app/api/clients/route.ts`
- `/src/app/api/clients/[id]/route.ts`
- `/src/app/api/clients/import/route.ts`
- `/src/app/clients/page.tsx`
- `/src/app/clients/new/page.tsx`
- `/src/app/clients/[id]/page.tsx`
- `/src/app/clients/import/page.tsx`
- `/src/components/clients/ClientForm.tsx`
- `/src/components/clients/ClientTable.tsx`
- `/src/components/clients/ImportWizard.tsx`