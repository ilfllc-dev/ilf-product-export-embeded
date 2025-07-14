import { json } from "@remix-run/node";

export const loader = async () => {
  return json({
    message: "App is working!",
    timestamp: new Date().toISOString(),
    env: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
  });
};

export default function Test() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Test Page</h1>
      <p>If you can see this, your app is working!</p>
      <p>Now we need to fix the Shopify authentication.</p>
    </div>
  );
}
