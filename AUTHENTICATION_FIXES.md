# Authentication Fixes Guide

## Issues Identified

Based on your logs, the following issues were found:

1. **✅ FIXED: AuthStrategy was disabled** - Enabled `unstable_newEmbeddedAuthStrategy: true`
2. **❌ App was uninstalled** - The webhook shows the app was uninstalled from `cranberry-dope.myshopify.com`
3. **❌ MemorySessionStorage** - Not suitable for production (but functional for now)

## What Was Fixed

### 1. Enabled OAuth Token Exchange

- Updated `shopify.server.ts` to enable `unstable_newEmbeddedAuthStrategy: true`
- This allows the app to use OAuth token exchange instead of auth code

### 2. Improved Error Handling

- Added better error detection for 410 (Gone) responses
- Created `AppUninstalledBanner` component for better UX
- Enhanced authentication error messages

### 3. Better Session Storage Configuration

- Added environment-aware session storage configuration
- Improved cookie security settings

## Next Steps to Resolve Authentication Issues

### 1. Reinstall the App

The app was uninstalled from the store. You need to reinstall it:

1. Go to your Shopify Partner Dashboard
2. Navigate to your app
3. Click "Install app" or "Test app"
4. Enter the store domain: `cranberry-dope.myshopify.com`
5. Follow the installation process

### 2. Verify Environment Variables

Make sure these environment variables are set correctly in your production environment:

```bash
SHOPIFY_API_KEY=d99f8bbe7d0eb2cf598b442bd7b83b38
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://ilf-product-export-embeded.onrender.com
NODE_ENV=production
```

### 3. Test the Authentication

After reinstalling, test the authentication:

1. Visit: `https://ilf-product-export-embeded.onrender.com/test`
2. Check the logs for authentication success
3. Verify the app loads properly in the Shopify admin

### 4. Consider Persistent Session Storage (Optional)

For better production reliability, consider implementing persistent session storage:

```bash
# Install Redis session storage
npm install @shopify/shopify-app-session-storage-redis

# Or install Prisma session storage
npm install @shopify/shopify-app-session-storage-prisma
```

## Debugging Commands

### Check Authentication Status

```bash
curl https://ilf-product-export-embeded.onrender.com/test
```

### Check Health Endpoint

```bash
curl https://ilf-product-export-embeded.onrender.com/healthz
```

### View App in Shopify Admin

1. Go to your Shopify store admin
2. Navigate to Apps
3. Find and click on your app
4. Check if it loads without authentication errors

## Common Issues and Solutions

### Issue: "App has been uninstalled"

**Solution**: Reinstall the app through the Shopify Partner Dashboard

### Issue: "Authentication required"

**Solution**: Make sure the app is properly installed and the session is valid

### Issue: "410 Gone" responses

**Solution**: The app was uninstalled. Reinstall it.

### Issue: Session not persisting

**Solution**: Consider implementing persistent session storage (Redis/Database)

## Monitoring

After implementing these fixes, monitor your logs for:

- ✅ "Authentication SUCCESSFUL" messages
- ✅ Successful product fetching
- ❌ Any remaining 410 or 302 errors

## Support

If issues persist after following these steps:

1. Check the Shopify Partner Dashboard for app status
2. Verify webhook delivery in the Partner Dashboard
3. Review the app's installation status in the target store
4. Check environment variables are correctly set
