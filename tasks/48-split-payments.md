# Task 48: Split Payment Support for Packages

## Overview

Enable clients to pay for packages in multiple installments (typically 2-3 payments). Sessions are unlocked proportionally based on payments received, and sales attribution reflects actual payments made rather than total package value.

## Problem Statement

Currently, packages assume full payment at creation. This doesn't accommodate clients who want to pay in installments. We need to:
1. Track multiple payments against a single package
2. Unlock sessions proportionally to payment progress
3. Attribute sales to the period when payment is received (not package creation)
4. Calculate commission correctly based on payment timing

## Business Rules

### Payment Rules
- Payments can be any amount (flexible installments)
- No predefined payment plan required - just track payments as they come
- A package is "fully paid" when sum of payments >= total value

### Session Unlocking
- Formula: `unlockedSessions = floor((paidAmount / totalValue) * totalSessions)`
- Sessions can only be logged if `usedSessions < unlockedSessions`
- If all unlocked sessions are used, block new sessions until payment received

### Sales Attribution
- "Total Sales" and "Renewal Sales" metrics should use payment amounts in the period
- A $1,200 package paid as $400 in Jan, $400 in Feb, $400 in Mar = $400 sales each month

### Commission Rules
- **Sales commission**: Calculated on payment amount when payment is received
- **Session/Execution commission**: Calculated on session value when session is conducted (unchanged)

### Edge Cases
- Incomplete packages: If client stops paying, remaining sessions stay locked until package expires
- Existing packages: Assume all current packages are fully paid (migration creates single payment record)

---

## Data Model Changes

### New Table: `Payment`

```prisma
model Payment {
  id          String   @id @default(cuid())
  packageId   String
  package     Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)
  amount      Float
  paymentDate DateTime
  notes       String?
  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])

  @@index([packageId])
  @@index([paymentDate])
  @@map("payments")
}
```

### Package Model Updates

Add relation and computed fields:

```prisma
model Package {
  // ... existing fields ...

  payments    Payment[]

  // Note: paidAmount and unlockedSessions will be computed in application logic
  // or via Prisma's aggregation queries
}
```

---

## API Changes

### New Endpoints

#### `POST /api/packages/[id]/payments`
Record a new payment for a package.

**Request:**
```json
{
  "amount": 400,
  "paymentDate": "2026-01-22T00:00:00Z",
  "notes": "Second installment"
}
```

**Response:**
```json
{
  "payment": {
    "id": "...",
    "amount": 400,
    "paymentDate": "2026-01-22T00:00:00Z"
  },
  "package": {
    "paidAmount": 800,
    "unlockedSessions": 8,
    "remainingUnlocked": 6
  }
}
```

**Validation:**
- Amount must be > 0
- Amount cannot exceed remaining balance
- User must have permission to edit packages

#### `GET /api/packages/[id]/payments`
Get payment history for a package.

**Response:**
```json
{
  "payments": [
    { "id": "...", "amount": 400, "paymentDate": "2026-01-01", "createdBy": "Admin" },
    { "id": "...", "amount": 400, "paymentDate": "2026-01-22", "createdBy": "Admin" }
  ],
  "summary": {
    "totalValue": 1200,
    "paidAmount": 800,
    "remainingBalance": 400,
    "totalSessions": 12,
    "unlockedSessions": 8,
    "usedSessions": 5,
    "availableSessions": 3
  }
}
```

#### `DELETE /api/packages/[id]/payments/[paymentId]`
Delete a payment (admin only). Recalculates unlocked sessions.

**Validation:**
- Cannot delete if it would lock sessions that are already used
- Admin only

### Modified Endpoints

#### `POST /api/packages` (Create Package)
Add optional `initialPayment` field:

```json
{
  "name": "12 Prime PT Sessions",
  "totalSessions": 12,
  "totalValue": 1200,
  "initialPayment": {
    "amount": 400,
    "paymentDate": "2026-01-22"
  }
}
```

If `initialPayment` is not provided or `amount === totalValue`, create a single payment for the full amount (backward compatible).

#### `POST /api/sessions` (Create Session)
Add validation to check unlocked sessions:

```typescript
// Before creating session
const package = await getPackageWithPayments(packageId)
const unlockedSessions = calculateUnlockedSessions(package)
const usedSessions = await countUsedSessions(packageId)

if (usedSessions >= unlockedSessions) {
  return error(400, "Cannot log session - payment required to unlock more sessions")
}
```

#### `GET /api/dashboard` (Dashboard Stats)
Modify sales calculations to use payments instead of package values:

**Current (incorrect for split payments):**
```typescript
// Sum of package.totalValue where package.createdAt in period
```

**New (correct):**
```typescript
// Sum of payment.amount where payment.paymentDate in period
// AND payment.package.client.locationId matches filter
```

This affects:
- `totalPackageSales` stat
- `resoldPackageData.totalValue` (Renewal Sales)
- New client vs resold classification should still use package creation, but values use payments

---

## UI/UX Changes

### 1. Package Creation Form

Add "Initial Payment" section below package details:

```
┌─────────────────────────────────────────────────────┐
│ Package Details                                      │
│ ─────────────────────────────────────────────────── │
│ Name: [12 Prime PT Sessions        ]                │
│ Total Sessions: [12]  Total Value: [$1,200.00]      │
│                                                      │
│ ─────────────────────────────────────────────────── │
│ Initial Payment                                      │
│ ─────────────────────────────────────────────────── │
│ Payment Amount: [$400.00    ]  ☐ Full amount ($1,200)│
│ Payment Date:   [2026-01-22 ]                       │
│                                                      │
│              [Cancel]  [Create Package]             │
└─────────────────────────────────────────────────────┘
```

- "Full amount" checkbox auto-fills the total value
- If unchecked, user enters partial amount
- Payment date defaults to today

### 2. Package Card (List View)

Add payment status indicator:

```
┌─────────────────────────────────────────────────────┐
│ 12 Prime PT Sessions                    $1,200.00   │
│ Client: John Smith                                  │
│                                                      │
│ Sessions: 5/12 used    ━━━━━━━━░░░░ 42%            │
│ Payment:  $800/$1,200  ━━━━━━━━━━░░ 67% paid       │
│                                                      │
│ ⚠️ 3 sessions available (payment unlocks 3 more)    │
└─────────────────────────────────────────────────────┘
```

- Show payment progress bar
- Show warning if sessions are limited by payment
- Color code: Green if fully paid, Yellow if partial, Red if no sessions available

### 3. Package Detail Page

Add payment section:

```
┌─────────────────────────────────────────────────────┐
│ Payment Status                                       │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ Total Value:     $1,200.00                          │
│ Amount Paid:     $800.00                            │
│ Remaining:       $400.00                            │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░ 67% paid            │
│                                                      │
│ Sessions Unlocked: 8 of 12                          │
│ Sessions Used:     5                                │
│ Sessions Available: 3                               │
│                                                      │
│                            [Record Payment]          │
│                                                      │
│ ─────────────────────────────────────────────────── │
│ Payment History                                      │
│ ─────────────────────────────────────────────────── │
│ Jan 1, 2026   $400.00   Initial payment    [Delete] │
│ Jan 22, 2026  $400.00   Second installment [Delete] │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 4. Record Payment Modal

```
┌─────────────────────────────────────────────────────┐
│ Record Payment                                   ✕  │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ Package: 12 Prime PT Sessions                       │
│ Remaining Balance: $400.00                          │
│                                                      │
│ Payment Amount: [$400.00    ]  [Pay Full Balance]   │
│ Payment Date:   [2026-01-22 ]                       │
│ Notes:          [Final payment            ]         │
│                                                      │
│ This will unlock 4 additional sessions.             │
│                                                      │
│              [Cancel]  [Record Payment]             │
└─────────────────────────────────────────────────────┘
```

- Show remaining balance prominently
- "Pay Full Balance" button auto-fills remaining amount
- Show preview of how many sessions will be unlocked

### 5. Session Creation - Validation Message

When attempting to log a session but no sessions available:

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Cannot Log Session                               │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ This client has used all unlocked sessions.         │
│                                                      │
│ Package: 12 Prime PT Sessions                       │
│ Unlocked: 8 sessions (based on $800 paid)           │
│ Used: 8 sessions                                    │
│                                                      │
│ A payment of $400 is needed to unlock the           │
│ remaining 4 sessions.                               │
│                                                      │
│         [Cancel]  [Go to Package to Record Payment] │
└─────────────────────────────────────────────────────┘
```

### 6. Dashboard - Packages Table Column

Add payment status column or indicator:

```
│ Package Name           │ Sessions │ Value   │ Payment  │
│ ─────────────────────────────────────────────────────── │
│ 12 Prime PT Sessions   │ 5/12     │ $1,200  │ 67% ━━░░ │
│ 24 Elite PT Sessions   │ 10/24    │ $2,400  │ 100% ━━━ │
```

---

## Migration Plan

### Database Migration

1. Create `payments` table
2. For all existing packages, create a single payment record:
   ```sql
   INSERT INTO payments (id, packageId, amount, paymentDate, createdAt)
   SELECT
     gen_random_uuid(),
     id,
     totalValue,
     COALESCE(startDate, createdAt),
     NOW()
   FROM packages;
   ```

### Code Migration

1. Add Payment model to Prisma schema
2. Run migration
3. Deploy API changes
4. Deploy UI changes

---

## Implementation Steps

| Step | Description | Complexity (1-10) |
|------|-------------|-------------------|
| 1 | Create Prisma schema for Payment model | 2 |
| 2 | Create and run database migration | 2 |
| 3 | Create migration script to add payments for existing packages | 3 |
| 4 | Create `POST /api/packages/[id]/payments` endpoint | 4 |
| 5 | Create `GET /api/packages/[id]/payments` endpoint | 3 |
| 6 | Create `DELETE /api/packages/[id]/payments/[paymentId]` endpoint | 4 |
| 7 | Add helper functions: `calculateUnlockedSessions`, `getPaymentSummary` | 3 |
| 8 | Modify package creation to accept initial payment | 4 |
| 9 | Add session creation validation for unlocked sessions | 4 |
| 10 | Update dashboard API to use payments for sales calculations | 6 |
| 11 | Update commission calculations to use payment amounts | 5 |
| 12 | Create PaymentStatusBadge component | 2 |
| 13 | Add payment section to Package detail page | 4 |
| 14 | Create RecordPaymentModal component | 4 |
| 15 | Update PackageForm with initial payment fields | 3 |
| 16 | Add payment status to package list/cards | 3 |
| 17 | Add session validation UI feedback | 3 |
| 18 | Update package CSV export to include payment status | 2 |
| 19 | Testing and edge case handling | 5 |

**Total Estimated Complexity: 67 points**

---

## Testing Checklist

### Unit Tests
- [ ] `calculateUnlockedSessions` returns correct values for various payment scenarios
- [ ] Payment validation (amount > 0, not exceeding balance)
- [ ] Session creation blocked when unlocked sessions exhausted

### Integration Tests
- [ ] Create package with partial payment → correct sessions unlocked
- [ ] Record additional payment → sessions unlock correctly
- [ ] Delete payment → sessions re-lock (if not used)
- [ ] Delete payment blocked if sessions already used
- [ ] Dashboard sales reflect payment amounts, not package values

### E2E Tests
- [ ] Full flow: Create package → partial payment → log sessions → hit limit → record payment → log more sessions
- [ ] Existing packages show as fully paid after migration

---

## Future Considerations (Out of Scope)

- Payment reminders/notifications
- Payment due dates and schedules


