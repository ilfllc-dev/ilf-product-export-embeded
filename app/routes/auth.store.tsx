import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  // Generate a unique state for this OAuth request
  const state = `store_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store the state in the database for verification
  await db.session.create({
    data: {
      id: state,
      shop: shop,
      state: state,
      isOnline: false,
      accessToken: "", // Will be filled after OAuth
    },
  });

  // Redirect to Shopify OAuth
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_products,write_products&redirect_uri=${encodeURIComponent(process.env.SHOPIFY_APP_URL + "/auth/store/callback")}&state=${state}`;

  // Redirect to the top-level redirect route
  return redirect(`/auth/top-redirect?redirect=${encodeURIComponent(authUrl)}`);
};
