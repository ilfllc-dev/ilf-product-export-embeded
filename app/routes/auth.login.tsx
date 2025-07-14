import { redirect } from "@remix-run/node";

export const loader = async () => {
  // Redirect to the main app or handle authentication
  return redirect("/app");
};
