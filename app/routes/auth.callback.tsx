import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const idToken = url.searchParams.get("id_token");

  // Handle embedded app authentication (id_token)
  if (idToken && shop) {
    try {
      await authenticate.admin(request);
      // Redirect to the app with the session
      return redirect("/app");
    } catch (error: any) {
      return redirect(`/auth/login?shop=${shop}&error=embedded_auth_failed`);
    }
  }

  // Handle traditional OAuth flow (code)
  if (!code || !shop) {
    return redirect("/?error=missing_oauth_params");
  }

  try {
    await authenticate.admin(request);
    // Redirect to the app with the session
    return redirect("/app");
  } catch (error: any) {
    // Redirect to login with error
    return redirect(`/auth/login?shop=${shop}&error=oauth_failed`);
  }
};
