# Database & Migration Alignment Plan

## Current Situation
We have three databases in different states:
1. **Local Database** (shortline) - Used for development
2. **Staging Database** (port 44961) - Has live beta data (Snap Fitness)
3. **Production Database** (port 24999) - Has test data that shouldn't be there

## Critical Issues
- Migration history is inconsistent across environments
- Database URLs are confusing and easy to mix up
- Staging database (44961) is actually being used as production
- Production database (24999) has wrong data
- Manual SQL changes were applied without proper migrations
- `.env` file points to wrong database

## Plan to Fix Everything

### Phase 1: Document Current State
- [ ] Create database audit script to check all three databases
- [ ] Document exact schema differences between databases
- [ ] List all migrations and their status in each environment
- [ ] Identify which database has the "truth" (most complete schema)

### Phase 2: Backup Everything
- [ ] Export full backup of staging database (44961) with Snap Fitness data
- [ ] Export full backup of local database (shortline)
- [ ] Export backup of production database (24999) if needed
- [ ] Store backups with clear timestamps and labels

### Phase 3: Fix Database URLs & Environment
- [ ] Create `.env.example` with clear database URL documentation
- [ ] Update `.env` to point to correct local database
- [ ] Create `.env.staging` for staging database
- [ ] Create `.env.production` for production database
- [ ] Add clear comments explaining which database is which
- [ ] Update Railway environment variables to match

### Phase 4: Align Database Schemas
- [ ] Choose staging (44961) as source of truth (has real data)
- [ ] Generate a complete schema dump from staging
- [ ] Create a "baseline" migration that represents current state
- [ ] Reset migration history in all environments
- [ ] Apply baseline migration to all databases

### Phase 5: Verify Migration Sync
- [ ] Run `prisma migrate diff` to check schema matches database
- [ ] Ensure all three databases have identical schemas
- [ ] Verify all migrations marked as applied
- [ ] Test creating a new migration and applying to all environments

### Phase 6: Data Cleanup
- [ ] Decide what to do with production database (24999)
- [ ] Remove "Staging Org" test data if not needed
- [ ] Ensure super admin exists in correct production
- [ ] Verify all foreign key relationships are intact

### Phase 7: Create Migration Workflow Guide
- [ ] Document proper migration workflow
- [ ] Create checklist for adding new migrations
- [ ] Add pre-deployment verification steps
- [ ] Create rollback procedures

### Phase 8: Implement Safeguards
- [ ] Add database URL validation to deployment scripts
- [ ] Create pre-migration backup script
- [ ] Add migration status checker
- [ ] Implement migration testing in staging first

## Database URL Reference (TO BE CONFIRMED)

```bash
# Local Development (your machine)
DATABASE_URL="postgresql://postgres:satemsbCySGsRWilwatLbregOEXaxPjY@shortline.proxy.rlwy.net:24951/railway"

# Staging (currently used as production - HAS LIVE DATA!)
DATABASE_URL="postgresql://postgres:HSDwlynGcJCkdGDamyKCSwgpxsrOKfLD@turntable.proxy.rlwy.net:44961/railway"

# Production? (has test data - needs investigation)
DATABASE_URL="postgresql://postgres:ACyQysrYpxpwXqsPagIgKmPUylApGhQR@turntable.proxy.rlwy.net:24999/railway"
```

## Migration Commands Reference

```bash
# Always specify DATABASE_URL explicitly
DATABASE_URL="..." npx prisma migrate dev     # Development only
DATABASE_URL="..." npx prisma migrate deploy  # Staging/Production
DATABASE_URL="..." npx prisma migrate status  # Check status
DATABASE_URL="..." npx prisma db pull        # Pull schema from database
DATABASE_URL="..." npx prisma db push        # Push schema (DANGEROUS)
```

## Success Criteria
- [ ] All three databases have identical schemas
- [ ] Migration history is clean and consistent
- [ ] Clear documentation on which database is which
- [ ] No manual SQL needed for future features
- [ ] Team can deploy without migration errors
- [ ] Rollback procedure is documented and tested

## Risks & Mitigation
- **Risk**: Losing live data in staging (44961)
  - **Mitigation**: Full backup before any changes
- **Risk**: Breaking production application
  - **Mitigation**: Test all changes locally first
- **Risk**: Migration conflicts
  - **Mitigation**: Reset migration history with baseline

## Timeline
- Phase 1-2: Immediate (backup and document)
- Phase 3-4: Today (fix critical issues)
- Phase 5-6: This week (verify and cleanup)
- Phase 7-8: Ongoing (documentation and safeguards)

## Notes
- DO NOT run `prisma migrate reset` on any database with data
- Always backup before making schema changes
- Test migrations on local first, then staging, then production
- Keep this document updated as we progress