# Google OAuth Setup Guide

## Required Redirect URIs

Add ALL of these to your Google Cloud Console OAuth 2.0 Client:

### Development
- `http://localhost:3000/api/auth/callback/google`

### Staging 
- `https://ptracker-staging.up.railway.app/api/auth/callback/google`
- `https://fitsync-main-staging.up.railway.app/api/auth/callback/google` (if using different subdomain)

### Production
- `https://fitsync.io/api/auth/callback/google`
- `https://www.fitsync.io/api/auth/callback/google`

## Environment Variables

### For Staging (Railway)
Set these in your Railway staging service:

```
NEXTAUTH_URL=https://ptracker-staging.up.railway.app
NEXTAUTH_SECRET=[your-secret-key]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

### For Production (Railway)
Set these in your Railway production service:

```
NEXTAUTH_URL=https://fitsync.io
NEXTAUTH_SECRET=[your-secret-key]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

### For Local Development
In your `.env.local`:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

## Troubleshooting

1. **redirect_uri_mismatch error**: 
   - Check that NEXTAUTH_URL matches your actual domain
   - Ensure the redirect URI in Google Console matches exactly (including trailing slashes)
   - Clear browser cookies and try again

2. **Check current staging URL**:
   - Go to your Railway dashboard
   - Look for the staging service
   - Copy the exact URL shown
   - Update NEXTAUTH_URL to match

3. **Multiple staging URLs**:
   - If you have both `ptracker-staging` and `fitsync-main-staging`, add both redirect URIs
   - Set NEXTAUTH_URL to the one you're actually using

## Testing

After updating:
1. Deploy to staging
2. Clear browser cookies
3. Try Google login at: `[your-staging-url]/login`
4. Check browser console for any errors