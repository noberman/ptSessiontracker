# Task 52: Technical Debt Audit & Cleanup

## Overview
Comprehensive audit of the FitSync codebase to identify and resolve dead code, inconsistencies, performance issues, and stability concerns before beginning the next major feature addition. The codebase was built incrementally across 50+ tasks and needs a consolidation pass.

Work is split into two parts:
- **Part A** — Safe to execute autonomously (mechanical, low-risk changes)
- **Part B** — Requires review before acting (produces a findings report for approval)

---

## Part A: Autonomous Cleanup

These items are mechanical and low-risk. Claude can scan, fix, and commit without prior approval. A summary of what was changed will be provided after each phase.

### A1: Dead Code & Unused Dependencies (complexity: 3/10)
- [ ] 1. Identify and remove unused component files (never imported anywhere)
- [ ] 2. Identify and remove unused API routes (never called from frontend)
- [ ] 3. Identify and remove unused exports (functions, types, constants)
- [ ] 4. Identify and remove unused npm dependencies from package.json
- [ ] 5. Remove orphaned files or scripts
- [ ] 6. Clean up unused imports across all files

### A2: TypeScript Strictness (complexity: 3/10)
- [ ] 7. Replace `any` types with proper types where straightforward
- [ ] 8. Fix unchecked null/undefined access patterns (like the `0 && JSX` bug we found)
- [ ] 9. Consolidate duplicate interface definitions (e.g., Payment interface defined in multiple files)
- [ ] 10. Add missing return types on exported functions where obvious

### A3: Performance Quick Wins (complexity: 3/10)
- [ ] 11. Fix unnecessary client components that could be server components
- [ ] 12. Fix large imports (e.g., importing entire library when only one function is needed)
- [ ] 13. Parallelize independent sequential awaits in API routes
- [ ] 14. Fix any infinite re-render risks from bad useEffect dependencies

### A4: Schema Documentation Sync (complexity: 2/10)
- [ ] 15. Verify schema.md matches actual Prisma schema — fix any drift

---

## Part B: Audit & Report (Requires Review)

These items require judgment calls or could change business behavior. Claude will scan the codebase and write findings to **`/tasks/52-audit-report.md`** for review. No code changes until approved.

### B1: Security & Auth Audit
- [ ] 16. Audit all API routes for proper authentication (getServerSession present)
- [ ] 17. Audit all API routes for proper authorization (correct role checks)
- [ ] 18. Audit all API routes for organization scoping (no cross-org data leaks)
- [ ] 19. Check for exposed sensitive data in API responses
- [ ] 20. Verify input validation on all POST/PUT routes
- [ ] 21. Check for hardcoded secrets or credentials

### B2: Consistency Audit
- [ ] 22. Audit location filtering logic across all pages (client.locationId vs trainer.locations)
- [ ] 23. Audit role-based permission arrays across routes and pages (who can do what)
- [ ] 24. Audit date range computation across dashboard, payments, commission, sessions
- [ ] 25. Audit API error response shapes (consistent format across all routes)
- [ ] 26. Audit naming conventions (plural vs singular params, camelCase consistency)
- [ ] 27. Identify duplicated logic that should be shared utilities
- [ ] 28. Audit modal/form patterns for structural consistency

### B3: Schema & Data Integrity
- [ ] 29. Identify unused database columns or tables
- [ ] 30. Check for missing indexes on frequently queried fields
- [ ] 31. Audit N+1 query patterns (sequential DB calls that should be batched)
- [ ] 32. Verify foreign key onDelete behavior is appropriate
- [ ] 33. Check for missing validation constraints (e.g., amount > 0 at DB level)

### B4: Architectural Concerns
- [ ] 34. Identify API routes doing too much (should be split)
- [ ] 35. Check for missing error boundaries or loading states
- [ ] 36. Flag any patterns that will be problematic for scaling

---

## Execution Order

### Step 1: Run Part A (autonomous)
Execute A1 → A2 → A3 → A4 sequentially. Commit after each sub-phase. Run build + type check after each to verify no regressions.

### Step 2: Run Part B audit (produce report)
Scan the full codebase for B1 → B2 → B3 → B4. Write all findings to `/tasks/52-audit-report.md` with severity ratings:
- **🔴 Critical** — Security risk or data integrity issue, fix immediately
- **🟡 Moderate** — Inconsistency or missing validation, fix before next feature
- **🟢 Minor** — Style/convention issue, fix when convenient

### Step 3: Review & act on report
User reviews `52-audit-report.md`, approves which items to fix. Claude implements approved fixes.

---

## Dependencies
- None — standalone cleanup task
- Should be completed before starting major new feature work
