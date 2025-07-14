import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Try to authenticate with Shopify
  try {
    await authenticate.admin(request);
    // If authentication succeeds, redirect to the app
    return redirect("/app");
  } catch (error) {
    // If authentication fails, redirect to Shopify's auth flow
    return redirect("/auth/shopify");
  }
};
