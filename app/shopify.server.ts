import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

console.log("=== SHOPIFY SERVER CONFIG DEBUG ===");
console.log("API Key:", process.env.SHOPIFY_API_KEY);
console.log(
  "API Secret:",
  process.env.SHOPIFY_API_SECRET ? "SET (hidden)" : "NOT SET",
);
console.log("App URL:", process.env.SHOPIFY_APP_URL);
console.log("Scopes:", ["read_products", "write_products"]);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("REDIS_URL:", process.env.REDIS_URL || "NOT SET");
console.log("=== END SHOPIFY SERVER CONFIG DEBUG ===");

// Choose session storage based on environment
let sessionStorage;

console.log("=== SESSION STORAGE SETUP ===");
console.log("NODE_ENV value:", process.env.NODE_ENV);
console.log("Is production?", process.env.NODE_ENV === "production");

if (process.env.NODE_ENV === "production") {
  // Use Redis for production - persistent across restarts and instances
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  console.log("🔍 Attempting to use Redis for production");
  console.log("🔍 Redis URL:", redisUrl);

  if (process.env.REDIS_URL) {
    try {
      console.log("🔄 Creating RedisSessionStorage...");
      sessionStorage = new RedisSessionStorage(redisUrl);
      console.log("✅ Redis session storage initialized successfully");
    } catch (error) {
      console.log(
        "❌ Failed to initialize Redis, falling back to MemorySessionStorage",
      );
      console.log("Error:", error);
      sessionStorage = new MemorySessionStorage();
      console.log("⚠️ Using MemorySessionStorage as fallback");
    }
  } else {
    console.log("❌ REDIS_URL not set, using MemorySessionStorage");
    sessionStorage = new MemorySessionStorage();
    console.log("⚠️ Using MemorySessionStorage (REDIS_URL missing)");
  }
} else {
  console.log("🔄 Using MemorySessionStorage for development");
  sessionStorage = new MemorySessionStorage();
}

console.log("=== SESSION STORAGE SETUP COMPLETE ===");

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
