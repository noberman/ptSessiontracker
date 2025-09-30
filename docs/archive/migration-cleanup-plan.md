# Migration Cleanup Plan

## Current Issues

### Production has duplicate/misnamed migrations:
- `20250122000000_add_commission_method` (wrong date prefix)
- `20250123000000_add_invitation_system` (wrong date prefix)  
- `20241122_simplify_package_system` (not in our migrations folder)
- Multiple rolled back entries creating confusion

### The Problem
Production migration history doesn't match our migration files. This happened because:
1. Migrations were applied with different names
2. Some failed and were re-applied
3. Manual SQL was run outside of migrations

## Solution: Create a Clean Baseline

Since all databases have the SAME SCHEMA (confirmed by audit), we can:

### Option 1: Reset Migration History (Recommended)
1. **Backup production data** ✅ (already done)
2. **Create a schema-only dump** from production
3. **Clear migration history** (keep schema intact)
4. **Mark all current migrations as applied**
5. **Verify everything works**

### Option 2: Live with it (Not Recommended)
- Keep the messy history
- Risk future migration conflicts
- Harder to debug issues

## Step-by-Step Cleanup Process

### Phase 1: Prepare
```bash
# 1. Verify we're on correct database
DATABASE_URL="[PRODUCTION_URL]" npx prisma migrate status

# 2. Pull current schema from production
DATABASE_URL="[PRODUCTION_URL]" npx prisma db pull

# 3. Compare with our schema.prisma
diff prisma/schema.prisma prisma/schema-from-prod.prisma
```

### Phase 2: Clean Migration History
```sql
-- This will clean the migration table but keep the schema
-- Run this ONLY after confirming backup exists!

-- Step 1: Delete rolled back migrations
DELETE FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL;

-- Step 2: Delete duplicate entries
DELETE FROM _prisma_migrations 
WHERE migration_name IN (
  '20250122000000_add_commission_method',
  '20250123000000_add_invitation_system',
  '20241122_simplify_package_system'
);

-- Step 3: Insert clean history matching our files
-- (We'll generate this list)
```

### Phase 3: Verify
```bash
# Check migration status
DATABASE_URL="[PRODUCTION_URL]" npx prisma migrate status

# Test that app still works
# Create a test migration to ensure it applies cleanly
```

## Correct Migration Order

These are the migrations that should be marked as applied:
1. `20250907143614_init`
2. `20250916015736_add_session_cancellation`
3. `20250916070502_add_commission_tiers`
4. `20250921_add_organization_multi_tenant`
5. `20250921100000_add_commission_method`
6. `20250921200000_add_invitation_system`
7. `20250922000000_add_package_types`
8. `20250924_add_organization_id_fields`
9. `20250924_add_onboarding_completed_at`
10. `20250925_add_is_demo_fields`
11. `20250929055428_add_super_admin_features`

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | Critical | Full backup before any changes ✅ |
| App downtime | Medium | Test on local first, do during low traffic |
| Migration conflict | Low | Schema already matches, just fixing history |

## Success Criteria

After cleanup:
- [ ] Migration history matches our files exactly
- [ ] No rolled back migrations in history
- [ ] `npx prisma migrate status` shows all green
- [ ] Can create and apply new migrations
- [ ] App continues working normally

## Emergency Rollback

If something goes wrong:
1. Restore from Railway backup
2. Document what went wrong
3. Try alternative approach

## Notes

- Production has the correct schema already
- We're only cleaning up the migration history
- No schema changes will be made
- Data will not be affected