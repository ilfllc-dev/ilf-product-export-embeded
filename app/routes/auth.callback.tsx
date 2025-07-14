import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: any) => {
  console.log("=== AUTH CALLBACK DEBUG ===");
  console.log("Request URL:", request.url);
  console.log(
    "Request headers:",
    Object.fromEntries(request.headers.entries()),
  );

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const state = url.searchParams.get("state");

  console.log("OAuth parameters:", { code: !!code, shop, state });

  if (!code || !shop) {
    console.log("❌ Missing code or shop parameter");
    return redirect("/?error=missing_oauth_params");
  }

  try {
    console.log("Processing OAuth callback...");
    const authResult = await authenticate.admin(request);
    console.log("✅ OAuth callback successful");
    console.log("Session shop:", authResult.session?.shop);
    console.log("Session state:", authResult.session?.state);

    // Redirect to the app with the session
    return redirect("/app");
  } catch (error: any) {
    console.log("❌ OAuth callback failed");
    console.log("Error:", error);
    console.log("Error message:", error.message);
    console.log("Error status:", error.status);

    // Redirect to login with error
    return redirect(`/auth/login?shop=${shop}&error=oauth_failed`);
  }
};
