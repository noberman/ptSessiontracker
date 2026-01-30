# Task 50: Payment Transaction Overview & Management

## Overview
Centralized payments page for PT/Club Managers to view, create, edit, and delete payment transactions across their location(s), with date filtering and sales commission attribution.

Currently, payments are only viewable/creatable from within a package's detail page. This task surfaces all payments in a dedicated top-level page with filtering, CRUD, and sales commission attribution controls.

---

## Schema Changes

### New Enum: PaymentMethod
```
CARD | BANK_TRANSFER | OTHER
```

### New Fields on Payment Model
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `paymentMethod` | `PaymentMethod` | `CARD` | How the payment was made |
| `salesAttributedToId` | `String?` | `null` | Primary sales commission attribution. References User. |
| `salesAttributedTo2Id` | `String?` | `null` | Second sales commission attribution for split commission. References User. |

### Split Commission Rules
- **1 person attributed**: that person gets 100% of the sales commission for this payment
- **2 people attributed**: each gets 50% of the sales commission (always 50/50, no custom splits)
- **Nobody attributed** (both null): no sales commission for this payment — does NOT fall back to primaryTrainerId

### Migration Notes
- Existing payments get `CARD` as default paymentMethod
- Existing payments get `salesAttributedToId = null` — this means they will have no sales commission. Clean break: only new payments with explicit attribution count toward sales commission.
- Migration must be idempotent

---

## API Routes

### GET `/api/payments`
- List payments for organization with filters
- **Filters**: date range, locationId (via trainer), trainerId, clientId
- **Date presets**: thisMonth, lastMonth, custom (start/end)
- **Location scoping**: Auto-filtered to manager's assigned locations (derived from trainer's location)
- **Includes**: client name, trainer name, package name, payment method, sales attributed to, recorded by
- **Returns**: payments array + summary (total count, total amount)
- **Auth**: PT_MANAGER, CLUB_MANAGER, ADMIN

### POST `/api/payments`
- Create a new payment
- **Body**: packageId, amount, paymentDate, paymentMethod, notes?, salesAttributedToId?, salesAttributedTo2Id?
- **Validation**: amount > 0, doesn't exceed remaining balance on package
- **Sales attribution**: optional. Provide 1 trainer for full credit, 2 trainers for 50/50 split. Omit both for no sales commission.
- **Auth**: PT_MANAGER, CLUB_MANAGER, ADMIN

### PUT `/api/payments/[id]`
- Edit an existing payment
- **Editable fields**: amount, paymentDate, paymentMethod, notes, salesAttributedToId, salesAttributedTo2Id
- **Validation**: new amount doesn't cause session-lock issues (can't reduce below sessions already used)
- **Auth**: PT_MANAGER, CLUB_MANAGER, ADMIN

### DELETE `/api/payments/[id]`
- Delete a payment
- **Validation**: Cannot delete if it would lock sessions already used (existing logic from Task 48)
- **Auth**: PT_MANAGER, CLUB_MANAGER, ADMIN

---

## UI: Payments Page (`/payments`)

### Layout
- Top-level sidebar nav item: "Payments"
- Summary bar at top: total payment count + total amount for current filter
- Date filter: This Month (default), Last Month, Custom Range (same pattern as dashboard)
- Location auto-scoping for managers
- Payments data table with row actions

### Table Columns
| Column | Source |
|--------|--------|
| Date | `payment.paymentDate` |
| Amount | `payment.amount` |
| Client | `payment.package.client.name` |
| Trainer | `payment.package.client.primaryTrainer.name` |
| Package | `payment.package.name` |
| Payment Method | `payment.paymentMethod` |
| Sales Credited To | `payment.salesAttributedTo.name` (+ second name if split) or "—" if unattributed |
| Recorded By | `payment.createdBy.name` |

### Create Payment Modal
- Step 1: Select client (from org clients)
- Step 2: Select package (from client's active packages, showing remaining balance)
- Step 3: Fill details: amount, date, payment method, notes, sales attributed to (up to 2 trainer dropdowns — leave blank for no sales credit, add second for 50/50 split)

### Edit Payment Modal
- Pre-filled with current values
- Same fields as create (except client/package are read-only)

### Delete Confirmation
- Warning dialog with session-lock validation message if applicable

---

## Commission Integration

### Sales Attribution — Exclusive, No Fallback
- Sales commission is determined **only** by `salesAttributedToId` and `salesAttributedTo2Id`
- **1 person**: that person gets 100% of the sales commission
- **2 people**: each gets 50% of the sales commission (amount halved for each)
- **Nobody** (both null): no sales commission for this payment (does NOT fall back to primaryTrainerId)
- This is a clean break from the old behavior where primaryTrainerId implicitly received sales credit

### Impact on CommissionCalculatorV2
- **Current logic** (lines ~88-105): queries payments where `package.client.primaryTrainerId = userId` — this must change
- **New logic**: query payments where `salesAttributedToId = userId` OR `salesAttributedTo2Id = userId`
- For each matching payment, check if it's a split:
  - If user is the only attributed person → count full `payment.amount` toward their sales volume
  - If both slots are filled → count `payment.amount / 2` toward this user's sales volume
- Sales commission percentage/flat fee is then applied to the user's attributed portion
- Payments with both attribution fields null are excluded from all sales commission calculations
- Existing payments (pre-migration) have null attribution and will not count toward sales commission going forward
- Session commission (based on validated sessions) is unaffected — still tied to the trainer who conducted the session

---

## Implementation Steps

### Phase 1: Schema & Migration
- [x] 1. Add `PaymentMethod` enum to Prisma schema (complexity: 2/10)
- [x] 2. Add `paymentMethod`, `salesAttributedToId`, and `salesAttributedTo2Id` fields to Payment model (complexity: 2/10)
- [x] 3. Create and run migration, update `/docs/schema.md` (complexity: 2/10)

### Phase 2: API Routes
- [x] 4. GET `/api/payments` with date/location/trainer filters and summary (complexity: 4/10)
- [x] 5. POST `/api/payments` with new fields (complexity: 3/10)
- [x] 6. PUT `/api/payments/[id]` edit endpoint (complexity: 3/10)
- [x] 7. DELETE `/api/payments/[id]` with session-lock validation (complexity: 3/10)

### Phase 3: UI
- [x] 8. Add "Payments" to sidebar navigation (complexity: 1/10)
- [x] 9. Payments page layout with data table and date filter (complexity: 5/10)
- [x] 10. Create Payment modal (client -> package picker, new fields) (complexity: 5/10)
- [x] 11. Edit Payment modal (complexity: 3/10)
- [x] 12. Delete confirmation with session-lock validation (complexity: 2/10)

### Phase 4: Commission & Cleanup
- [x] 13. Update CommissionCalculatorV2 to respect `salesAttributedToId` / `salesAttributedTo2Id` with 50/50 split logic (complexity: 5/10)
- [x] 14. Update existing RecordPaymentModal (package detail page) to include paymentMethod and salesAttributedTo fields (complexity: 3/10)
- [x] 15. Add EditPaymentModal for package detail page (admin/manager edit capability)
- [x] 16. Update PaymentSection with edit button, payment method display, sales attribution display
- [x] 17. Update package detail page to pass canEditPayment and trainers props
- [x] 18. Update GET /api/packages/[id]/payments to return new fields
- [x] 19. Update POST /api/packages/[id]/payments to accept new fields

---

## What Stays the Same
- Existing package-level payment recording still works from package detail page
- Session commission logic unchanged (still based on validated sessions by trainer)
- **Breaking change**: sales commission now requires explicit `salesAttributedToId` — old payments with null attribution will no longer count toward sales commission
- Payment still requires a package (no standalone transactions)
- Delete validation logic (session-lock check) reused from Task 48

---

## Dependencies
- Task 48 (Split Payments) - completed
- Existing Payment model, CommissionCalculatorV2, dashboard date filter logic
