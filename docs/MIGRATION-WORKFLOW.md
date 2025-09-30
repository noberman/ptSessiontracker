# Migration Workflow Guide

## 🚨 CRITICAL: Database Identification

### 1. Local Database (Development)
- **Host**: shortline.proxy.rlwy.net
- **Port**: 24951
- **Data**: Your local test data
- **When to use**: Local development and testing

### 2. Staging Database
- **Host**: turntable.proxy.rlwy.net
- **Port**: 24999
- **Data**: Staging test data
- **When to use**: Testing before production deployment
- **Branch**: staging

### 3. Production Database
- **Host**: turntable.proxy.rlwy.net
- **Port**: 44961  
- **Data**: Snap Fitness (REAL beta data - BE CAREFUL!)
- **When to use**: Production deployments only
- **Branch**: main

## 📋 Before ANY Migration

### Pre-Migration Checklist
- [ ] Verify which database you're connected to
- [ ] Check current migration status
- [ ] Review the migration file
- [ ] Have a rollback plan

### Verify Database Connection
```bash
# Check which database you're on
echo $DATABASE_URL | grep -o '@.*:' 

# Should show:
# @shortline.proxy.rlwy.net: (local)
# @turntable.proxy.rlwy.net:44961 (production)
```

## 🔧 Development Workflow

### 1. Create a New Migration
```bash
# Make schema changes in prisma/schema.prisma first, then:
npm run migrate:create -- --name your_migration_name

# Or let Prisma name it:
npm run migrate:dev
```

### 2. Test Locally
```bash
# Apply to your local database
npm run migrate:dev

# Verify it worked
npm run studio
```

### 3. Commit Changes
```bash
# Commit BOTH:
git add prisma/schema.prisma
git add prisma/migrations/[new-migration]/
git commit -m "Add migration: your_migration_name"
```

## 🚀 Deployment Workflow (3-Stage Process)

### NEVER DO THIS:
```bash
# ❌ NEVER run these on staging/production:
npm run migrate:reset  # DELETES ALL DATA!
npm run migrate:dev    # For development only!
prisma db push         # Bypasses migrations!
```

### Proper Migration Flow: Local → Staging → Production

#### 1️⃣ Local Development
```bash
# Create and test migration locally
npm run migrate:dev -- --name your_migration_name

# Verify it works
npm run studio
```

#### 2️⃣ Deploy to Staging
```bash
# Push to staging branch
git checkout staging
git merge your-feature-branch
git push origin staging

# Manually apply to staging database
DATABASE_URL="postgresql://[STAGING_URL]:24999/railway" npx prisma migrate deploy

# Or let Railway auto-deploy if configured
# Test thoroughly on staging environment
```

#### 3️⃣ Deploy to Production
```bash
# After staging verification, merge to main
git checkout main
git merge staging
git push origin main

# Manually apply to production database
DATABASE_URL="postgresql://[PROD_URL]:44961/railway" npx prisma migrate deploy

# Or let Railway auto-deploy if configured
# Monitor production logs
```

### Important Notes:
- **Always test in staging first** before production
- **All 3 databases must stay in sync** with migrations
- **Never skip staging** - it's your safety net
- If a migration fails in staging, DO NOT proceed to production

## 🔍 Troubleshooting

### Check Migration Status
```bash
# See what's applied and pending
DATABASE_URL="[URL]" npx prisma migrate status
```

### Migration Failed?
```bash
# 1. Check the error
DATABASE_URL="[URL]" npx prisma migrate status

# 2. If safe to retry:
DATABASE_URL="[URL]" npx prisma migrate deploy

# 3. If migration needs to be marked as applied:
DATABASE_URL="[URL]" npx prisma migrate resolve --applied "[migration_name]"
```

### Common Issues

#### "Column already exists"
- Someone may have applied manual SQL
- Check if the column actually exists
- Mark migration as applied if schema matches

#### "Enum value already exists"  
- Common with enum additions
- Usually safe to mark as applied
- Verify enum has the value first

#### "Migration not found"
- Check you're in the right directory
- Ensure migrations folder is committed
- Pull latest changes

## 📝 Migration Best Practices

### DO:
- ✅ Test migrations locally first
- ✅ Keep migrations small and focused
- ✅ Name migrations descriptively
- ✅ Include rollback SQL if complex
- ✅ Document breaking changes

### DON'T:
- ❌ Edit existing migrations
- ❌ Delete migration files
- ❌ Run raw SQL in production
- ❌ Skip testing in staging
- ❌ Mix schema and data changes

## 🚨 Emergency Procedures

### If Production Breaks:

1. **Don't Panic!**
2. **Check Railway logs** for exact error
3. **Rollback deployment** if needed (Railway dashboard)
4. **Restore from backup** if data affected
5. **Document what happened** for post-mortem

### Backup Commands:
```bash
# Export production data (BEFORE risky operations)
DATABASE_URL="[PROD_URL]" pg_dump --data-only > backup.sql

# Export schema only
DATABASE_URL="[PROD_URL]" pg_dump --schema-only > schema.sql
```

## 📚 Additional Resources

- [Prisma Migration Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- Railway Dashboard: Check with team for access
- Team Slack: #dev-help for migration issues

## ⚡ Quick Reference

```bash
# Local development (port 24951)
npm run migrate:dev         # Create & apply migrations
npm run studio             # Open Prisma Studio

# Staging deployment (port 24999)
DATABASE_URL="[STAGING_URL]" npx prisma migrate deploy  # Apply to staging
DATABASE_URL="[STAGING_URL]" npx prisma migrate status  # Check staging

# Production deployment (port 44961)
DATABASE_URL="[PROD_URL]" npx prisma migrate deploy     # Apply to production  
DATABASE_URL="[PROD_URL]" npx prisma migrate status     # Check production

# Never use in staging/production
npm run migrate:reset      # ❌ DESTROYS DATA
prisma db push            # ❌ BYPASSES MIGRATIONS
```

### Migration Order is CRITICAL:
1. Local (24951) → Test locally
2. Staging (24999) → Verify in staging
3. Production (44961) → Deploy to production

---

Remember: When in doubt, ask for help! Better safe than sorry with production data.