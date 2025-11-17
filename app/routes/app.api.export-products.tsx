import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { exportProductToStore } from "../services/shopify.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const { products, toStore, status } = await request.json();

    if (!Array.isArray(products) || products.length === 0) {
      return json(
        { error: "No products provided" },
        { status: 400, headers: corsHeaders },
      );
    }

    const results = [];
    const errors = [];

    // Export each product sequentially
    for (const product of products) {
      try {
        const result = await exportProductToStore(
          product,
          toStore,
          admin,
          status,
        );
        results.push({
          productId: product.id,
          productTitle: product.title,
          success: true,
          result,
        });
      } catch (error: any) {
        errors.push({
          productId: product.id,
          productTitle: product.title,
          error: error.message || "Unknown error",
        });
      }
    }

    return json(
      {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: products.length,
          successful: results.length,
          failed: errors.length,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    return json(
      { error: error.message || "Failed to export products" },
      { status: 500, headers: corsHeaders },
    );
  }
};
