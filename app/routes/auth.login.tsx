import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: any) => {
  console.log("=== LOGIN ROUTE DEBUG ===");
  console.log("Request URL:", request.url);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    console.log("❌ No shop parameter provided");
    return redirect("/?error=no_shop");
  }

  console.log("🔄 Initiating OAuth flow for shop:", shop);

  try {
    // This will redirect to Shopify's OAuth authorization page
    return await authenticate.admin(request);
  } catch (error: any) {
    console.log("❌ OAuth initiation failed:", error);
    return redirect(`/?error=oauth_init_failed&shop=${shop}`);
  }
};
