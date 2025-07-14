import { redirect } from "@remix-run/node";

export const loader = async () => {
  // Redirect to the main app and let Shopify handle authentication
  return redirect("/app");
};
