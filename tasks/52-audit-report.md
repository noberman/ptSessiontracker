# Task 52: Part B Audit Report

## Severity Legend
- **🔴 Critical** — Security risk or data integrity issue, fix immediately
- **🟡 Moderate** — Inconsistency or missing validation, fix before next feature
- **🟢 Minor** — Style/convention issue, fix when convenient

---

## B1: Security & Auth Audit

### Overall Assessment
Good security posture. All protected routes use `getServerSession(authOptions)`, organization scoping is consistent, no hardcoded secrets, passwords properly hashed and redacted. **0 critical findings, 4 moderate, 4 minor.**

### 🟡 B1-1: Cron Endpoint Accepts Missing Secret
**File:** `src/app/api/cron/check-beta-expiry/route.ts` (lines 8-14)
**Issue:** If `CRON_SECRET` env var is unset, the auth check passes — any caller can trigger beta expiry logic.
**Fix:** Require secret always; fail closed if env var missing.

### 🟡 B1-2: Organizations Endpoint Leaks Cross-Org Data
**File:** `src/app/api/organizations/route.ts` (lines 16-19)
**Issue:** GET returns ALL organizations for any ADMIN. No org-scoping filter. An admin from Org A can see Org B's data.
**Fix:** Filter by `session.user.organizationId` or restrict to SUPER_ADMIN only.

### 🟡 B1-3: Client GET Missing Org Verification
**File:** `src/app/api/clients/[id]/route.ts` (lines 21-62)
**Issue:** Queries client by ID without verifying org membership first. Post-fetch role checks exist, but data is fetched before verification.
**Fix:** Add `organizationId` to the `findUnique` where clause.

### 🟡 B1-4: Session Validation Token Information Disclosure
**File:** `src/app/api/sessions/validate/[token]/route.ts` (lines 73-82, 146-157)
**Issue:** Returns distinct responses for "not found" vs "already validated", enabling token enumeration.
**Fix:** Return generic "Invalid token" for both states.

### 🟢 B1-5: Demo Cleanup Missing Role Check
**File:** `src/app/api/demo/cleanup/route.ts` (lines 6-14)
**Issue:** Any authenticated user can delete all demo data for their org. No role restriction.
**Fix:** Add ADMIN role check.

### 🟢 B1-6: Session Validation Missing Idempotency
**File:** `src/app/api/sessions/validate/[token]/route.ts` (lines 160-207)
**Issue:** POST accepts repeated submissions without CSRF or idempotency checks.
**Fix:** Return `already_validated` immediately on second POST.

### 🟢 B1-7: Inconsistent Email Validation
**Files:** `src/app/api/auth/signup/route.ts:21`, `src/app/api/invitations/route.ts:45`, `src/components/clients/ClientForm.tsx:97`, `src/components/invitations/InviteModal.tsx:88`
**Issue:** Simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` used in some places, not used at all in others.
**Fix:** Centralize in `/src/lib/validation.ts`.

### 🟢 B1-8: Inconsistent Bcrypt Salt Rounds
**Files:** `src/app/api/auth/signup/route.ts:67` (12 rounds), `src/app/api/invitations/accept/route.ts:189` (10 rounds), `src/app/api/users/route.ts:253` (10 rounds)
**Issue:** Salt rounds vary between 10 and 12 across endpoints.
**Fix:** Use a shared constant, standardize on 12.

---

## B2: Consistency Audit

### 🔴 B2-1: Role Arrays Not Centralized
**Files:** 22+ API routes, `src/middleware.ts`, `src/components/navigation/Sidebar.tsx`
**Issue:** Role permission arrays are defined inline in every file with inconsistent ordering:
- Middleware: `['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER']`
- Sidebar: `['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER']`
- Users list: `['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN']`

No centralized constants. If a new role is added or permissions change, 22+ files must update.
**Fix:** Create `/src/lib/permissions.ts` with shared constants like `MANAGER_ROLES`.

### 🔴 B2-2: Date Range / Timezone Handling Inconsistent
**Files:** `src/app/api/dashboard/route.ts` (lines 39-91), `src/app/api/payments/route.ts` (lines 49-58), `src/app/api/sessions/list/route.ts` (lines 54-66)
**Issue:**
- Dashboard: Uses `fromZonedTime()` with org timezone (correct)
- Payments: Uses manual `.setHours(23,59,59,999)` — timezone-unaware
- Sessions: Uses raw `new Date()` — timezone-unaware

`getMonthBoundariesInUtc()` utility exists in `/src/utils/timezone.ts` but only dashboard uses it.
**Fix:** Create centralized date range utility. All features must use org timezone.

### 🟡 B2-3: Location Access Logic Duplicated in 14+ Files
**Files:** `src/app/api/clients/list/route.ts`, `src/app/api/users/list/route.ts`, `src/app/api/sessions/list/route.ts`, `src/app/api/packages/list/route.ts`, `src/app/api/payments/route.ts`, and 9+ more
**Issue:** Identical location access pattern repeated:
```typescript
if (role === 'CLUB_MANAGER' || role === 'PT_MANAGER') {
  const accessibleLocations = await getUserAccessibleLocations(...)
  where.locationId = { in: accessibleLocations }
}
```
**Fix:** Extract to `/src/lib/api-filters.ts`.

### 🟡 B2-4: Pagination Logic Duplicated in 20+ Files
**Issue:** Identical pagination parsing in every list endpoint:
```typescript
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '10')
const skip = (page - 1) * limit
```
**Fix:** Extract to `/src/lib/pagination.ts`.

### 🟡 B2-5: Location Parameter Naming Inconsistent
**Issue:** Some endpoints use `locationId` (singular), others use `locationIds` (plural array). Payments uses plural, clients/sessions/packages use singular.
**Fix:** Standardize to `locationIds` for multi-select across all APIs.

### 🟢 B2-6: Modal/Form Pattern Variations
**Issue:** Two modal approaches exist (component-based vs integration-based). Minor differences in close handling, error display positioning. Forms are largely consistent.
**Fix:** Create shared `ConfirmModal` wrapper and `useForm` hook.

### 🟢 B2-7: API Error Response Shapes
**Issue:** 95% consistent (`{ error: string }`). A couple of places check `data.message || data.error`.
**Fix:** Minor — create standardized response types.

---

## B3: Schema & Data Integrity

### 🔴 B3-1: No Database Constraint on Payment Amount
**Field:** `Payment.amount` (Float)
**Issue:** No DB-level constraint preventing negative or zero amounts. Only application-level validation in `/api/payments/route.ts`.
**Risk:** Direct DB manipulation or application bypass could create invalid financial records.
**Fix:** Add check constraint `amount > 0`.

### 🔴 B3-2: No Constraint on Package Session Counts
**Fields:** `Package.totalSessions`, `Package.remainingSessions`
**Issue:** No DB constraint preventing zero or negative values. Application assumes `totalSessions > 0` for division.
**Risk:** Division by zero in calculations.
**Fix:** Add constraints `totalSessions > 0`, `remainingSessions >= 0`.

### 🔴 B3-3: Location Trainer N+1 Query
**File:** `src/app/api/locations/route.ts` (lines 83-117)
**Issue:** For each location, a separate query fetches trainers. 10 locations = 10 extra queries.
**Fix:** Batch query all trainers for all locations, then group in-memory.

### 🟡 B3-4: Missing Indexes on Frequently Queried Fields
**Issue:**
- `Client.active` — No index, but filtered in every client list query
- `User.organizationId` — No direct index
- `Package(clientId, active)` — No composite index
**Fix:** Add `@@index([organizationId, active])` on Client and User; add `@@index([clientId, active])` on Package.

### 🟡 B3-5: CommissionTier v1 Table Unused
**Model:** `CommissionTier`
**Issue:** Legacy model, fully replaced by `CommissionTierV2`/`CommissionProfile`. Only referenced in migration code.
**Fix:** Remove model and drop table after confirming migration is complete.

### 🟡 B3-6: Session Foreign Keys Missing onDelete
**Relations:** `Session.trainer`, `Session.client`, `Session.location`, `Session.package`
**Issue:** No explicit `onDelete` behavior set. PostgreSQL defaults to RESTRICT, which prevents deletion but doesn't define cleanup behavior.
**Fix:** Add explicit `onDelete` settings (likely RESTRICT is correct, but should be documented).

### 🟡 B3-7: Payment.package onDelete: Cascade Risky
**Relation:** `Payment.package` has `onDelete: Cascade`
**Issue:** Deleting a package cascades to delete all payment records — losing financial audit trail.
**Fix:** Consider `onDelete: Restrict` or soft-delete pattern for packages.

### 🟢 B3-8: Unused Database Fields
- `Organization.adminNotes` — Never queried or written
- `Organization.betaPreviousTier` — Only set, never read
- `Location.archivedBy` — Set but never queried
- `Package.packageType` (string) — Redundant with `packageTypeId` relation
**Fix:** Remove in a future cleanup pass.

---

## B4: Architectural Concerns

### 🔴 B4-1: Dashboard Route is 1,184 Lines
**File:** `src/app/api/dashboard/route.ts`
**Issue:** Monolithic route handling all dashboard data for 4 user roles with 40+ possible queries, nested Promise.all chains, business logic mixed with data fetching.
**Fix:** Extract into role-specific handlers and utility functions (e.g., `getTrainerDashboard()`, `getManagerDashboard()`).

### 🔴 B4-2: No Suspense Boundaries or Loading States
**Issue:** Zero `<Suspense>` boundaries in the codebase. Missing `loading.tsx` files for all major routes: dashboard, sessions, packages, clients. Only one global `error.tsx` exists.
**Fix:** Add `loading.tsx` and `error.tsx` to each authenticated route segment.

### 🟡 B4-3: Large Client Components
**Issue:**
- `ManagerDashboard.tsx` — 1,157 lines (should split into Stats, Charts, Leaderboard, Filters)
- `ClientImportForm.tsx` — 1,085 lines (should split into stage-specific components)
- `CommissionProfileModal.tsx` — 835 lines
- `PackageForm.tsx` — 724 lines
**Fix:** Split into smaller focused components.

### 🟡 B4-4: Client Import Route is 891 Lines
**File:** `src/app/api/clients/import/route.ts`
**Issue:** CSV parsing, validation, fuzzy matching, and transaction-based import all in one route. 20+ console.log statements left in production.
**Fix:** Extract parsing/validation into utility modules. Remove debug logs.

### 🟡 B4-5: No Background Job System
**Issue:** Email sending, commission calculations, and webhook processing all execute synchronously within request handlers. No queue or background job system.
**Fix:** Consider a job queue for email notifications and heavy calculations.

### 🟡 B4-6: Dashboard In-Memory Aggregation Without Pagination
**File:** `src/app/api/dashboard/route.ts` (lines 470-515)
**Issue:** Fetches ALL sessions for a period into memory, processes in Maps. No pagination. With 10,000+ sessions, this will degrade.
**Fix:** Use DB-level aggregation (GROUP BY) instead of in-memory processing.

### 🟡 B4-7: Timezone Logic Scattered
**Issue:** Dashboard, payments, sessions, and commission routes each implement their own timezone conversion. `fromZonedTime`/`toZonedTime` imported in 5+ routes independently.
**Fix:** Centralize in `/src/lib/date-utils.ts`.

### 🟢 B4-8: Props Drilling in Dashboard Components
**Issue:** `ManagerDashboard` receives 15+ props. Timezone, role, and location data passed through multiple component levels.
**Fix:** Use React Context for org timezone, user role, and accessible locations.

### 🟢 B4-9: No Shared DataTable Abstraction
**Issue:** Clients, Sessions, Users, Payments, and Packages pages each implement similar table/filter/pagination patterns independently.
**Fix:** Create a generic `<DataTable>` component.

---

## Summary by Severity

| Severity | Count | Categories |
|----------|-------|------------|
| 🔴 Critical | 6 | Role arrays not centralized, date/timezone inconsistency, payment amount constraint, session count constraint, N+1 query, dashboard monolith, missing loading states |
| 🟡 Moderate | 14 | Cross-org data leak, missing org verification, location logic duplication, pagination duplication, missing indexes, unused legacy table, FK behavior, large components, no job queue, timezone scatter |
| 🟢 Minor | 8 | Demo cleanup role check, email validation, bcrypt rounds, unused DB fields, modal patterns, error shapes, props drilling, DataTable abstraction |

---

## Batch 1: Mechanical Fixes (No Decisions Needed)

These are straightforward fixes that can be implemented autonomously.

| ID | Issue | Fix |
|----|-------|-----|
| B1-8 | Bcrypt salt rounds inconsistent (10 vs 12) | Standardize all to 12 rounds |
| B2-4 | Pagination logic duplicated in 20+ files | Extract to `/src/lib/pagination.ts` |
| B3-3 | Locations N+1 query | Batch query trainers, group in-memory |
| B4-2 | No loading.tsx files | Add to dashboard, sessions, packages, clients |
| B1-6 | Session validation missing idempotency | Return `already_validated` on second POST |
| B2-7 | API error response minor variations | Standardize to `{ error: string }` |

---

## Batch 2: Quick Decisions Needed

One-liner questions before implementing.

| ID | Issue | Question |
|----|-------|----------|
| B1-1 | Cron secret accepts missing env var | Fail closed (reject if no secret) or log warning and allow? |
| B1-5 | Demo cleanup has no role check | Restrict to ADMIN only, or ADMIN + PT_MANAGER? |
| B3-1 | No DB constraint on Payment.amount | Add via Prisma migration, or just tighten app validation? |
| B3-2 | No DB constraint on Package session counts | Add via Prisma migration, or just tighten app validation? |
| B1-2 | Organizations endpoint returns all orgs | Filter by user's org, or restrict to SUPER_ADMIN only? |
| B1-3 | Client GET missing org verification | Add organizationId to query, or verify after fetch? |
| B1-4 | Session validation token info disclosure | Return generic error for all states, or keep distinct? |
| B3-7 | Payment.package onDelete: Cascade | Change to Restrict, or keep Cascade with soft-delete? |

---

## Batch 3: Design Decisions Required

These need discussion/planning before implementation.

| ID | Issue | Decision Needed |
|----|-------|-----------------|
| B2-1 | Role arrays scattered in 22+ files | What's the canonical permission matrix? Who can do what? |
| B2-2 | Date/timezone handling inconsistent | Should all features use org timezone, or is UTC okay for some? |
| B2-3 | Location access logic duplicated | What's the standard pattern? Create utility or middleware? |
| B4-1 | Dashboard route is 1,184 lines | How to decompose? Role-specific handlers? Separate endpoints? |
| B4-3 | Large client components (1,000+ lines) | Priority order for splitting? Which components first? |
| B4-5 | No background job system | Worth adding now (what provider?), or defer? |
| B4-6 | Dashboard in-memory aggregation | Rewrite to DB-level GROUP BY, or accept current limits? |
| B3-4 | Missing database indexes | Which indexes to add? Performance testing needed? |
| B3-5 | CommissionTier v1 unused | Confirm migration complete before dropping? |
| B3-6 | Session FK missing onDelete | What should happen when trainer/client/location deleted? |
| B2-5 | locationId vs locationIds naming | Standardize to plural everywhere, or context-dependent? |
| B4-7 | Timezone logic scattered | Centralize to single utility, or per-feature utils? |
| B4-8 | Props drilling in dashboard | Add React Context, or refactor component structure? |
| B4-9 | No shared DataTable | Build generic component, or keep page-specific tables? |
| B3-8 | Unused DB fields | Safe to remove, or keep for future use? |
| B1-7 | Email validation inconsistent | What regex/library to standardize on? |
| B2-6 | Modal/form pattern variations | Create shared hooks/components, or leave as-is? |

---

## 🤖 Claude Context Update (2026-02-03)

### What's Been Completed

**Part A (Autonomous cleanup):** ✅ Committed in `9b67a1a`
- Removed dead code, improved TypeScript strictness, performance quick wins, schema docs sync

**Batch 1 (Mechanical fixes):** ✅ Committed in `47ea6cd`
- B1-8: Standardized bcrypt to 12 rounds (4 files)
- B2-4: Created `/src/lib/pagination.ts` utility
- B3-3: Fixed N+1 query in locations route (batch query trainers)
- B4-2: Added `loading.tsx` to dashboard, sessions, packages, clients
- B1-6: Added idempotency to session validation endpoint

**Batch 2 (Quick decisions):** ✅ Committed in `1d9a72b`
- B1-2: Restricted GET /api/organizations to SUPER_ADMIN only
- B1-3: Added organizationId filter to GET /api/clients/[id] (changed findUnique to findFirst)
- B1-5: Added ADMIN role check to DELETE /api/demo/cleanup

**Skipped items (user decision):**
- B1-1 (cron secret): No cron job configured, skipped
- B1-4 (token info disclosure): User chose to keep distinct responses for UX
- B3-7 (cascade delete): Soft-delete pattern protects data, skipped
- B3-1 & B3-2 (DB constraints): App validation already exists, skipped DB constraints

### Current Blocker

**Git push is hanging.** 3 commits are ready locally but can't push to staging:
```
git log --oneline HEAD~3..HEAD
1d9a72b fix: Task 52 Part B Batch 2 - security fixes
47ea6cd chore: Task 52 Part B Batch 1 - mechanical fixes
9b67a1a chore: technical debt cleanup Part A (Task 52)
```

The issue:
- `git fetch` works fine
- `git push` hangs at `pack-objects` stage (local operation, before network transfer)
- Not a network issue - happens even with different WiFi
- Not corruption - `git fsck` found nothing
- Tried: larger http.postBuffer, SSH (not set up), single commit push - all hang

**User is rebooting Mac to fix git.** After reboot, try:
```bash
git push origin staging
```

### What's Next

After successful push, continue with **Batch 3: Design Decisions**. These require discussion:
- B2-1: Role permission matrix centralization
- B2-2: Timezone strategy (all org timezone vs UTC)
- B4-1: Dashboard decomposition approach
- B4-3: Large component splitting priority
- And 13 more items listed in Batch 3 table above

User preferred going through decisions one by one for Batch 3.
