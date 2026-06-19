import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  DataTable,
  Divider,
  EmptyState,
  Icon,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
  Box,
} from "@shopify/polaris";
import { ExternalIcon, StoreIcon, PlusIcon, XIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

type MiddlewareStore = {
  store_name: string;
  shop_domain: string;
  is_active: boolean;
  scopes: string;
  connected_at: string | null;
  has_token: boolean;
};

type ActionResult =
  | { ok: true; store_name: string; oauth_url: string }
  | { ok: false; error: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const middlewareUrl = process.env.SHOPIFY_STORE_ONBOARD_URL || "";
  const apiKey = process.env.SHOPIFY_STORE_ONBOARD_API_KEY || "";

  let stores: MiddlewareStore[] = [];
  let middlewareError = false;

  try {
    const res = await fetch(`${middlewareUrl}/stores`, {
      headers: { "X-API-Key": apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      stores = data.stores || [];
    } else {
      middlewareError = true;
    }
  } catch {
    middlewareError = true;
  }

  return json({ stores, middlewareUrl, middlewareError });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const form = await request.formData();
  const store_name = (form.get("store_name") as string || "").trim();
  const shop_domain = (form.get("shop_domain") as string || "").trim();
  const client_id = (form.get("client_id") as string || "").trim();
  const client_secret = (form.get("client_secret") as string || "").trim();
  const scopes = (form.get("scopes") as string || "").trim();

  if (!store_name || !shop_domain || !client_id || !client_secret) {
    return json<ActionResult>({ ok: false, error: "All fields are required." });
  }

  const middlewareUrl = process.env.SHOPIFY_STORE_ONBOARD_URL || "";
  const apiKey = process.env.SHOPIFY_STORE_ONBOARD_API_KEY || "";

  const paramObj: Record<string, string> = { store_name, shop_domain, client_id, client_secret };
  if (scopes) paramObj.scopes = scopes;
  const params = new URLSearchParams(paramObj);

  try {
    const res = await fetch(`${middlewareUrl}/stores?${params}`, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return json<ActionResult>({ ok: false, error: body?.detail || `Middleware error: ${res.status}` });
    }

    const oauth_url = `${middlewareUrl}/auth/shopify/start?store_name=${encodeURIComponent(store_name)}`;
    return json<ActionResult>({ ok: true, store_name, oauth_url });
  } catch (err: any) {
    return json<ActionResult>({ ok: false, error: err.message || "Failed to reach middleware." });
  }
};

export default function Dashboard() {
  const { stores, middlewareUrl, middlewareError } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionResult>();

  const DEFAULT_SCOPES = "write_files,write_inventory,write_metaobject_definitions,write_metaobjects,read_product_listings,write_products,write_metafields";

  const [showForm, setShowForm] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scopes, setScopes] = useState(DEFAULT_SCOPES);

  const isSubmitting = fetcher.state === "submitting";
  const fetcherData = fetcher.data;
  const showOAuthUrl = showForm && fetcherData?.ok === true;
  const addError = showForm && fetcherData?.ok === false ? fetcherData.error : null;

  const activeStores = stores.filter((s) => s.is_active && s.has_token);
  const pendingStores = stores.filter((s) => !s.has_token);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const handleOpenForm = useCallback(() => {
    setStoreName("");
    setShopDomain("");
    setClientId("");
    setClientSecret("");
    setScopes(DEFAULT_SCOPES);
    setShowForm(true);
  }, [DEFAULT_SCOPES]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.set("store_name", storeName);
    formData.set("shop_domain", shopDomain);
    formData.set("client_id", clientId);
    formData.set("client_secret", clientSecret);
    formData.set("scopes", scopes);
    fetcher.submit(formData, { method: "post" });
  }, [storeName, shopDomain, clientId, clientSecret, scopes, fetcher]);

  const tableRows = activeStores.map((store) => [
    <InlineStack gap="200" blockAlign="center" key={store.store_name}>
      <Icon source={StoreIcon} tone="base" />
      <Text as="span" variant="bodyMd" fontWeight="semibold">{store.store_name}</Text>
    </InlineStack>,
    <Text as="span" variant="bodyMd" tone="subdued" key={`d-${store.store_name}`}>{store.shop_domain}</Text>,
    <Badge tone="success" key={`b-${store.store_name}`}>Connected</Badge>,
    <Text as="span" variant="bodyMd" tone="subdued" key={`dt-${store.store_name}`}>{formatDate(store.connected_at)}</Text>,
  ]);

  return (
    <Page title="Store Connection Dashboard" subtitle="Connected target stores managed via ILF OAuth Middleware">
      <Layout>
        <Layout.Section>
          <InlineStack align="end" gap="300">
            <Button url="/app">Export Products</Button>
            <Button icon={ExternalIcon} onClick={() => window.open(`${middlewareUrl}/docs`, "_blank")}>Middleware Docs</Button>
            <Button variant="primary" icon={PlusIcon} onClick={handleOpenForm}>Add Store</Button>
          </InlineStack>
        </Layout.Section>
        {middlewareError && (
          <Layout.Section>
            <Banner title="Cannot reach OAuth Middleware" tone="warning">
              <p>Make sure <code>SHOPIFY_STORE_ONBOARD_URL</code> and <code>SHOPIFY_STORE_ONBOARD_API_KEY</code> are set correctly.</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Add Store inline form */}
        {showForm && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Add New Store</Text>
                  <Button icon={XIcon} variant="plain" accessibilityLabel="Close" onClick={handleCloseForm} />
                </InlineStack>
                <Divider />

                {showOAuthUrl && fetcherData?.ok ? (
                  <BlockStack gap="400">
                    <Banner tone="success">
                      <p><strong>{fetcherData.store_name}</strong> has been registered. Share the link below with the store owner to complete OAuth.</p>
                    </Banner>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">OAuth Approval Link</Text>
                      <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                        <Text as="p" variant="bodySm" breakWord>{fetcherData.oauth_url}</Text>
                      </Box>
                      <Text as="p" variant="bodySm" tone="subdued">
                        The store owner opens this link, logs into their Shopify admin, and approves access. Once approved the store appears as Connected.
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300">
                      <Button variant="primary" icon={ExternalIcon} onClick={() => window.open(fetcherData.oauth_url, "_blank")}>Open OAuth Link</Button>
                      <Button onClick={handleCloseForm}>Done</Button>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Enter the store details. We'll register it with the OAuth middleware and generate a link for the store owner to approve access.
                    </Text>
                    {addError && <Banner tone="critical"><p>{addError}</p></Banner>}
                    <TextField
                      label="Store Name"
                      placeholder="e.g. fleshlight-ca"
                      helpText="A short unique identifier (no spaces). Used internally."
                      value={storeName}
                      onChange={setStoreName}
                      autoComplete="off"
                    />
                    <TextField
                      label="Shop Domain"
                      placeholder="e.g. my-store.myshopify.com"
                      helpText="The store's full myshopify.com domain."
                      value={shopDomain}
                      onChange={setShopDomain}
                      autoComplete="off"
                    />
                    <TextField
                      label="Client ID"
                      placeholder="Shopify app client ID"
                      helpText="The client ID of the Shopify app to install on this target store (use the connector app, not the product-export-app)."
                      value={clientId}
                      onChange={setClientId}
                      autoComplete="off"
                    />
                    <TextField
                      label="Client Secret"
                      placeholder="Shopify app client secret"
                      helpText="The client secret of the same Shopify app."
                      value={clientSecret}
                      onChange={setClientSecret}
                      autoComplete="off"
                      type="password"
                    />
                    <TextField
                      label="Scopes"
                      helpText="Comma-separated Shopify API scopes. The default includes everything needed for a full product export (images, metafields, inventory, channels)."
                      value={scopes}
                      onChange={setScopes}
                      autoComplete="off"
                      multiline={2}
                    />
                    <InlineStack gap="300">
                      <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
                        Register & Get OAuth Link
                      </Button>
                      <Button onClick={handleCloseForm}>Cancel</Button>
                    </InlineStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Stats */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Connected Stores</Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">{activeStores.length}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Pending OAuth</Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">{pendingStores.length}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Total Stores</Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">{stores.length}</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Connected stores table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Connected Stores</Text>
                <Text as="p" variant="bodySm" tone="subdued">{activeStores.length} store{activeStores.length !== 1 ? "s" : ""} ready</Text>
              </InlineStack>
              {activeStores.length === 0 ? (
                <EmptyState
                  heading="No stores connected yet"
                  action={{ content: "Add Store", onAction: handleOpenForm }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Add a store to get started. You'll receive an OAuth link to share with the store owner.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Store", "Domain", "Status", "Connected"]}
                  rows={tableRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Pending OAuth */}
        {pendingStores.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Pending OAuth</Text>
                <Text as="p" variant="bodySm" tone="subdued">These stores are registered but haven't completed OAuth yet.</Text>
                <Divider />
                {pendingStores.map((store) => (
                  <InlineStack key={store.store_name} align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">{store.store_name}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">{store.shop_domain}</Text>
                    </BlockStack>
                    <Button variant="plain" icon={ExternalIcon} onClick={() => window.open(`${middlewareUrl}/auth/shopify/start?store_name=${store.store_name}`, "_blank")}>
                      Resend OAuth Link
                    </Button>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
