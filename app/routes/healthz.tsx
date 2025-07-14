import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = () => {
  return new Response("ok", { status: 200 });
};
