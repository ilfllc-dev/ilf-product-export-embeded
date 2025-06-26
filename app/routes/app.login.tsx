import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useActionData,
  useSearchParams,
} from "@remix-run/react";
import {
  Card,
  Page,
  Text,
  Button,
  TextField,
  BlockStack,
  Banner,
  Icon,
} from "@shopify/polaris";
import { useState } from "react";
import { PrismaClient } from "@prisma/client";
import { DeleteIcon } from "@shopify/polaris-icons";

const db = new PrismaClient();

export const loader = async () => {
  // Fetch all stores from the database
  const stores = await db.store.findMany({ orderBy: { createdAt: "desc" } });
  return json({ stores });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const shop = formData.get("shop");
  const deleteId = formData.get("deleteId");

  if (deleteId) {
    // Delete store by id (id is a string)
    await db.store.delete({ where: { id: deleteId as string } });
    return redirect("/app/login");
  }

  if (typeof shop !== "string" || !shop.trim()) {
    return json({ error: "Please enter a valid shop domain." });
  }
  // Redirect to OAuth flow
  return redirect(`/auth/store?shop=${encodeURIComponent(shop.trim())}`);
};

export default function AppLogin() {
  const { stores } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const [searchParams] = useSearchParams();
  const authError = searchParams.get("error");

  return (
    <Page title="Manage Stores">
      <BlockStack gap="400">
        {authError && (
          <Banner tone="critical" title="Authentication Error">
            {authError === "oauth" ? (
              <p>
                We couldn't connect to your store. If your store is unpublished
                or password-protected, please
                <a
                  href={`https://${shop || "your-store.myshopify.com"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {" "}
                  log in to your store
                </a>{" "}
                and enter the password, then try again. If the problem persists,
                ensure your app URLs are correct and you are logged in as the
                store owner or staff.
              </p>
            ) : (
              <p>
                There was a problem authenticating your request. Please try
                again. If the issue persists, check your app configuration and
                ensure cookies are enabled in your browser.
                {authError !== "oauth" && authError !== "" && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: "#666" }}>
                      Error: {authError}
                    </span>
                  </>
                )}
              </p>
            )}
          </Banner>
        )}
        <Card>
          <Text as="h2" variant="headingMd">
            Connected Stores
          </Text>
          {stores.length === 0 ? (
            <Text as="span">No stores connected yet.</Text>
          ) : (
            <ul style={{ padding: 0, listStyle: "none" }}>
              {stores.map((store: any) => (
                <li
                  key={store.id}
                  style={{
                    margin: "12px 0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span style={{ marginRight: 8, verticalAlign: "middle" }}>
                    <img
                      src="/shopifybag.svg"
                      alt="Shopify"
                      style={{
                        width: 20,
                        height: 20,
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                  </span>
                  <Text variant="bodyMd" as="span" fontWeight="semibold">
                    {store.name || store.shop}
                  </Text>
                  <span style={{ marginLeft: 8 }}>
                    <Text variant="bodySm" as="span" tone="subdued">
                      ({store.shop})
                    </Text>
                  </span>
                  <Form method="post" style={{ marginLeft: "auto" }}>
                    <input
                      type="hidden"
                      name="deleteId"
                      value={String(store.id)}
                    />
                    <Button
                      icon={<Icon source={DeleteIcon} tone="base" />}
                      accessibilityLabel="Delete store"
                      variant="plain"
                      submit
                    />
                  </Form>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <Text as="h2" variant="headingMd">
            Add a New Store
          </Text>
          <Form method="post">
            <BlockStack gap="200">
              <TextField
                label="Shop domain"
                name="shop"
                value={shop}
                onChange={setShop}
                placeholder="e.g. my-store.myshopify.com"
                autoComplete="off"
              />
              <Text as="span" tone="subdued">
                Note: If your store is unpublished or password-protected,{" "}
                <a
                  href={`https://${shop || "your-store.myshopify.com"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  open your store in a new tab
                </a>
                , log in with your password, then return here and add the store.
              </Text>
              {actionData?.error && (
                <Text as="span" tone="critical">
                  {actionData.error}
                </Text>
              )}
              <Button submit variant="primary">
                Add new store
              </Button>
            </BlockStack>
          </Form>
        </Card>
      </BlockStack>
    </Page>
  );
}
