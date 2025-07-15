import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

// Choose session storage based on environment
let sessionStorage;

if (process.env.NODE_ENV === "production") {
  // Use Redis for production - persistent across restarts and instances
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  if (process.env.REDIS_URL) {
    try {
      sessionStorage = new RedisSessionStorage(redisUrl);
    } catch (error) {
      console.log(
        "Failed to initialize Redis, falling back to MemorySessionStorage",
      );
      sessionStorage = new MemorySessionStorage();
    }
  } else {
    console.log("REDIS_URL not set, using MemorySessionStorage");
    sessionStorage = new MemorySessionStorage();
  }
} else {
  sessionStorage = new MemorySessionStorage();
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: ["read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  distribution: AppDistribution.AppStore,
  sessionStorage,
  cookieOptions: {
    sameSite: "none", // Required for embedded apps
    secure: true, // Required for embedded apps
    httpOnly: true,
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true, // Enable OAuth token exchange
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
