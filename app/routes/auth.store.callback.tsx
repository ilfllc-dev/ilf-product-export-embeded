import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { useEffect } from "react";
import { useSearchParams } from "@remix-run/react";

declare global {
  interface Window {
    __SHOPIFY_API_KEY__?: string;
  }
}

const db = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");

  if (!code || !state || !shop) {
    throw new Response("Missing required OAuth parameters", { status: 400 });
  }

  try {
    // Verify the state
    const session = await db.session.findUnique({
      where: { id: state },
    });

    if (!session) {
      throw new Response("Invalid state parameter", { status: 400 });
    }

    // Get the access token using Shopify's OAuth
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code: code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Response("Failed to get access token", { status: 400 });
    }

    // Get shop details
    const shopResponse = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": tokenData.access_token,
        },
      },
    );

    const shopData = await shopResponse.json();

    // Save the store to our database
    await db.store.upsert({
      where: { shop: shop },
      update: {
        name: shopData.shop.name,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        expires: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      },
      create: {
        shop: shop,
        name: shopData.shop.name,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        expires: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
    });

    // Clean up the temporary session
    await db.session.delete({
      where: { id: state },
    });

    // Instead of redirect, return shop and app slug for client-side redirect
    const shopHandle = shop.replace(".myshopify.com", "");
    const appSlug = "product-export-1"; // Update if your app slug is different
    return json({ shop, shopHandle, appSlug });
  } catch (error) {
    console.error("Store authentication error:", error);
    throw new Response("Authentication failed", { status: 500 });
  }
};

export default function StoreCallback() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop");
  const shopHandle = shop?.replace(".myshopify.com", "");
  const appSlug = "product-export-1"; // Update if your app slug is different

  useEffect(() => {
    if (shopHandle) {
      // @ts-ignore
      const createApp = require("@shopify/app-bridge").default;
      // @ts-ignore
      const Redirect = require("@shopify/app-bridge/actions").Redirect;
      // @ts-ignore
      const apiKey =
        window.__SHOPIFY_API_KEY__ || process.env.SHOPIFY_API_KEY || "";
      const host = new URLSearchParams(window.location.search).get("host");
      const app = createApp({
        apiKey,
        shopOrigin: shop,
        host,
        forceRedirect: true,
      });
      const redirect = Redirect.create(app);
      redirect.dispatch(
        Redirect.Action.ADMIN_PATH,
        `/apps/${appSlug}/app/login`,
      );
      // Fallback plain JS redirect
      setTimeout(() => {
        window.location.href = `https://admin.shopify.com/store/${shopHandle}/apps/${appSlug}/app/login`;
      }, 2000);
    }
  }, [shopHandle, appSlug, shop]);

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h2>Redirecting you back to the Shopify admin...</h2>
      {shopHandle && (
        <a
          href={`https://admin.shopify.com/store/${shopHandle}/apps/${appSlug}/app/login`}
        >
          Click here if you are not redirected automatically
        </a>
      )}
    </div>
  );
}
