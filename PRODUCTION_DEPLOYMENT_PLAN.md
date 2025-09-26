# Production Deployment Plan - Onboarding Wizard Update

## Deployment Date: [TO BE SCHEDULED]

## Overview
Deploy the new onboarding wizard and related features from staging to production. This includes database migrations, code updates, and verification steps.

## Recent Migrations to Apply

### 1. Organization ID Fields Migration (`20250924_add_organization_id_fields`)
- Adds `organizationId` to clients, packages, and sessions tables
- Includes backfill logic to populate from locations
- Creates performance indexes
- **Status**: SAFE - Uses IF NOT EXISTS clauses

### 2. Onboarding Completed At Migration (`20250924_add_onboarding_completed_at`)
- Adds `onboardingCompletedAt` to users table
- Creates index for efficient queries
- **Status**: SAFE - Uses IF NOT EXISTS clauses

### 3. Demo Fields Migration (`20250925_add_is_demo_fields`)
- Adds `isDemo` boolean to clients, packages, and sessions tables
- Defaults to false for existing data
- **Status**: SAFE - Uses IF NOT EXISTS clauses

## Pre-Deployment Checklist

### 1. Backup Production Database
```bash
# Create production backup BEFORE any changes
railway run -s production npx prisma db pull
railway run -s production pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test on Staging
- [ ] Complete full onboarding flow as new Google user
- [ ] Complete full onboarding flow as new email user
- [ ] Verify demo data creation and cleanup
- [ ] Test commission calculations with demo data
- [ ] Verify session validation emails work
- [ ] Check that existing users can still log in
- [ ] Test invited users don't see onboarding

### 3. Verify Current Production State
```bash
# Check current production schema
railway run -s production npx prisma db pull

# Check migration status
railway run -s production npx prisma migrate status

# Count existing records for validation
railway run -s production npx tsx -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  async function check() {
    const users = await prisma.user.count();
    const sessions = await prisma.session.count();
    const clients = await prisma.client.count();
    console.log({ users, sessions, clients });
  }
  check();
"
```

## Deployment Steps

### Step 1: Apply Database Migrations
```bash
# Switch to production environment
railway environment production

# Run migrations (NEVER use reset!)
railway run npx prisma migrate deploy

# Verify migrations applied
railway run npx prisma migrate status
```

### Step 2: Merge Code to Main Branch
```bash
# Ensure you're on staging branch
git checkout staging

# Pull latest staging
git pull origin staging

# Switch to main branch
git checkout main

# Merge staging to main
git merge staging

# Push to trigger deployment
git push origin main
```

### Step 3: Monitor Deployment
- Watch Railway deployment logs
- Check for any build errors
- Verify deployment completes successfully

## Post-Deployment Verification

### 1. Database Checks
```bash
# Verify new columns exist
railway run -s production npx tsx -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  async function verify() {
    // Check a user record for new field
    const user = await prisma.user.findFirst();
    console.log('User has onboardingCompletedAt:', 'onboardingCompletedAt' in user);
    
    // Check for isDemo fields
    const client = await prisma.client.findFirst();
    console.log('Client has isDemo:', 'isDemo' in client);
  }
  verify();
"
```

### 2. Application Testing
- [ ] Login as existing admin user
- [ ] Create new user via Google OAuth
- [ ] Verify onboarding wizard appears for new users
- [ ] Complete onboarding flow
- [ ] Verify demo data creation works
- [ ] Test session validation emails
- [ ] Check commission calculations
- [ ] Verify existing users NOT forced through onboarding

### 3. Monitor for Issues
- [ ] Check error logs in Railway
- [ ] Monitor Sentry/error tracking (if configured)
- [ ] Check for user complaints/issues
- [ ] Verify email sending works (SendGrid logs)

## Rollback Plan

If issues occur:

### 1. Quick Code Rollback
```bash
# Revert to previous commit
git checkout main
git revert HEAD
git push origin main
```

### 2. Database Rollback (if needed)
```bash
# Only if absolutely necessary - data loss risk!
# Restore from backup created in pre-deployment
railway run -s production psql $DATABASE_URL < backup_[timestamp].sql
```

## Important Notes

1. **NEVER use `prisma migrate reset` on production** - This will DELETE ALL DATA
2. **Always use `prisma migrate deploy` for production** - This safely applies migrations
3. **Test thoroughly on staging first** - Production should have zero surprises
4. **Keep the backup handy** - In case emergency rollback is needed
5. **Monitor closely after deployment** - First 30 minutes are critical

## Feature Flags (Optional Safety)

Consider adding a feature flag to disable onboarding if issues occur:
```typescript
// In middleware or onboarding check
const ONBOARDING_ENABLED = process.env.ONBOARDING_ENABLED !== 'false';

if (!ONBOARDING_ENABLED) {
  // Skip onboarding, go straight to dashboard
  return redirect('/dashboard');
}
```

## Contact for Issues

- Primary: Noah (Product Owner)
- Railway Dashboard: [Access via Railway CLI or Web]
- Database: PostgreSQL on Railway

## Sign-off Checklist

- [ ] Backup completed and verified
- [ ] Staging tested thoroughly
- [ ] Team notified of deployment window
- [ ] Rollback plan understood
- [ ] Monitoring tools ready

---

**Deployment Window**: [TO BE SCHEDULED]
**Estimated Duration**: 30 minutes
**Risk Level**: LOW (idempotent migrations, tested on staging)