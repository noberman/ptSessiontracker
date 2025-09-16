# FitSync Deployment Guide

## Environment Setup

### Branches
- **`staging`** - Development/testing branch (DEFAULT for local development)
- **`main`** - Production branch (NEVER commit directly here)

### Railway Environments
1. **Production Environment**
   - Connected to `main` branch
   - Uses production database
   - Contains live customer data
   - URL: Your production URL

2. **Staging Environment**
   - Connected to `staging` branch
   - Uses separate staging database
   - For testing and development
   - URL: Your staging URL

## Database Configuration

### Environment Variables (Set in Railway Dashboard)

**Production Environment:**
```env
DATABASE_URL="postgresql://[PRODUCTION_DB_CONNECTION_STRING]"
NEXTAUTH_URL="https://[PRODUCTION_URL]"
NODE_ENV="production"
```

**Staging Environment:**
```env
DATABASE_URL="postgresql://[STAGING_DB_CONNECTION_STRING]"
NEXTAUTH_URL="https://[STAGING_URL]"
NODE_ENV="staging"
```

## Development Workflow

### 1. Always Work on Staging Branch
```bash
# Ensure you're on staging branch
git checkout staging

# Pull latest changes
git pull origin staging

# Make your changes
git add .
git commit -m "feat: your feature"
git push origin staging
```

### 2. Deploy to Production (After Testing)
```bash
# First, ensure staging is tested and working
# Then create a pull request from staging to main

# Option 1: Via GitHub UI
# Go to: https://github.com/noberman/ptSessiontracker/compare/main...staging
# Create and merge pull request

# Option 2: Via CLI (be careful!)
git checkout main
git merge staging
git push origin main
git checkout staging  # Always return to staging
```

### 3. Database Migrations

**IMPORTANT:** Always test migrations on staging first!

```bash
# For staging (automatic on push to staging)
# Railway will run: npm run build (which includes migrations)

# For production (automatic on merge to main)
# Railway will run: npm run build (which includes migrations)
```

## Safety Rules

### ⚠️ NEVER DO:
1. **Never commit directly to `main` branch**
2. **Never run migrations directly on production database**
3. **Never share production DATABASE_URL in code**
4. **Never test features on production**

### ✅ ALWAYS DO:
1. **Always work on `staging` branch locally**
2. **Always test on staging environment first**
3. **Always backup production database before major changes**
4. **Always use pull requests for main branch updates**

## Quick Commands

```bash
# Check current branch
git branch

# Switch to staging (your default working branch)
git checkout staging

# See which environment you're pointing to
echo $DATABASE_URL

# Create backup of production data (run in Railway dashboard)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

## Railway Configuration

### Setting Up Environment Variables

1. Go to Railway Dashboard
2. Select your project
3. Click on the environment (Staging or Production)
4. Go to Variables tab
5. Ensure these are different for each environment:
   - `DATABASE_URL` - Must point to different databases
   - `NEXTAUTH_URL` - Must match the deployment URL
   - `APP_URL` - Must match the deployment URL

### Connecting Branches to Environments

1. In Railway Dashboard:
   - Production Environment → Settings → Connect to `main` branch
   - Staging Environment → Settings → Connect to `staging` branch

2. Enable automatic deployments for both environments

## Emergency Procedures

### If You Accidentally Push to Production:
1. Immediately revert the commit:
```bash
git checkout main
git revert HEAD
git push origin main
```

2. Check production is working
3. Fix the issue on staging branch
4. Test thoroughly before re-deploying

### Database Rollback:
If migrations fail on production:
1. Access Railway dashboard
2. Run rollback command:
```bash
npx prisma migrate resolve --rolled-back [migration_name]
```

## Current Configuration Status

- [x] Staging branch created
- [ ] Staging environment DATABASE_URL configured in Railway
- [ ] Production environment DATABASE_URL configured in Railway
- [ ] Branch protections enabled on GitHub for `main`
- [ ] Automatic deployments configured in Railway

## Next Steps

1. **In Railway Dashboard:**
   - Ensure staging environment is connected to `staging` branch
   - Ensure production environment is connected to `main` branch
   - Set different DATABASE_URLs for each environment

2. **In GitHub:**
   - Consider enabling branch protection for `main`
   - Require pull request reviews before merging

3. **Locally:**
   - Always ensure you're on `staging` branch:
   ```bash
   git checkout staging
   ```