import { redirect } from "@remix-run/node";

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
    // Create the OAuth authorization URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.SHOPIFY_APP_URL;
    const scopes = "read_products,write_products";

    if (!apiKey || !appUrl) {
      console.log("❌ Missing API key or app URL");
      return redirect("/?error=config_missing");
    }

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${appUrl}/auth/callback&state=${shop}`;

    console.log("🔄 Redirecting to Shopify OAuth:", authUrl);
    return redirect(authUrl);
  } catch (error: any) {
    console.log("❌ OAuth initiation failed:", error);
    return redirect(`/?error=oauth_init_failed&shop=${shop}`);
  }
};
