import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("=== TEST ROUTE DEBUG ===");
  console.log("Request URL:", request.url);
  console.log(
    "Request headers:",
    Object.fromEntries(request.headers.entries()),
  );

  // Environment variables
  const envDebug = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET
      ? "SET (hidden)"
      : "NOT SET",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  console.log("Environment variables:", envDebug);

  // Test authentication
  let authResult = null;
  let authError = null;

  try {
    console.log("Testing authentication...");
    authResult = await authenticate.admin(request);
    console.log("✅ Authentication successful");
    console.log("Session shop:", authResult.session?.shop);
    console.log("Session state:", authResult.session?.state);
  } catch (error: any) {
    console.log("❌ Authentication failed");
    console.log("Error type:", error.constructor.name);
    console.log("Error message:", error.message);
    console.log("Error status:", error.status);
    console.log("Error stack:", error.stack);
    authError = {
      type: error.constructor.name,
      message: error.message,
      status: error.status,
      stack: error.stack,
    };
  }

  // Test session storage
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    if (shop) {
      // Try to get session info
      console.log("Testing session for shop:", shop);
      // Note: This is a simplified test - in real usage you'd use the session storage
    }
  } catch (error: any) {
    console.log("Session test error:", error.message);
  }

  console.log("=== END TEST ROUTE DEBUG ===");

  return json({
    timestamp: new Date().toISOString(),
    environment: envDebug,
    authentication: authResult
      ? {
          success: true,
          session: {
            shop: authResult.session?.shop,
            state: authResult.session?.state,
            isOnline: authResult.session?.isOnline,
          },
        }
      : {
          success: false,
          error: authError,
        },
    request: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    },
  });
};

export default function Test() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Test Page</h1>
      <p>If you can see this, your app is working!</p>
      <p>Now we need to fix the Shopify authentication.</p>
    </div>
  );
}
