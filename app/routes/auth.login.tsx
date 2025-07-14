import { redirect, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
} from "@shopify/polaris";

export const loader = async ({ request }: any) => {
  console.log("=== LOGIN ROUTE DEBUG ===");
  console.log("Request URL:", request.url);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const error = url.searchParams.get("error");

  console.log("Login parameters:", { shop, error });

  // If we have a shop parameter, try to initiate OAuth
  if (shop) {
    console.log("🔄 Initiating OAuth flow for shop:", shop);

    try {
      // Create the OAuth authorization URL
      const apiKey = process.env.SHOPIFY_API_KEY;
      const appUrl = process.env.SHOPIFY_APP_URL;
      const scopes = "read_products,write_products";

      if (!apiKey || !appUrl) {
        console.log("❌ Missing API key or app URL");
        return json({ error: "Configuration missing", shop });
      }

      // For embedded apps, use the embedded OAuth flow
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${appUrl}/auth/callback&state=${shop}`;

      console.log("🔄 Redirecting to Shopify OAuth:", authUrl);
      return redirect(authUrl);
    } catch (error: any) {
      console.log("❌ OAuth initiation failed:", error);
      return json({ error: "OAuth initiation failed", shop });
    }
  }

  // If no shop parameter, show installation instructions
  return json({ error, shop: null });
};

export default function LoginPage() {
  const { error, shop } = useLoaderData<typeof loader>();

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h1" variant="headingLg">
                Install Product Export App
              </Text>

              {error && (
                <Box padding="400" background="bg-surface-selected">
                  <Text as="p" variant="bodyMd" tone="critical">
                    Error: {error}
                  </Text>
                </Box>
              )}

              <Text as="p" variant="bodyMd">
                To use this app, you need to install it through the Shopify
                Partner Dashboard first.
              </Text>

              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Installation Steps:
                </Text>
                <Text as="p" variant="bodyMd">
                  1. Go to your Shopify Partner Dashboard
                  <br />
                  2. Navigate to Apps → Your App
                  <br />
                  3. Click "Install app" or "Test on development store"
                  <br />
                  4. Select the store you want to install the app on
                  <br />
                  5. Follow the OAuth flow to grant permissions
                </Text>
              </BlockStack>

              <Text as="p" variant="bodyMd">
                Once installed, you can access the app directly from your
                Shopify admin.
              </Text>

              {shop && (
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    url={`https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_products,write_products&redirect_uri=${process.env.SHOPIFY_APP_URL}/auth/callback&state=${shop}`}
                  >
                    Install App on {shop}
                  </Button>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
