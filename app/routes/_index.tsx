import { redirect } from "@remix-run/node";

export const loader = async ({ request }: any) => {
  console.log("=== ROOT ROUTE DEBUG ===");
  console.log("Request URL:", request.url);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const idToken = url.searchParams.get("id_token");
  const hmac = url.searchParams.get("hmac");
  const host = url.searchParams.get("host");

  console.log("URL parameters:", {
    shop,
    hasIdToken: !!idToken,
    hasHmac: !!hmac,
    host,
  });

  // If we have shop parameter, this might be an installation request
  if (shop) {
    console.log("🔄 Shop parameter detected, redirecting to app");
    return redirect(`/app?${url.searchParams.toString()}`);
  }

  // If no shop parameter, redirect to a default page or show installation instructions
  console.log("❌ No shop parameter, showing installation instructions");
  return redirect("/auth/login");
};
