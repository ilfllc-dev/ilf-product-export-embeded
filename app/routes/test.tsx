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
} from "@shopify/polaris";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const idToken = url.searchParams.get("id_token");
  const hmac = url.searchParams.get("hmac");
  const host = url.searchParams.get("host");
  const session = url.searchParams.get("session");

  return json({
    shop,
    hasIdToken: !!idToken,
    hasHmac: !!hmac,
    host,
    session,
    apiKey: process.env.SHOPIFY_API_KEY,
    appUrl: process.env.SHOPIFY_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET",
  });
};

export default function TestPage() {
  const data = useLoaderData<typeof loader>();

  const installUrl = data.shop
    ? `https://${data.shop}/admin/oauth/authorize?client_id=${data.apiKey}&scope=read_products,write_products&redirect_uri=${data.appUrl}/auth/callback&state=${data.shop}`
    : null;

  return (
    <Page title="Authentication Test">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h1" variant="headingLg">
                Authentication Debug Info
              </Text>

              <Box padding="400" background="bg-surface-selected">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    URL Parameters:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Shop: {data.shop || "None"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Has ID Token: {data.hasIdToken ? "Yes" : "No"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Has HMAC: {data.hasHmac ? "Yes" : "No"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Host: {data.host || "None"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Session: {data.session || "None"}
                  </Text>
                </BlockStack>
              </Box>

              <Box padding="400" background="bg-surface-selected">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Environment Variables:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    API Key: {data.apiKey || "NOT SET"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    App URL: {data.appUrl || "NOT SET"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Node Env: {data.nodeEnv}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Redis URL: {data.redisUrl}
                  </Text>
                </BlockStack>
              </Box>

              {data.shop && installUrl && (
                <Box padding="400" background="bg-surface-selected">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Installation:
                    </Text>
                    <Text as="p" variant="bodyMd">
                      To install the app on {data.shop}, click the button below:
                    </Text>
                    <InlineStack gap="200">
                      <Button variant="primary" url={installUrl}>
                        Install App on {data.shop}
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
              )}

              <Box padding="400" background="bg-surface-selected">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next Steps:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    1. Make sure your Shopify Partner Dashboard app has the
                    correct API Key: {data.apiKey}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. Ensure the App URL in Partner Dashboard is: {data.appUrl}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. Add this redirect URL to Partner Dashboard: {data.appUrl}
                    /auth/callback
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. Install the app through Partner Dashboard → Apps → Your
                    App → Install
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
