# Task 49: Smart CSV Import with Column Mapping & Package Type Setup

## Overview

Reduce friction for new businesses importing their existing client/package data into FitSync by adding intelligent column mapping and inline package type creation to the import wizard.

## Problem Statement

Current friction points for new businesses:

1. **Strict CSV format** - Headers must match exactly (`Name`, `Email`, `Location`, etc.). If their export uses `Client Name` or `Email Address`, import fails.

2. **Package types must exist first** - Before importing, users must manually create all package types in Settings. New businesses don't have these configured yet.

3. **Multiple data sources** - Businesses come from Glofox, Mindbody, Excel, paper records - all with different formats.

## Solution

Add two conditional steps to the import flow that only appear when needed:

```
Upload CSV
    ↓
[Headers match?] → NO → Step 2: Map Columns
    ↓ YES
[All packages exist?] → NO → Step 3: Create Missing Package Types
    ↓ YES
Validate
    ↓
Assign (Location/Trainer)
    ↓
Import
```

**Happy path remains unchanged** - existing users with correct format skip directly to validation.

---

## Detailed Requirements

### Step 2: Column Mapping (Conditional)

**Trigger:** CSV headers don't match expected FitSync columns

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Map Your Columns                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  We detected these columns in your file. Please map them to    │
│  the corresponding FitSync fields:                              │
│                                                                 │
│  Your Column              FitSync Field                         │
│  ─────────────────────────────────────────────────────────────  │
│  "Client Name"        →   [Name ▼]                              │
│  "Client Email"       →   [Email ▼]                             │
│  "Mobile Number"      →   [Phone ▼]                             │
│  "Gym Location"       →   [Location ▼]                          │
│  "Trainer"            →   [Trainer Email ▼]                     │
│  "Package"            →   [Package Name ▼]                      │
│  "Sessions Left"      →   [Remaining Sessions ▼]                │
│  "Total Sessions"     →   [Total Sessions ▼]                    │
│  "End Date"           →   [Expiry Date ▼]                       │
│  "Notes"              →   [-- Skip this column -- ▼]            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Save this mapping as: [ Glofox Export           ] [Save]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                    [← Back]  [Continue →]       │
└─────────────────────────────────────────────────────────────────┘
```

**Dropdown options for each column:**
- Name (required)
- Email (required)
- Phone
- Location (required)
- Trainer Email (required)
- Package Name (required)
- Remaining Sessions (required)
- Total Sessions
- Expiry Date
- -- Skip this column --

**Smart auto-mapping:**
- `Client Name`, `Customer Name`, `Full Name` → Name
- `Email Address`, `Client Email`, `E-mail` → Email
- `Mobile`, `Phone Number`, `Cell` → Phone
- `Gym`, `Branch`, `Club` → Location
- `Sessions Remaining`, `Sessions Left`, `Remaining` → Remaining Sessions
- etc.

**Saved Mappings:**
- Store mappings per organization in database
- Dropdown to select previously saved mapping
- Pre-built mappings for known formats (Glofox, Mindbody)

**Validation:**
- All required fields must be mapped
- Cannot map same FitSync field twice
- Show warning if required columns not found in CSV

---

### Step 3: Package Type Setup (Conditional)

**Trigger:** CSV contains package names that don't match any existing package types

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Package Type Setup                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  We found package names in your file that don't exist in your  │
│  system yet. Please set them up:                                │
│                                                                 │
│  ✓  "24 PT Sessions"                                            │
│      └─ Matches existing package type                           │
│                                                                 │
│  ⚠️  "12 PT Sessions - Peak" (8 clients)                        │
│      └─ Create Package Type:                                    │
│         Name: [12 PT Sessions - Peak    ]                       │
│         Total Sessions: [12  ]                                  │
│         Price: [$         ]  ← Required for commission          │
│         [Create]                                                │
│                                                                 │
│  ⚠️  "36 Premium Sessions" (3 clients)                          │
│      └─ [Set Up] | [Map to existing: [Select...▼]]              │
│                                                                 │
│  ──────────────────────────────────────────────────────────────  │
│  ℹ️  Package types define the default sessions and pricing.     │
│      Individual packages can still have different values.       │
│                                                                 │
│                                    [← Back]  [Continue →]       │
│                          (disabled until all resolved)          │
└─────────────────────────────────────────────────────────────────┘
```

**Options for unmatched packages:**
1. **Create new package type** - Inline form with name (pre-filled), sessions, price
2. **Map to existing** - Dropdown of existing package types (for typos/variations)

**Behavior:**
- Show count of clients affected by each unmatched package
- Pre-fill session count if detectable from name (e.g., "24 PT Sessions" → 24)
- "Continue" button disabled until all packages resolved
- Created package types are immediately available in the system

**Validation:**
- Price is required (for commission calculations)
- Sessions must be > 0
- Name must be unique within organization

---

### Saved Column Mappings (Database)

**New model:**
```prisma
model ImportMapping {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String   // e.g., "Glofox Export", "My Excel Format"
  mapping        Json     // { "Client Name": "name", "Email Address": "email", ... }
  isDefault      Boolean  @default(false)
  isSystemTemplate Boolean @default(false) // For pre-built Glofox/Mindbody templates
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, name])
}
```

**System templates (seeded):**
- Glofox Export
- Mindbody Export
- PTminder Export
- Generic (current FitSync format)

---

## Implementation Steps

### Phase 1: Column Mapping [Total Complexity: 6]

#### 1.1 Database & API Setup [Complexity: 2]
- [ ] Add `ImportMapping` model to Prisma schema
- [ ] Create migration
- [ ] Create `GET /api/import-mappings` - List org's saved mappings
- [ ] Create `POST /api/import-mappings` - Save new mapping
- [ ] Create `DELETE /api/import-mappings/[id]` - Delete mapping
- [ ] Seed system templates (Glofox, Mindbody, FitSync default)

#### 1.2 Header Detection & Auto-Mapping [Complexity: 2]
- [ ] Parse CSV headers on upload (before full file parse)
- [ ] Build synonym dictionary for auto-mapping:
  ```
  Name: ["name", "client name", "customer name", "full name", "client"]
  Email: ["email", "email address", "client email", "e-mail"]
  Phone: ["phone", "mobile", "phone number", "cell", "contact"]
  Location: ["location", "gym", "branch", "club", "site"]
  Trainer Email: ["trainer", "trainer email", "pt", "pt email"]
  Package Name: ["package", "package name", "membership", "plan"]
  Remaining Sessions: ["remaining", "sessions left", "sessions remaining", "balance"]
  Total Sessions: ["total", "total sessions", "sessions"]
  Expiry Date: ["expiry", "expiry date", "end date", "expires", "valid until"]
  ```
- [ ] Return match confidence (exact match, synonym match, no match)
- [ ] Check if ALL required fields matched → skip mapping step

#### 1.3 Column Mapping UI Component [Complexity: 2]
- [ ] Create `ColumnMapper.tsx` component
- [ ] Display detected columns with auto-mapped suggestions
- [ ] Dropdown selector for each column → FitSync field
- [ ] Visual indicators: ✓ mapped, ⚠️ required but unmapped, ○ optional
- [ ] Preview first 3 data rows with current mapping applied
- [ ] Validation: all required fields mapped, no duplicates
- [ ] "Save this mapping" input + save button
- [ ] "Load saved mapping" dropdown (org mappings + system templates)
- [ ] Integrate into ClientImportForm wizard flow

### Phase 2: Package Type Setup [Total Complexity: 5]

#### 2.1 Package Detection & Matching [Complexity: 1]
- [ ] After column mapping, extract unique values from Package Name column
- [ ] Query existing package types for organization
- [ ] Match logic: case-insensitive, trim whitespace
- [ ] Return: matched packages, unmatched packages with row counts
- [ ] Check if ALL packages matched → skip setup step

#### 2.2 Package Type Setup UI Component [Complexity: 3]
- [ ] Create `PackageTypeSetup.tsx` component
- [ ] List matched packages (green checkmark, no action needed)
- [ ] List unmatched packages with options:
  - "Create new" → inline form (name pre-filled, sessions, price required)
  - "Map to existing" → dropdown of existing package types
- [ ] Session count inference: parse first number from name (e.g., "24 PT Sessions" → 24)
- [ ] Show affected client count per unmatched package
- [ ] Validation: all packages resolved before Continue enabled
- [ ] On "Create" → call existing package type creation API
- [ ] Integrate into ClientImportForm wizard flow

#### 2.3 Wizard Flow Integration [Complexity: 1]
- [ ] Update ClientImportForm state machine:
  ```
  upload → [needsMapping?] → columnMapping → [needsPackageSetup?] → packageSetup → validate → assign → import
  ```
- [ ] Pass mapped column names through to validation step
- [ ] Ensure created package types available immediately for validation

### Phase 3: Polish & Templates [Total Complexity: 3]

#### 3.1 Glofox Integration [Complexity: 2]
- [ ] Obtain sample Glofox client export CSV
- [ ] Document exact column names and format
- [ ] Create accurate system template mapping
- [ ] Test end-to-end with real Glofox data

#### 3.2 Quick Format Selector [Complexity: 1]
- [ ] Add "Importing from:" dropdown at upload step
- [ ] Options: "Auto-detect", "Glofox", "Mindbody", "FitSync Template", "Other"
- [ ] Pre-select mapping based on choice, skip mapping step if exact match
- [ ] Remember last used format per organization

---

## Files to Modify

### New Files
- `prisma/migrations/xxx_add_import_mappings/migration.sql`
- `src/components/clients/import/ColumnMapper.tsx`
- `src/components/clients/import/PackageTypeSetup.tsx`
- `src/app/api/import-mappings/route.ts`

### Modified Files
- `prisma/schema.prisma` - Add ImportMapping model
- `src/components/clients/ClientImportForm.tsx` - Add new steps to wizard
- `src/app/api/clients/import/route.ts` - Accept mapped columns

---

## Success Criteria

1. **New user with Glofox export** can import without reformatting CSV
2. **New user without package types** can create them inline during import
3. **Existing user with correct format** sees no change (same fast flow)
4. **Saved mappings** persist and can be reused across imports
5. **Zero data loss** - Package types remain source of truth for pricing

---

## Out of Scope (Future)

- Direct API integration with Glofox/Mindbody
- Automatic data sync (this is one-time import)
- Session history import (only active packages)
- Payment history import

---

## Dependencies

- Task 48 (Split Payments) - Completed ✓
- Package types system - Exists ✓
- Current import wizard - Exists ✓

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Glofox format changes | Version mappings, allow user override |
| User maps columns incorrectly | Show preview of first 3 rows with mapped data |
| Package type name collisions | Case-insensitive matching, fuzzy match suggestions |
| Large CSV performance | Process in batches, show progress |

---

## Questions to Clarify

### Column Mapping

**Q1: Auto-mapping behavior**
When we detect "Client Name" likely maps to "Name", should we:
- A) Auto-select it and let them change if wrong (faster)
- B) Show it as a suggestion they must confirm (safer)

**Q2: Saved mappings scope**
Snap Fitness gyms all use Glofox. If one gym saves a "Glofox" mapping, should it be:
- A) Available only to that organization
- B) Available to all Snap Fitness locations (franchise sharing)
- C) System templates only (we maintain Glofox mapping centrally)

**Q3: Do we have a sample Glofox export?**
To build an accurate template, I need to see the actual column names Glofox uses. Can you export one from a Snap Fitness gym?

### Package Type Matching

**Q4: Matching strictness**
How should we match package names?
- A) Exact match only (case-insensitive)
- B) Fuzzy match with suggestions ("24 PT Session" → "Did you mean 24 PT Sessions?")
- C) Normalize and match (strip spaces, lowercase, ignore punctuation)

**Q5: Package type creation - simplified or full?**
When creating a package type inline, should we:
- A) Simplified form: just Name, Sessions, Price (minimal friction)
- B) Full form: include session duration, peak/off-peak, description, etc.

### Edge Cases

**Q6: Multiple packages per client in CSV**
Current system supports this. Just confirming: if CSV has:
```
John, john@email.com, 24 Sessions
John, john@email.com, 12 Sessions
```
We create one client with two packages, correct?

**Q7: Location matching**
If CSV has location "Wood Square" but system has "Woodsquare" (no space):
- A) Fail validation, require exact match
- B) Suggest similar locations ("Did you mean Woodsquare?")
- C) Handle in existing Assign step (current behavior)

---

## Future Considerations

1. Should we support importing session history (completed sessions)?
2. Do we need trainer import, or assume trainers are set up first?
3. Should saved mappings be shareable across organizations (for franchises)?
4. Import payments/payment history for the split payments feature?
