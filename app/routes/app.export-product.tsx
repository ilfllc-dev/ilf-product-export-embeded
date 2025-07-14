import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { exportProductToStore } from "../services/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { product, toStore } = await request.json();
    const result = await exportProductToStore(product, toStore);
    return json(result);
  } catch (error: any) {
    console.error("Export error:", error);
    return json(
      { error: error.message || "Failed to export product" },
      { status: 500 },
    );
  }
};
