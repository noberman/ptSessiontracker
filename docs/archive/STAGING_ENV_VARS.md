# Staging Environment Variables for Railway

## Required Environment Variables for Staging Service

Set these in your Railway **staging** service:

```env
# Database (Staging database)
DATABASE_URL=[Your staging PostgreSQL URL]

# NextAuth - Use staging URL
NEXTAUTH_URL=https://fitsync-main-staging.up.railway.app
NEXTAUTH_SECRET=[Same secret as production]

# Email Service
RESEND_API_KEY=[Your Resend API key]
RESEND_FROM_EMAIL=noreply@fitsync.io
RESEND_FROM_NAME=FitSync (Staging)

# Application Settings
APP_URL=https://fitsync-main-staging.up.railway.app
SESSION_VALIDATION_EXPIRY_DAYS=30

# Domain Configuration for Staging
LANDING_DOMAIN=fitsync-main-staging.up.railway.app
APP_DOMAIN=fitsync-main-staging.up.railway.app
NEXT_PUBLIC_APP_URL=https://fitsync-main-staging.up.railway.app

# Environment
NODE_ENV=staging
```

## How the Landing Page Works

The landing page now dynamically determines where to send users:

1. **In Production** (fitsync.io):
   - All login/signup links go to → `https://app.fitsync.io`

2. **In Staging** (Railway URL):
   - All login/signup links go to → `https://fitsync-main-staging.up.railway.app`

3. **Auto-detection Logic**:
   - If hostname includes "staging" or "railway" → Use staging URL
   - If hostname is "localhost" → Use local development URL
   - Otherwise → Use production app.fitsync.io

## Testing

After setting these environment variables and deployment:

1. Visit your staging URL
2. Click "Sign In" or "Get Started"
3. Should redirect to the staging app, not production
4. Verify by checking the URL bar - should stay on Railway domain

## Optional: Custom Staging Domains

If you want custom staging domains (like staging.fitsync.io):

1. Add DNS records in GoDaddy:
   ```
   CNAME staging    ptsessiontracker-staging.up.railway.app
   ```

2. Add custom domain in Railway staging service

3. Update environment variables:
   ```env
   LANDING_DOMAIN=staging.fitsync.io
   APP_DOMAIN=staging.fitsync.io
   NEXT_PUBLIC_APP_URL=https://staging.fitsync.io
   ```