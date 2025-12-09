# Product Export App

## Deployment

Deployed on Render.io using Docker. Each deployment uses a separate branch and Shopify app.

### Multiple Deployments

To deploy for a different organization:
1. Create a new branch (e.g., `org2`)
2. Update `shopify.app.toml` and `shopify.app.production.toml` with new app credentials
3. Create a new Render service pointing to the new branch
4. Use the same Redis instance with a different database number (e.g., `/0` → `/1`)

### Required Environment Variables

- `SHOPIFY_API_KEY` - Shopify app API key
- `SHOPIFY_API_SECRET` - Shopify app secret
- `SHOPIFY_APP_URL` - Full Render service URL (e.g., `https://app-name.onrender.com`)
- `REDIS_URL` - Redis connection string with database number (e.g., `redis://host:port/0`)
- `SESSION_SECRET` - Random string for session encryption (generate unique per deployment)
- `NODE_ENV` - Set to `production`

### Redis Setup

When using the same Redis instance for multiple deployments, append different database numbers to the URL:
- First app: `redis://host:port/0` (or no number, defaults to 0)
- Second app: `redis://host:port/1`
- And so on...

This keeps sessions isolated between deployments.

### Development

```bash
npm install
npm run dev
```

---


