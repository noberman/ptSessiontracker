# Task 51: Package Start Triggers & Duration-Based Expiry

## Problem

Currently, `expiresAt` on a package is a manually set fixed date, and `startDate` defaults to the creation date. There is no concept of:

1. **Start triggers** — some packages should only "start" when the first session is logged, not when purchased.
2. **Duration-based expiry** — expiry should be a function of time from the start date (e.g. "3 months from start"), not a manually entered calendar date.

This means trainers must manually calculate and enter expiry dates, and there's no way to distinguish between "purchased but not yet started" and "active" packages.

## Solution

Add configurable start triggers and duration-based expiry at the **Package Type** level. When a package is created from that type, the system auto-calculates the effective start date and expiry based on the configured rules.

### Start Trigger Options

| Trigger | Behavior |
|---------|----------|
| `date_of_purchase` | Package starts immediately when created/assigned. Expiry countdown begins right away. **(default)** |
| `first_session` | Package starts when the first session is logged against it. Until then, the package is in a "Not Started" state with no expiry countdown. |

### Duration-Based Expiry

- Configured on PackageType as a value + unit (e.g. `3 months`, `6 weeks`, `90 days`)
- Duration is **optional** — package types without a duration have no auto-expiry (suitable for unlimited packages)
- When set, `expiresAt` is auto-calculated as `effectiveStartDate + duration`
- The calculated `expiresAt` remains editable for manual override/extension

### Expiry Behavior (Hard Lock)

- Once a package expires (`expiresAt < now`), **no new sessions can be created** for that package
- Existing scheduled (future) sessions are **not** cancelled — they remain but no additional ones can be added
- Package status transitions to `Expired`
- To extend: admin edits the expiry date (or duration) which re-activates the package

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Where is start trigger configured? | Package Type level (not per-package) |
| 2 | Duration unit format | Flexible: days, weeks, or months |
| 3 | Pre-start state for `first_session` trigger | Show as "Not Started" — distinct status, no expiry countdown |
| 4 | Time limit on "Not Started"? | No time limit — stays indefinitely until first session |
| 5 | Existing packages migration | Leave as-is — new system only applies to newly created packages |
| 6 | Expiry duration required? | Optional — no duration means no auto-expiry |
| 7 | Hard lock on expiry? | Yes — block new sessions, keep existing scheduled ones |
| 8 | Extension mechanism | Edit the expiry date via existing package edit form |

---

## Schema Changes

### PackageType (new fields)

```prisma
model PackageType {
  // ... existing fields ...

  startTrigger          StartTrigger    @default(DATE_OF_PURCHASE)
  expiryDurationValue   Int?            // e.g. 3, 6, 90 — null means no auto-expiry
  expiryDurationUnit    DurationUnit?   // e.g. MONTHS, WEEKS, DAYS — null if no duration
}

enum StartTrigger {
  DATE_OF_PURCHASE
  FIRST_SESSION
}

enum DurationUnit {
  DAYS
  WEEKS
  MONTHS
}
```

### Package (new field)

```prisma
model Package {
  // ... existing fields ...

  effectiveStartDate  DateTime?   // When the package actually started
                                  // - DATE_OF_PURCHASE: set to createdAt on creation
                                  // - FIRST_SESSION: set when first session is logged
                                  // - null means "Not Started" (waiting for first session)
}
```

### Existing fields (unchanged but behavior changes)

- `startDate` — keep as-is for backward compatibility with existing packages
- `expiresAt` — now auto-calculated from `effectiveStartDate + duration`, but still editable

---

## Implementation Steps

### Step 1: Schema migration (Complexity: 3)
- Add `StartTrigger` and `DurationUnit` enums
- Add `startTrigger`, `expiryDurationValue`, `expiryDurationUnit` to PackageType
- Add `effectiveStartDate` to Package
- All new fields nullable/defaulted so existing data is unaffected
- Update `/docs/schema.md`

### Step 2: Package Type settings UI (Complexity: 4)
- Add start trigger toggle to PackageType create/edit form (radio: "Date of Purchase" / "First Session")
- Add optional duration fields: number input + unit dropdown (days/weeks/months)
- Show helpful description text explaining each option
- Duration fields hidden/disabled when "No expiry" is selected

### Step 3: Expiry calculation utility (Complexity: 2)
- `calculateExpiryDate(startDate, durationValue, durationUnit)` — returns DateTime
- Handle month arithmetic correctly (e.g. Jan 31 + 1 month = Feb 28)
- Unit: `src/lib/package-expiry.ts`

### Step 4: Package creation integration (Complexity: 3)
- When creating a package from a PackageType:
  - If `DATE_OF_PURCHASE`: set `effectiveStartDate = now`, calculate and set `expiresAt`
  - If `FIRST_SESSION`: leave `effectiveStartDate = null`, leave `expiresAt = null`
- Apply to PackageForm, import flow, and any other package creation paths

### Step 5: First session trigger (Complexity: 4)
- When a session is logged for a package where `effectiveStartDate` is null:
  - Set `effectiveStartDate = session date`
  - Calculate and set `expiresAt` from the package type's duration
- Must handle: session creation, session validation/confirmation flows
- Edge case: what if the session date is in the past?

### Step 6: Package status updates (Complexity: 3)
- Update `getPackageStatus()` in `src/lib/package-status.ts`:
  - Add `not_started` status: package has `first_session` trigger and `effectiveStartDate` is null
  - Priority: `not_started` should come before `active` check
- Update status badge colors/labels across UI:
  - Client detail page
  - Package table
  - Client state derivation (already has "not_started" at client level — align with package level)

### Step 7: Session creation hard lock (Complexity: 3)
- In session creation API: check if package is expired before allowing
- Return clear error: "This package expired on [date]. Please extend the package or assign a new one."
- Update UI to show disabled state / message for expired packages

### Step 8: Package edit — extension support (Complexity: 2)
- Ensure PackageForm allows editing `expiresAt` on expired packages
- When `expiresAt` is extended past now, package re-activates (status logic handles this automatically)
- Optionally show the auto-calculated expiry as a reference when editing

### Step 9: Display enhancements (Complexity: 2)
- Show "Not Started" badge on client detail page for packages waiting for first session
- Show calculated expiry info on package cards (e.g. "Expires in 45 days" or "3 months from first session")
- Show start trigger info on package type cards in settings

### Step 10: Build & test (Complexity: -)
- Verify happy paths:
  - Create package type with `date_of_purchase` + 3 month duration → package gets auto-expiry on creation
  - Create package type with `first_session` + 6 week duration → package shows "Not Started", then auto-calculates expiry on first session
  - Create package type with no duration → no auto-expiry
  - Edit expired package's expiry date → re-activates
  - Try to create session on expired package → blocked
- Verify existing packages unaffected
- `npx next build` passes

---

## What's NOT Changing

- No changes to existing packages — they keep their current `startDate` and `expiresAt` values
- No changes to session scheduling/cancellation logic for future sessions
- No "activation deadline" for Not Started packages — they wait indefinitely
- Import flow unchanged (imported packages use current behavior unless package type has new settings)
- Commission calculations unaffected
- No new API endpoints — existing package type and package CRUD endpoints are extended

---

## UI Mockup Notes

### Package Type Form (Settings)
```
Package Name:     [10 PT Sessions          ]
Default Sessions: [10                       ]
Default Price:    [500.00                   ]

Start Trigger:
  (o) Date of Purchase — Package starts immediately when assigned
  ( ) First Session    — Package starts when first session is logged

Expiry Duration:  [ ] No expiry (unlimited)
                  [3] [Months v]
                  "Package will expire 3 months after start"
```

### Package Card (Client Detail)
```
┌─────────────────────────────────────┐
│ 10 PT Sessions        [Not Started] │
│ 8 / 10 sessions remaining          │
│ Purchased 5 days ago                │
│ Expires: 3 months after first session│
└─────────────────────────────────────┘
```

### After First Session
```
┌─────────────────────────────────────┐
│ 10 PT Sessions            [Active]  │
│ 7 / 10 sessions remaining          │
│ Started: 15 Jan 2026                │
│ Expires: 15 Apr 2026 (in 89 days)  │
└─────────────────────────────────────┘
```
