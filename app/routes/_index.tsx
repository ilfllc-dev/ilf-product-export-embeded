import { redirect } from "@remix-run/node";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // If we have shop parameter, this might be an installation request
  if (shop) {
    return redirect(`/app?${url.searchParams.toString()}`);
  }

  // If no shop parameter, redirect to the install page
  return redirect("/app/install");
};
