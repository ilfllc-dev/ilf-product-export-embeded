import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchTargetStores } from "../services/shopify.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Authenticate the request
  await authenticate.admin(request);

  try {
    const stores = await fetchTargetStores();
    console.log("API stores endpoint - fetched stores:", stores);
    return json({ stores }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return json({ stores: [] }, { status: 500, headers: corsHeaders });
  }
};
