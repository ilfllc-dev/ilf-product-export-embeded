import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { exportProductToStore } from "../services/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Authenticate the request
  await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { product, toStore, status } = await request.json();
    const { admin } = await authenticate.admin(request);
    const result = await exportProductToStore(product, toStore, admin, status);
    return json(result);
  } catch (error: any) {
    console.error("Export error:", error);
    return json(
      { error: error.message || "Failed to export product" },
      { status: 500 },
    );
  }
};
