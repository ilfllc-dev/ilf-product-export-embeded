import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

console.log("=== SHOPIFY SERVER CONFIG DEBUG ===");
console.log("API Key:", process.env.SHOPIFY_API_KEY);
console.log(
  "API Secret:",
  process.env.SHOPIFY_API_SECRET ? "SET (hidden)" : "NOT SET",
);
console.log("App URL:", process.env.SHOPIFY_APP_URL);
console.log("Scopes:", ["read_products", "write_products"]);
console.log("=== END SHOPIFY SERVER CONFIG DEBUG ===");

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: ["read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  distribution: AppDistribution.AppStore,
  sessionStorage: new MemorySessionStorage(),
  cookieOptions: {
    sameSite: "lax",
    secure: true,
  },
  future: {
    unstable_newEmbeddedAuthStrategy: false,
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
