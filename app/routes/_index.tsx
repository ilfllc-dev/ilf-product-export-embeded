import { redirect } from "@remix-run/node";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (shop) {
    return redirect(`/app?${url.searchParams.toString()}`);
  }

  return redirect("/app");
};
