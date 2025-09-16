# Task 13: Bulk Client & Package Import

**Complexity: 6/10**  
**Priority: CRITICAL (Pre-Launch)**  
**Timeline: Must complete by September 2024**  
**Status: ✅ COMPLETE**  
**Dependencies: Task 04 (Client Management), Task 05 (Package Management)**

## Objective
Enable managers to bulk import ~100 existing clients with their current package balances for October 1st go-live, using email as the unique identifier for matching existing clients.

## Requirements
- Import clients and packages from CSV file
- Use email as primary key for matching existing clients
- Support multiple active packages per client
- Calculate session value from total package value
- Allow trainer assignment during import validation
- No historical session data needed (only remaining balances)

## CSV Format Specification

### Required Columns
```csv
Name,Email,Location,Trainer Email,Remaining Sessions,Package Size,Package Total Value
John Doe,john.doe@gmail.com,Wood Square,trainer@gym.com,15,30,3000
Jane Smith,jane.smith@yahoo.com,888 Plaza,,8,20,1800
Bob Wilson,bob@gmail.com,Woodlands Health,,5,10,800
```

### Column Definitions
- **Name**: Client's full name (required)
- **Email**: Client's email - MUST be unique (required)
- **Location**: Must match existing location name exactly (required)
- **Trainer Email**: Primary trainer's email - can be empty (optional)
- **Remaining Sessions**: Number of unused sessions (required, min: 0)
- **Package Size**: Total sessions in the package (required, min: 1)
- **Package Total Value**: Total price paid for package (required, min: 0)

### Calculated Fields
- **Session Value** = Package Total Value ÷ Package Size
- **Used Sessions** = Package Size - Remaining Sessions (for reference only)
- **Package Name** = Auto-generated as "Migrated [Size]-Pack"

## Implementation Checklist

### Import API Endpoint
- [ ] POST `/api/clients/import` - Main import endpoint
- [ ] POST `/api/clients/import/validate` - Validation only endpoint
- [ ] GET `/api/clients/import/template` - Download CSV template
- [ ] GET `/api/clients/import/history` - View past imports

### CSV Processing
- [ ] Parse CSV with header validation
- [ ] Validate required columns present
- [ ] Handle different encodings (UTF-8, ASCII)
- [ ] Support up to 1000 rows
- [ ] Calculate session values
- [ ] Generate import preview

### Data Validation
- [ ] Email format validation
- [ ] Email uniqueness check (within CSV)
- [ ] Location name must exist in system
- [ ] Trainer email must exist (if provided)
- [ ] Remaining sessions ≤ Package size
- [ ] Package total value > 0
- [ ] All numeric fields are valid numbers

### Client Matching Logic
- [ ] Check if email exists in database
- [ ] If exists: UPDATE client, ADD package
- [ ] If new: CREATE client with package
- [ ] Handle case-insensitive email matching
- [ ] Preserve existing client data when updating

### Package Creation Rules
- [ ] Auto-generate package name: "Migrated [Size]-Pack"
- [ ] Set package as active
- [ ] Calculate and store session value
- [ ] Mark as migrated with timestamp
- [ ] Allow multiple packages per client
- [ ] Set package start date to import date

### Import Preview UI
- [ ] Upload CSV file interface
- [ ] Show parsing progress
- [ ] Display validation results:
  - [ ] ✅ Valid rows (ready to import)
  - [ ] ⚠️ Warnings (missing trainers, etc.)
  - [ ] ❌ Errors (invalid data)
- [ ] Show calculated values
- [ ] Allow row-by-row review
- [ ] Skip invalid rows option

### Trainer Assignment Interface
- [ ] Show clients without trainers
- [ ] Dropdown with location-filtered trainers
- [ ] Bulk assign trainer to multiple clients
- [ ] Individual trainer assignment
- [ ] Option to import without trainer
- [ ] Save assignments before import

### Import Confirmation
- [ ] Summary of changes:
  - [ ] X new clients to create
  - [ ] Y existing clients to update
  - [ ] Z packages to create
  - [ ] Total value of packages
- [ ] Dry run option
- [ ] Rollback capability
- [ ] Import button with confirmation

### Error Handling
- [ ] Row-by-row error reporting
- [ ] Continue on error option
- [ ] Download error report CSV
- [ ] Clear error messages:
  - "Row 5: Email invalid format"
  - "Row 8: Location 'Main Gym' not found"
  - "Row 12: Remaining sessions (35) exceeds package size (30)"

### Import Report
- [ ] Generate detailed import summary
- [ ] Success count by category
- [ ] List of created/updated records
- [ ] Failed rows with reasons
- [ ] Download report as CSV/PDF
- [ ] Email report to admin

### Migration Tracking
- [ ] Add `isMigrated` flag to packages
- [ ] Add `migratedAt` timestamp
- [ ] Add `importBatchId` for grouping
- [ ] Track who performed import
- [ ] Audit log entry for import

## User Flow

```
1. Manager uploads CSV file
   ↓
2. System validates all rows
   ↓
3. Shows preview with:
   - Existing clients to update (matched by email)
   - New clients to create
   - Validation errors/warnings
   ↓
4. Manager assigns trainers to clients without them
   ↓
5. Manager reviews final summary
   ↓
6. Manager confirms import
   ↓
7. System creates/updates records
   ↓
8. Shows import report
   ↓
9. Manager downloads report for records
```

## Acceptance Criteria
- [ ] Can import 100+ clients in single file
- [ ] Email matching works correctly
- [ ] Multiple packages per client supported
- [ ] Session value calculated accurately
- [ ] Trainers can be assigned during import
- [ ] Clear error messages for invalid data
- [ ] Import completes in < 30 seconds
- [ ] Rollback works if import fails
- [ ] Detailed import report generated

## Technical Implementation Notes

### Database Considerations
```typescript
// Package creation for migrated data
{
  name: `Migrated ${packageSize}-Pack`,
  totalSessions: packageSize,
  remainingSessions: remainingSessions,
  totalValue: packageTotalValue,
  sessionValue: packageTotalValue / packageSize,
  packageType: "Migrated",
  active: true,
  startDate: new Date(),
  expiresAt: null, // No expiry for migrated packages
  
  // Migration tracking
  metadata: {
    isMigrated: true,
    migratedAt: new Date(),
    importBatchId: generateBatchId(),
    importedBy: currentUser.id,
    originalData: {
      remainingSessions,
      packageSize,
      totalValue
    }
  }
}
```

### Performance Optimization
- Process CSV in chunks of 10 rows
- Use database transactions for atomicity
- Batch create/update operations
- Index email field for fast lookup
- Cache location and trainer lookups

### Security Considerations
- Validate file type (CSV only)
- Limit file size (max 5MB)
- Sanitize all input data
- Require manager role or higher
- Log all import activities
- Rate limit import endpoint

## Sample Import Report

```
IMPORT COMPLETED - September 15, 2024 14:30
===========================================

SUMMARY:
• Total Rows Processed: 100
• Successful: 95
• Failed: 5

CLIENTS:
• Existing Updated: 20
• New Created: 75
• Total: 95

PACKAGES:
• Created: 95
• Total Value: $95,000
• Average Package Size: 25 sessions
• Average Remaining: 12 sessions

TRAINER ASSIGNMENTS:
• With Trainer: 70
• Without Trainer: 25
• Assigned During Import: 15

ERRORS (5):
• Row 23: Email 'invalid.email' is not valid
• Row 45: Location 'Old Gym' not found
• Row 67: Duplicate email in CSV
• Row 78: Remaining sessions exceeds package size
• Row 91: Package value must be positive

ACTIONS:
[Download Full Report] [View Imported Clients] [Import Another File]
```

## Edge Cases to Handle

### 1. Duplicate Emails in CSV
- Show error, skip second occurrence
- Or merge packages for same email

### 2. Existing Client at Different Location
- Option to update location
- Or keep existing location

### 3. Client Already Has Active Package
- Add as additional package (default)
- Option to merge/combine

### 4. Invalid Trainer Email
- Allow import without trainer
- Assign later manually

### 5. Zero Remaining Sessions
- Still create package (for history)
- Mark as fully used

## Testing Requirements

### Test Scenarios
1. Import 100 valid rows
2. Import with 50% existing clients
3. Import with missing trainers
4. Import with invalid locations
5. Import duplicate emails
6. Import malformed CSV
7. Import non-CSV file
8. Import empty file
9. Import with special characters
10. Rollback after partial import

### Performance Benchmarks
- 100 rows: < 10 seconds
- 500 rows: < 30 seconds
- 1000 rows: < 60 seconds

## Future Enhancements (Post-MVP)
- Import session history
- Import from Excel (.xlsx)
- Auto-detect CSV format
- Smart trainer matching by name
- Bulk update existing packages
- Import validation rules configuration
- Scheduled imports from cloud storage
- API endpoint for external systems