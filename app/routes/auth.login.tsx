import { redirect } from "@remix-run/node";

export const loader = async () => {
  // Redirect to the main app
  return redirect("/app");
};
