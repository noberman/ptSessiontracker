# Railway Deployment Configuration

## Domain Setup for FitSync

This guide explains how to configure Railway to serve the landing page on `fitsync.io` and the main application on `app.fitsync.io`.

## Single Service Setup (Recommended)

Since we're using domain-based routing in the middleware, you only need ONE Railway service:

### 1. Railway Service Configuration

In your Railway service settings:

1. **Service Name**: `fitsync-production`
2. **Build Command**: `npm run build`
3. **Start Command**: `npm run start`
4. **Port**: Railway will auto-detect (Next.js uses 3000)

### 2. Environment Variables

Set these environment variables in Railway:

```env
# Database
DATABASE_URL=[Your Railway PostgreSQL URL]

# NextAuth
NEXTAUTH_URL=https://app.fitsync.io
NEXTAUTH_SECRET=[Generate a secure secret]

# Email Service
RESEND_API_KEY=[Your Resend API key]
RESEND_FROM_EMAIL=noreply@fitsync.io
RESEND_FROM_NAME=FitSync

# Application Settings
APP_URL=https://app.fitsync.io
SESSION_VALIDATION_EXPIRY_DAYS=30

# Domain Configuration
LANDING_DOMAIN=fitsync.io
APP_DOMAIN=app.fitsync.io
NEXT_PUBLIC_APP_URL=https://app.fitsync.io

# Environment
NODE_ENV=production
```

### 3. Custom Domain Configuration

In Railway's domain settings for your service:

1. **Add Custom Domain #1**: 
   - Domain: `fitsync.io`
   - Add the CNAME or A record to your DNS provider as instructed by Railway

2. **Add Custom Domain #2**: 
   - Domain: `app.fitsync.io`
   - Add the CNAME record to your DNS provider as instructed by Railway

3. **Add Custom Domain #3** (optional but recommended):
   - Domain: `www.fitsync.io`
   - This should redirect to `fitsync.io`

### 4. DNS Configuration

In your DNS provider (e.g., Cloudflare, Namecheap):

```
# For the root domain (if your DNS provider supports CNAME flattening)
fitsync.io        CNAME    [your-service].up.railway.app

# OR use A records (if CNAME flattening not supported)
fitsync.io        A        [Railway's IP address]

# For subdomains
app.fitsync.io    CNAME    [your-service].up.railway.app
www.fitsync.io    CNAME    [your-service].up.railway.app
```

### 5. SSL Certificates

Railway automatically provisions SSL certificates for all custom domains via Let's Encrypt. No additional configuration needed.

## How It Works

The application uses middleware-based routing to serve different content based on the domain:

1. **fitsync.io** → Shows the landing page
2. **app.fitsync.io** → Shows the application (login/dashboard)
3. **www.fitsync.io** → Shows the landing page

The middleware (`src/middleware.ts`) detects the hostname and routes accordingly:
- Landing domain requests get the marketing landing page
- App subdomain requests get the application with authentication

## Testing Locally

To test the domain routing locally:

1. Edit your `/etc/hosts` file (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
127.0.0.1    local.fitsync.io
127.0.0.1    app.local.fitsync.io
```

2. Update `.env.local`:
```env
LANDING_DOMAIN=local.fitsync.io:3000
APP_DOMAIN=app.local.fitsync.io:3000
NEXT_PUBLIC_APP_URL=http://app.local.fitsync.io:3000
```

3. Access:
- `http://local.fitsync.io:3000` - Landing page
- `http://app.local.fitsync.io:3000` - Application

## Deployment Steps

1. **Push to GitHub**: Commit all changes
2. **Railway Auto-Deploy**: Railway will automatically build and deploy
3. **Configure Domains**: Add custom domains in Railway settings
4. **Update DNS**: Add CNAME/A records at your DNS provider
5. **Wait for Propagation**: DNS changes can take 5-48 hours
6. **Verify SSL**: Check that HTTPS works on both domains

## Alternative: Two Separate Services

If you prefer to completely separate the landing page and app:

1. Create a separate Next.js project for the landing page
2. Deploy as a second Railway service
3. Configure domains separately for each service

However, the single service approach is simpler and more maintainable.

## Troubleshooting

### Domain not working
- Check DNS propagation using `dig` or online tools
- Verify CNAME/A records are correct
- Ensure Railway shows "Valid" for custom domain

### SSL Certificate Issues
- Railway auto-provisions certificates, wait 5-10 minutes
- Check Railway logs for Let's Encrypt errors

### Routing Issues
- Check middleware console logs
- Verify environment variables are set correctly
- Test with Railway's provided domain first

## Support

- Railway Documentation: https://docs.railway.app/guides/public-networking
- Railway Discord: https://discord.gg/railway
- FitSync Issues: Create an issue in your repository