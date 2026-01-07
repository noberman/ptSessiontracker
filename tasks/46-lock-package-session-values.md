# Task 46: Lock Package Session Values to Prevent Commission Discrepancies

## Problem Statement

Session values tallied at month-end are inconsistent with expected commission payments. Since we know all package types and their session values, the commission calculations should be predictable. However, we're seeing variance because:

1. **Non-admin users can modify package values after creation** - Club managers, PT managers, and trainers can change `totalValue` and `totalSessions` on existing packages, which recalculates `sessionValue`
2. **Users can override template values on package creation** - Even when selecting a package type template, users can manually change the values, leading to non-standard session values

This creates payroll reconciliation issues where the commission report shows amounts that don't match the expected values based on package types.

## Current Behavior

### Package Edit Form (`PackageForm.tsx`)
- **All non-trainer users** (Club Manager, PT Manager, Admin) can edit:
  - Package Name
  - Total Value
  - Total Sessions
  - Start Date / Expiry Date
  - Active status
- **Only Admins** can edit:
  - Remaining Sessions

### Package Create Form
- User selects a Package Type template
- Template populates: name, totalValue, totalSessions
- User can **override all values** including totalValue and totalSessions
- Session value is calculated: `totalValue / totalSessions`

### Session Value Calculation
Currently calculated dynamically in the form:
```typescript
sessionValue = totalValue / totalSessions
```

This means any change to either field affects commission calculations.

---

## Proposed Solution

### Part 1: Lock Package Editing by Role

**Goal**: Prevent non-admin users from modifying values that affect session value after a package is created.

| Field | TRAINER | CLUB_MANAGER | PT_MANAGER | ADMIN |
|-------|---------|--------------|------------|-------|
| Package Name | - | Read | Read | Edit |
| Total Value | - | Read | Read | Edit |
| Total Sessions | - | Read | Read | Edit |
| Session Value | - | Read | Read | Read (calculated) |
| Remaining Sessions | - | Edit | Edit | Edit |
| Start Date | - | Edit | Edit | Edit |
| Expiry Date | - | Edit | Edit | Edit |
| Active Status | - | Edit | Edit | Edit |

**Rationale**:
- Only admins should adjust financial values that impact commission calculations
- Non-admins need to adjust remaining sessions (e.g., when manually reconciling with Glofox)
- Dates don't affect commission - club managers often need to extend expiry dates for clients
- Active status toggle is safe for non-admins to manage

### Part 2: Store Session Value Once, Never Recalculate

**Goal**: Session value is calculated and stored at package creation time. It never changes, even if an admin later modifies totalValue or totalSessions.

**Current behavior**:
- `sessionValue` is stored in the database on the Package model
- But if someone edits totalValue or totalSessions, the API recalculates and updates sessionValue
- This causes commission discrepancies

**New behavior**:
- `sessionValue` is calculated once at creation: `totalValue / totalSessions`
- On edit, `sessionValue` is **never updated**, regardless of what fields change
- This ensures commission calculations remain stable
- If an admin truly needs to change session value, they must create a new package

**Why this is simpler**:
- No need to lock fields on the create form
- Users can still customize packages (discounts, bonus sessions, etc.)
- The commission-critical value is immutable after creation
- Less UI complexity, same outcome

---

## Implementation Plan

### Phase 1: Update Package Edit Form (Complexity: 3/10)

#### Step 1.1: Modify PackageForm.tsx for Edit Mode
```typescript
// Add role-based field disabling in edit mode
const isEdit = !!packageData
const canEditFinancials = currentUserRole === 'ADMIN'

// For Total Value field
<Input
  id="totalValue"
  type="number"
  required
  min="0"
  step="0.01"
  value={formData.totalValue}
  onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
  disabled={isEdit && !canEditFinancials}  // NEW: Disable for non-admins in edit mode
  className={isEdit && !canEditFinancials ? 'bg-gray-100 cursor-not-allowed' : ''}
/>

// For Total Sessions field
<Input
  id="totalSessions"
  type="number"
  required
  min="1"
  value={formData.totalSessions}
  onChange={(e) => setFormData({ ...formData, totalSessions: e.target.value })}
  disabled={isEdit && !canEditFinancials}  // NEW: Disable for non-admins in edit mode
  className={isEdit && !canEditFinancials ? 'bg-gray-100 cursor-not-allowed' : ''}
/>
```

#### Step 1.2: Add Helper Text for Non-Admins
```tsx
{isEdit && !canEditFinancials && (
  <p className="text-xs text-text-secondary mt-1">
    Contact an admin to modify package value or session count
  </p>
)}
```

#### Step 1.3: Update API Validation (`/api/packages/[id]/route.ts`)
```typescript
// In PUT handler, validate role before allowing financial changes
if (session.user.role !== 'ADMIN') {
  // Strip out financial fields - only allow specific fields
  const allowedFields = ['remainingSessions', 'active', 'expiresAt']

  // If they're trying to change totalValue or totalSessions, reject
  if (body.totalValue !== undefined || body.totalSessions !== undefined) {
    return NextResponse.json(
      { error: 'Only admins can modify package value or session count' },
      { status: 403 }
    )
  }
}
```

### Phase 2: Make Session Value Immutable After Creation (Complexity: 2/10)

#### Step 2.1: Update Package PUT API to Never Change sessionValue
```typescript
// In PUT /api/packages/[id]/route.ts

// When updating a package, explicitly exclude sessionValue from updates
const updateData: any = {
  name: body.name,
  active: body.active,
  startDate: body.startDate,
  expiresAt: body.expiresAt,
}

// Only admins can update financial fields
if (session.user.role === 'ADMIN') {
  updateData.totalValue = body.totalValue
  updateData.totalSessions = body.totalSessions
  updateData.remainingSessions = body.remainingSessions
  // NOTE: sessionValue is intentionally NOT updated
  // It was set at creation and remains fixed for commission accuracy
} else {
  // Non-admins can only update these fields
  updateData.remainingSessions = body.remainingSessions
}

const updatedPackage = await prisma.package.update({
  where: { id },
  data: updateData,
})
```

#### Step 2.2: Add Comment in UI for Clarity
In the edit form, show the stored session value as read-only context:
```tsx
<div className="bg-background-secondary rounded-lg p-3">
  <p className="text-sm text-text-secondary">
    Session Value: <span className="font-semibold text-text-primary">
      ${packageData.sessionValue.toFixed(2)} per session
    </span>
    <span className="block text-xs mt-1">
      Set at package creation. Used for commission calculations.
    </span>
  </p>
</div>
```

#### Step 2.3: Ensure POST API Calculates sessionValue Correctly
The create endpoint already calculates this - just verify it's working:
```typescript
// In POST /api/packages/route.ts
const sessionValue = totalValue / totalSessions

const newPackage = await prisma.package.create({
  data: {
    // ... other fields
    sessionValue: sessionValue,  // Calculated once, never changes
  }
})
```

### Phase 3: Testing (Complexity: 2/10)

#### Step 3.1: Test Cases
- [ ] Non-admin cannot change totalValue on existing package (API returns 403)
- [ ] Non-admin cannot change totalSessions on existing package (API returns 403)
- [ ] Non-admin CAN change remainingSessions on existing package
- [ ] Non-admin CAN change start date and expiry date
- [ ] Admin CAN change totalValue and totalSessions
- [ ] Session value does NOT change when admin updates totalValue
- [ ] Session value does NOT change when admin updates totalSessions
- [ ] New package creation correctly calculates and stores sessionValue
- [ ] Commission calculations use stored sessionValue (not recalculated)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/packages/PackageForm.tsx` | Add role-based field disabling for edit mode, show immutable sessionValue |
| `src/app/api/packages/[id]/route.ts` | Add role validation, never update sessionValue on PUT |
| `src/app/api/packages/route.ts` | Verify sessionValue calculation on POST (likely no changes needed) |

---

## Migration Considerations

### Existing Packages
- No schema migration needed
- Existing packages retain their current sessionValue
- New restrictions only apply going forward

### Communication
- Notify club managers / PT managers about the change
- Explain they need to contact admin for financial corrections
- Provide clear UI messaging about why fields are locked

---

## Success Criteria

1. **Commission Accuracy**: Month-end commission reports match expected values based on package types
2. **Audit Trail**: Session values don't change unexpectedly after package creation
3. **User Experience**: Clear messaging about locked fields and how to request changes
4. **Admin Control**: Admins retain full control for corrections when needed

---

## Rollback Plan

If issues arise:
1. Remove the `disabled` props from form fields
2. Remove server-side validation checks
3. No database changes to rollback

---

## Definition of Done

- [ ] Non-admin users cannot edit totalValue/totalSessions on existing packages
- [ ] Non-admin users CAN edit remainingSessions, dates, and active status
- [ ] Session value is immutable after package creation (even for admins editing other fields)
- [ ] Server-side validation prevents bypassing UI restrictions
- [ ] Clear UI messaging showing session value is fixed
- [ ] Manual testing completed for all user roles
- [ ] No regression in existing package functionality
