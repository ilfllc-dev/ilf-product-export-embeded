import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: any) => {
  await authenticate.admin(request);
  return redirect("/app");
};
