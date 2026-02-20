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
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const appUrl = process.env.SHOPIFY_APP_URL || "";

  return json({ shop, error, apiKey, appUrl });
};

export default function InstallPage() {
  const { shop: initialShop, error, apiKey, appUrl } =
    useLoaderData<typeof loader>();
  const [shop, setShop] = useState(initialShop || "");
  const isConfigMissing = !apiKey || !appUrl;

  const handleInstall = () => {
    if (!shop || isConfigMissing) return;
    window.location.href = `/auth/login?shop=${encodeURIComponent(shop)}`;
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
              {isConfigMissing && (
                <Box padding="400" background="bg-surface-selected">
                  <Text as="p" variant="bodyMd" tone="critical">
                    App configuration is missing. Set SHOPIFY_API_KEY and
                    SHOPIFY_APP_URL in your environment.
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
                  disabled={!shop || isConfigMissing}
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
