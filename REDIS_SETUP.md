# Redis Session Storage Setup

## Why Redis?

The `MemorySessionStorage` used in development is not suitable for production because:

- Sessions are lost on every server restart
- Sessions don't persist across multiple instances
- This causes authentication failures and 410 errors

## Setup Options

### Option 1: Render Redis (Recommended)

1. **Create Redis Database on Render:**
   - Go to your Render Dashboard
   - Click "New" → "Redis"
   - Choose a plan (Free tier works for testing)
   - Give it a name like `shopify-sessions-redis`
   - Select the same region as your app

2. **Get Redis URL:**
   - Copy the "Internal Database URL" from your Redis service
   - It will look like: `redis://user:pass@host:port/db`

3. **Add to Environment Variables:**
   - Go to your web service settings
   - Add environment variable: `REDIS_URL`
   - Value: The Redis URL from step 2

### Option 2: External Redis Service

You can use any Redis service:

- **Upstash Redis** (Free tier available)
- **Redis Cloud** (Free tier available)
- **AWS ElastiCache**
- **Google Cloud Memorystore**

### Option 3: Local Redis (Development)

For local development:

```bash
# Install Redis locally
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server

# Your REDIS_URL will be: redis://localhost:6379
```

## Environment Variables

Add these to your Render environment:

```bash
REDIS_URL=redis://user:pass@host:port/db
NODE_ENV=production
```

## Testing

After setup, check your logs for:

- ✅ "Using RedisSessionStorage for production"
- ✅ "Redis session storage initialized successfully"

## Fallback

If Redis fails to initialize, the app will automatically fall back to `MemorySessionStorage` with a warning in the logs.

## Troubleshooting

### Redis Connection Issues

- Check if Redis URL is correct
- Verify Redis service is running
- Check firewall/network settings

### Session Still Not Persisting

- Verify `NODE_ENV=production` is set
- Check logs for Redis initialization messages
- Ensure Redis URL is accessible from your app

## Benefits

With Redis session storage:

- ✅ Sessions persist across server restarts
- ✅ Sessions work across multiple app instances
- ✅ No more 410 authentication errors
- ✅ Proper OAuth flow completion
