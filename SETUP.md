# Product Export App Setup

This app is an **embedded Shopify app** that exports products from the current store to other stores managed by the `shopify-store-onboard` app.

## How It Works

1. **Current Store Products**: Uses Shopify Admin API (automatically available when embedded)
2. **Target Stores**: Gets list of target stores from shopify-store-onboard API
3. **Export Process**: Exports selected products TO the target stores

## Environment Variables

Create a `.env` file with the following variables:

```env
# Shopify App Configuration (for the app itself)
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_APP_URL=http://localhost:3000

# Store Onboard App Configuration
# URL to your shopify-store-onboard app
SHOPIFY_STORE_ONBOARD_URL=http://localhost:5174
# API key to access the store-onboard API
STORE_ONBOARD_API_KEY=your-api-secret-key-here

# Session Secret (for cookie encryption)
SESSION_SECRET=your_session_secret_here
```

## Key Points

- **Embedded App**: Runs inside Shopify admin, automatically has access to current store
- **No OAuth for Current Store**: Shopify handles authentication automatically
- **Target Stores Only**: Only needs OAuth for stores you want to export TO
- **Shopify Admin API**: Automatically available for current store's products

## Changes Made

1. **Simplified Authentication**: Removed complex session management, kept Shopify app authentication
2. **Removed Database**: No longer has its own Prisma database
3. **Removed Auth Routes**: Deleted all store authentication routes (handled by shopify-store-onboard)
4. **API Integration**: Reads target store list from shopify-store-onboard via API
5. **Shopify Admin API**: Uses Shopify Admin API to fetch current store's products

## Data Flow

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Current Store │    │   product-export     │    │ shopify-store-  │
│   (Shopify)     │◄──►│   (Shopify App)      │◄──►│   onboard       │
│                 │    │                      │    │   (API)         │
│ - Products      │    │ - Fetches products   │    │ - Target stores │
│ - Inventory     │    │ - Shows UI           │    │ - Access tokens │
│ - Variants      │    │ - Handles export     │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

## Next Steps

1. **✅ Current Store Products**: Implemented via Shopify Admin API
2. **✅ Target Store List**: Implemented via shopify-store-onboard API
3. **Export Functionality**: Implement the actual product export to target stores

## Current State

- ✅ Shopify app authentication working
- ✅ Current store products fetched via Shopify Admin API
- ✅ Target stores fetched via shopify-store-onboard API
- ✅ Simplified app structure
- ❌ Export functionality not implemented
