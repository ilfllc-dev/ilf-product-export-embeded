import { json } from "@remix-run/node";
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
  TextField,
} from "@shopify/polaris";
import { useState } from "react";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const error = url.searchParams.get("error");

  return json({ shop, error });
};

export default function InstallPage() {
  const { shop: initialShop, error } = useLoaderData<typeof loader>();
  const [shop, setShop] = useState(initialShop || "");

  const handleInstall = () => {
    if (!shop) return;

    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.SHOPIFY_APP_URL;
    const scopes = "read_products,write_products";

    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${appUrl}/auth/callback&state=${shop}`;

    window.location.href = installUrl;
  };

  return (
    <Page title="Install Product Export App">
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
                Enter your Shopify store domain to install the Product Export
                app.
              </Text>

              <BlockStack gap="200">
                <TextField
                  label="Store Domain"
                  value={shop}
                  onChange={setShop}
                  placeholder="your-store.myshopify.com"
                  autoComplete="off"
                />
              </BlockStack>

              <InlineStack gap="200">
                <Button
                  variant="primary"
                  onClick={handleInstall}
                  disabled={!shop}
                >
                  Install App
                </Button>
              </InlineStack>

              <Box padding="400" background="bg-surface-selected">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Installation Instructions:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    1. Enter your store domain (e.g., mystore.myshopify.com)
                    <br />
                    2. Click "Install App"
                    <br />
                    3. You'll be redirected to your Shopify admin
                    <br />
                    4. Review the permissions and click "Install app"
                    <br />
                    5. The app will be installed and you can access it from your
                    admin
                  </Text>
                </BlockStack>
              </Box>

              <Text as="p" variant="bodyMd" tone="subdued">
                Note: This app requires access to read and write products. You
                can uninstall it at any time from your Shopify admin.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
