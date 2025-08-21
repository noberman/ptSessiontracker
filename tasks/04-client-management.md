# Task 04: Client Management

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
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
- [ ] GET `/api/clients` - List with pagination
- [ ] GET `/api/clients/[id]` - Get client details
- [ ] POST `/api/clients` - Create new client
- [ ] PUT `/api/clients/[id]` - Update client
- [ ] DELETE `/api/clients/[id]` - Soft delete

### Client List Page
- [ ] Table view with client information
- [ ] Search by name or email
- [ ] Filter by location
- [ ] Filter by primary trainer
- [ ] Filter by active status
- [ ] Sort functionality
- [ ] Pagination controls

### Client Creation/Edit Form
- [ ] Name input (required)
- [ ] Email input with validation (required)
- [ ] Phone number (optional)
- [ ] Location selection
- [ ] Primary trainer assignment
- [ ] Active status toggle
- [ ] Form validation and error handling

### Primary Trainer Assignment
- [ ] Dropdown of available trainers at location
- [ ] Quick reassignment interface
- [ ] Bulk reassignment for trainer departures
- [ ] Show unassigned clients prominently
- [ ] Assignment history in audit log

### Client Profile View
- [ ] Display all client information
- [ ] Show current packages
- [ ] Session history table
- [ ] Primary trainer information
- [ ] Total sessions completed
- [ ] Validation rate statistics

### Bulk Import
- [ ] CSV/Excel file upload interface
- [ ] Column mapping configuration
- [ ] Validation before import
- [ ] Error reporting for failed rows
- [ ] Duplicate detection (by email)
- [ ] Import summary report

### Search & Filtering
- [ ] Real-time search as you type
- [ ] Multiple filter combinations
- [ ] Save filter preferences
- [ ] Export filtered results
- [ ] Clear all filters option

## Acceptance Criteria
- [ ] Clients can be created with all required fields
- [ ] Email uniqueness is enforced
- [ ] Primary trainer can be assigned/changed
- [ ] Bulk import handles 100+ records
- [ ] Search returns results instantly
- [ ] Deactivated clients hidden by default

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