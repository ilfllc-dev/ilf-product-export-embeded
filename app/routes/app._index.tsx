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
import { BulkExportModal } from "../components/BulkExportModal";
import { TargetStoresList } from "../components/TargetStoresList";
import { AppUninstalledBanner } from "../components/AppUninstalledBanner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate with Shopify to get current store's data
  let admin = null;
  let currentStoreName = "Unknown Store";
  let authError = null;
  let shopDomain = null;

  // Extract shop domain from URL parameters
  const requestUrl = new URL(request.url);
  shopDomain = requestUrl.searchParams.get("shop");

  // Check if this is an OAuth callback (has code parameter)
  const isOAuthCallback = requestUrl.searchParams.has("code");

  if (isOAuthCallback) {
    return redirect(`/auth/callback?${requestUrl.searchParams.toString()}`);
  }

  try {
    // For embedded apps, use the authenticate.admin method which handles id_token
    const authResult = await authenticate.admin(request);
    admin = authResult.admin;
    currentStoreName = await getCurrentStoreName(admin);
  } catch (error: any) {
    // Check if it's a 410 (Gone) error - app uninstalled
    if (error.status === 410 || error.message?.includes("410")) {
      authError =
        "App has been uninstalled from this store. Please reinstall the app to continue.";
    } else if (error.status === 302 || error.message?.includes("302")) {
      // For embedded apps, if we get a 302, it means we need to redirect to login
      const loginUrl = `/auth/login?shop=${shopDomain}`;
      return redirect(loginUrl);
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
      products = await fetchShopifyProducts(admin, variables);
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
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Add state for selected stores (multi-select)
  const [selectedStores, setSelectedStores] = useState<string[]>(
    stores.length > 0 ? [stores[0].id] : [],
  );

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

  // Export product handler - now supports multiple stores
  const onExportProduct = async (
    product: any,
    toStores: string[],
    status: "draft" | "active",
  ) => {
    if (toStores.length === 0) {
      throw new Error("Please select at least one store");
    }

    const results = [];
    const errors = [];

    // Export to each store sequentially
    for (const toStore of toStores) {
      try {
        const res = await fetch("/app/api/export-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, toStore, status }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Export failed for store ${toStore}:`, errorText);
          errors.push({
            storeId: toStore,
            error: errorText,
          });
        } else {
          const result = await res.json();
          results.push({
            storeId: toStore,
            result,
          });
        }
      } catch (err: any) {
        console.error(`Export error for store ${toStore}:`, err);
        errors.push({
          storeId: toStore,
          error: err.message || "Failed to export product",
        });
      }
    }

    // Return summary
    const successCount = results.length;
    const failCount = errors.length;
    const totalCount = toStores.length;

    if (failCount === 0) {
      return {
        success: true,
        message: `Product exported successfully to ${successCount} store${successCount !== 1 ? "s" : ""}`,
        results,
        errors: [],
      };
    } else if (successCount === 0) {
      throw new Error(
        `Failed to export product to all ${totalCount} store${totalCount !== 1 ? "s" : ""}`,
      );
    } else {
      return {
        success: true,
        message: `Product exported to ${successCount} of ${totalCount} store${totalCount !== 1 ? "s" : ""}`,
        results,
        errors,
      };
    }
  };

  // Bulk export handler - exports multiple products to multiple stores
  const onBulkExport = async (
    productIds: string[],
    toStores: string[],
    status: "draft" | "active",
  ) => {
    if (toStores.length === 0) {
      throw new Error("Please select at least one store");
    }
    if (productIds.length === 0) {
      throw new Error("Please select at least one product");
    }

    // Get full product data for selected products
    const productsToExport = products?.edges
      ?.filter((edge) => productIds.includes(edge.node.id))
      .map((edge) => edge.node) || [];

    if (productsToExport.length === 0) {
      throw new Error("No products found to export");
    }

    const results = [];
    const errors = [];
    let totalExports = 0;
    let successfulExports = 0;
    let failedExports = 0;

    // Nested loop: for each product, export to each store
    for (const product of productsToExport) {
      for (const toStore of toStores) {
        totalExports++;
        try {
          const res = await fetch("/app/api/export-product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product, toStore, status }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error(
              `Export failed for product ${product.title} to store ${toStore}:`,
              errorText,
            );
            errors.push({
              productId: product.id,
              productTitle: product.title,
              storeId: toStore,
              error: errorText,
            });
            failedExports++;
          } else {
            const result = await res.json();
            results.push({
              productId: product.id,
              productTitle: product.title,
              storeId: toStore,
              result,
            });
            successfulExports++;
          }
        } catch (err: any) {
          console.error(
            `Export error for product ${product.title} to store ${toStore}:`,
            err,
          );
          errors.push({
            productId: product.id,
            productTitle: product.title,
            storeId: toStore,
            error: err.message || "Failed to export product",
          });
          failedExports++;
        }
      }
    }

    // Return summary
    if (failedExports === 0) {
      return {
        success: true,
        message: `Successfully exported ${productsToExport.length} product${productsToExport.length !== 1 ? "s" : ""} to ${toStores.length} store${toStores.length !== 1 ? "s" : ""}`,
        results,
        errors: [],
        summary: {
          totalProducts: productsToExport.length,
          totalStores: toStores.length,
          totalExports,
          successful: successfulExports,
          failed: failedExports,
        },
      };
    } else if (successfulExports === 0) {
      throw new Error(
        `Failed to export all products. ${failedExports} export${failedExports !== 1 ? "s" : ""} failed.`,
      );
    } else {
      return {
        success: true,
        message: `Exported ${productsToExport.length} product${productsToExport.length !== 1 ? "s" : ""} to ${toStores.length} store${toStores.length !== 1 ? "s" : ""} (${successfulExports} successful, ${failedExports} failed)`,
        results,
        errors,
        summary: {
          totalProducts: productsToExport.length,
          totalStores: toStores.length,
          totalExports,
          successful: successfulExports,
          failed: failedExports,
        },
      };
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
        selectedStores={selectedStores}
        setSelectedStores={setSelectedStores}
        currentStoreName={currentStoreName}
        onExportProduct={onExportProduct}
      />

      {/* Bulk Export Modal */}
      <BulkExportModal
        open={bulkExportOpen}
        onClose={() => {
          setBulkExportOpen(false);
          setSelectedProductIds([]);
        }}
        selectedProducts={selectedProductIds}
        stores={stores}
        selectedStores={selectedStores}
        setSelectedStores={setSelectedStores}
        currentStoreName={currentStoreName}
        onBulkExport={onBulkExport}
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
                      // Find the full product data from the original products
                      const product = products?.edges?.find(
                        (p) => p.node.id === clickedProduct.id,
                      )?.node;
                      setSelectedProduct(product);
                    }}
                    onSelectionChange={(selectedIds) => {
                      setSelectedProductIds(selectedIds);
                    }}
                    onBulkExport={(selectedIds) => {
                      setSelectedProductIds(selectedIds);
                      setBulkExportOpen(true);
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
