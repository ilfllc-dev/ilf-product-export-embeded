import { useState, useCallback } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import type { LoaderData } from "../types/app._index";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  TextField,
  InlineStack,
  BlockStack,
  EmptyState,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getCurrentStoreName,
  fetchTargetStores,
  fetchShopifyProducts,
} from "../services/shopify.server";
import { ProductResourceList } from "../components/ProductResourceList";
import { ProductExportModal } from "../components/ProductExportModal";
import { TargetStoresList } from "../components/TargetStoresList";
import { AppUninstalledBanner } from "../components/AppUninstalledBanner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Debug environment variables
  console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
  console.log("SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY);
  console.log(
    "SHOPIFY_API_SECRET:",
    process.env.SHOPIFY_API_SECRET ? "SET (hidden)" : "NOT SET",
  );
  console.log("SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("=== END ENVIRONMENT VARIABLES DEBUG ===");

  // Authenticate with Shopify to get current store's data
  let admin = null;
  let currentStoreName = "Unknown Store";
  let authError = null;
  let shopDomain = null;

  console.log("=== AUTHENTICATION DEBUG ===");
  console.log("Request URL:", request.url);
  console.log(
    "Request headers:",
    Object.fromEntries(request.headers.entries()),
  );

  // Extract shop domain from URL parameters
  const requestUrl = new URL(request.url);
  shopDomain = requestUrl.searchParams.get("shop");

  // Check if this is an OAuth callback (has code parameter)
  const isOAuthCallback = requestUrl.searchParams.has("code");

  if (isOAuthCallback) {
    console.log("🔄 OAuth callback detected, redirecting to auth callback");
    return redirect(`/auth/callback?${requestUrl.searchParams.toString()}`);
  }

  try {
    console.log("Attempting to authenticate with Shopify...");
    const authResult = await authenticate.admin(request);
    admin = authResult.admin;
    console.log("✅ Authentication SUCCESSFUL");
    console.log("Admin object:", admin);
    currentStoreName = await getCurrentStoreName(admin);
    console.log("Store name:", currentStoreName);
  } catch (error: any) {
    console.log("❌ Authentication FAILED");
    console.log("Error details:", error);
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack);

    // Check if it's a 410 (Gone) error - app uninstalled
    if (error.status === 410 || error.message?.includes("410")) {
      authError =
        "App has been uninstalled from this store. Please reinstall the app to continue.";
    } else if (error.status === 302 || error.message?.includes("302")) {
      authError = "Authentication required. Please log in to continue.";
    } else {
      authError = "Authentication failed. Please try again or contact support.";
    }

    // Continue without admin access - this prevents redirect loops
  }

  const url = requestUrl;
  const search = url.searchParams.get("search") || "";
  const cursor = url.searchParams.get("cursor") || "";
  const limit = parseInt(url.searchParams.get("limit") || "20");

  // Fetch target stores using service
  const stores = await fetchTargetStores();
  console.log("Loader - fetched stores:", stores);

  // Fetch products using service
  const variables = {
    first: limit,
    after: cursor || null,
    query: search
      ? `title:*${search}* OR vendor:*${search}* OR product_type:*${search}*`
      : null,
  };
  let products = null;
  let error = undefined;

  if (admin) {
    try {
      console.log("Attempting to fetch products with admin access...");
      products = await fetchShopifyProducts(admin, variables);
      console.log(
        "✅ Products fetched successfully:",
        products?.edges?.length || 0,
        "products",
      );
      if (!products) {
        error = "Failed to fetch products";
        products = {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "",
            endCursor: "",
          },
          edges: [],
        };
      }
    } catch (err) {
      console.log("❌ Failed to fetch products:", err);
      error = "Failed to fetch products";
      products = {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "",
          endCursor: "",
        },
        edges: [],
      };
    }
  } else {
    // No admin access, show empty product list
    console.log("No admin access, showing empty product list");
    products = {
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: "",
        endCursor: "",
      },
      edges: [],
    };
    error = authError || "Authentication required to view products";
  }

  console.log("=== END AUTHENTICATION DEBUG ===");

  return json<LoaderData>({
    products,
    search,
    limit,
    stores,
    error,
    currentStoreName,
    shopDomain,
    storeOnboardUrl:
      process.env.SHOPIFY_STORE_ONBOARD_URL || "http://localhost:5174",
  });
};

export default function ProductList() {
  const {
    products,
    search: initialSearch,
    stores,
    error,
    currentStoreName,
    shopDomain,
    storeOnboardUrl,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Add state for selected TO store
  const [toStore, setToStore] = useState(stores.length > 0 ? stores[0].id : "");

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Handle search submission
  const handleSearch = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (search.trim()) {
      newSearchParams.set("search", search.trim());
    } else {
      newSearchParams.delete("search");
    }
    newSearchParams.delete("cursor"); // Reset pagination when searching
    setSearchParams(newSearchParams);
  }, [search, searchParams, setSearchParams]);

  // Handle pagination
  const handlePagination = useCallback(
    (cursor: string) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("cursor", cursor);
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams],
  );

  // Handle key press in search field
  const handleSearchKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  // Handle Add new store - redirect to shopify-store-onboard app
  const handleAddStore = useCallback(() => {
    window.open(storeOnboardUrl, "_blank");
  }, [storeOnboardUrl]);

  // Prepare product list for ResourceList
  const resourceListProducts =
    products?.edges?.map(({ node }) => ({
      id: node.id,
      title: node.title,
      status: node.status,
      totalInventory: node.totalInventory || 0,
      vendor: node.vendor,
      productType: node.productType,
      imageUrl: node.images?.edges?.[0]?.node.url,
    })) || [];

  const hasProducts = products?.edges?.length > 0;
  const hasNextPage = products?.pageInfo?.hasNextPage;
  const hasPreviousPage = products?.pageInfo?.hasPreviousPage;
  const endCursor = products?.pageInfo?.endCursor;

  // Export product handler
  const onExportProduct = async (product: any, toStore: string) => {
    try {
      console.log("Exporting product:", product.title, "to store:", toStore);

      const res = await fetch("/app/api/export-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, toStore }),
      });

      console.log("Export response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Export failed:", errorText);
        throw new Error(`Failed to export product: ${errorText}`);
      }

      const result = await res.json();
      console.log("Export successful:", result);
      return result;
    } catch (err: any) {
      console.error("Export error:", err);
      alert(err.message || "Failed to export product");
      throw err;
    }
  };

  return (
    <Page>
      <TitleBar title="Products" />

      {/* App Uninstalled Banner */}
      {error && error.includes("uninstalled") && (
        <AppUninstalledBanner shop={shopDomain || undefined} />
      )}

      {/* Other Error State */}
      {error && !error.includes("uninstalled") && (
        <Box padding="400" background="bg-surface-critical" borderRadius="200">
          <Text as="span" variant="bodyMd" tone="critical">
            {error}
          </Text>
        </Box>
      )}

      {/* Stores Error State */}
      {stores.length === 0 && !error && (
        <Box padding="400" background="bg-surface-warning" borderRadius="200">
          <Text as="span" variant="bodyMd" tone="subdued">
            Failed to load stores. Make sure the store-onboard app is running at{" "}
            {storeOnboardUrl} and check your .env configuration.
          </Text>
        </Box>
      )}

      {/* Product Export Modal */}
      <ProductExportModal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        stores={stores}
        toStore={toStore}
        setToStore={setToStore}
        currentStoreName={currentStoreName}
        onExportProduct={onExportProduct}
      />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" align="space-between">
                  <Text as="h2" variant="headingMd">
                    Product List
                  </Text>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {products.edges.length} products
                  </Text>
                </InlineStack>

                {/* Search Bar */}
                <div style={{ width: "100%" }} onKeyDown={handleSearchKeyPress}>
                  <TextField
                    label="Search products"
                    labelHidden
                    placeholder="Search by title, vendor, or type..."
                    value={search}
                    onChange={handleSearchChange}
                    autoComplete="off"
                  />
                </div>

                {/* Products Resource List */}
                {hasProducts ? (
                  <ProductResourceList
                    products={resourceListProducts}
                    onProductClick={(clickedProduct) => {
                      console.log("Product clicked:", clickedProduct);
                      // Find the full product data from the original products
                      const product = products?.edges?.find(
                        (p) => p.node.id === clickedProduct.id,
                      )?.node;
                      console.log("Found full product:", product);
                      setSelectedProduct(product);
                    }}
                  />
                ) : (
                  <EmptyState
                    heading="No products found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      {search
                        ? `No products found matching "${search}". Try adjusting your search terms.`
                        : "No products found in this store."}
                    </p>
                  </EmptyState>
                )}

                {/* Pagination */}
                {hasProducts && (hasNextPage || hasPreviousPage) && (
                  <InlineStack gap="300" align="center">
                    <Button
                      disabled={!hasPreviousPage}
                      onClick={() => handlePagination("")}
                    >
                      First
                    </Button>
                    <Button
                      disabled={!hasNextPage}
                      onClick={() => handlePagination(endCursor)}
                    >
                      Next
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Store List Section */}
          <Layout.Section>
            <TargetStoresList
              stores={stores.map((store) => ({
                ...store,
                createdAt: new Date(store.createdAt),
              }))}
              onAddStore={handleAddStore}
            />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
