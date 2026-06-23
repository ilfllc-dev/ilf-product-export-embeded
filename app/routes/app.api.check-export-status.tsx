import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkProductsExistInStores } from "../services/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    await authenticate.admin(request);
    const { products, storeIds } = await request.json();

    if (!Array.isArray(products) || !Array.isArray(storeIds)) {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const results = await checkProductsExistInStores(products, storeIds);
    return json({ results });
  } catch (error: any) {
    console.error("Check export status error:", error);
    return json(
      { error: error.message || "Failed to check export status" },
      { status: 500 },
    );
  }
};
