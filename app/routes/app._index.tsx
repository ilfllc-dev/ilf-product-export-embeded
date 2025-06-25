import { useState, useCallback, useRef, useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  Button,
  TextField,
  InlineStack,
  BlockStack,
  Badge,
  EmptyState,
  Box,
  Avatar,
  Select,
  Icon,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { StoreIcon } from "@shopify/polaris-icons";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface LoaderData {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        totalInventory: number;
        vendor: string;
        productType: string;
        tags: string[];
        images: {
          edges: Array<{
            node: {
              id: string;
              url: string;
              altText: string;
            };
          }>;
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              price: string;
              compareAtPrice: string;
              inventoryQuantity: number;
            };
          }>;
        };
      };
    }>;
  };
  search: string;
  limit: number;
  stores: Array<{
    id: string;
    shop: string;
    name: string | null;
    createdAt: Date;
  }>;
  storeAdded: string | null;
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const cursor = url.searchParams.get("cursor") || "";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const storeAdded = url.searchParams.get("store_added");

  // Fetch stores from database
  let stores: Array<{
    id: string;
    shop: string;
    name: string | null;
    createdAt: Date;
  }> = [];
  try {
    stores = await db.store.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    // Continue with empty stores array
  }

  // Build the GraphQL query with search and pagination
  const query = `#graphql
    query getProducts($first: Int!, $after: String, $query: String) {
      products(first: $first, after: $after, query: $query) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            status
            createdAt
            updatedAt
            totalInventory
            vendor
            productType
            tags
            images(first: 1) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  compareAtPrice
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }`;

  const variables = {
    first: limit,
    after: cursor || null,
    query: search
      ? `title:*${search}* OR vendor:*${search}* OR product_type:*${search}*`
      : null,
  };

  try {
    const response = await admin.graphql(query, { variables });
    const responseJson = await response.json();

    return json<LoaderData>({
      products: responseJson.data.products,
      search,
      limit,
      stores,
      storeAdded,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json<LoaderData>({
      products: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "",
          endCursor: "",
        },
        edges: [],
      },
      search,
      limit,
      stores,
      storeAdded,
      error: "Failed to fetch products",
    });
  }
};

export default function ProductList() {
  const {
    products,
    search: initialSearch,
    stores,
    storeAdded,
    error,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const modalRef = useRef<any>(null);

  // Store selection state (for TO side)
  const [toStore, setToStore] = useState("");

  // Create store options from database
  const storeOptions = [
    { label: "Select a store", value: "" },
    ...stores.map((store) => ({
      label: store.name || store.shop,
      value: store.id,
    })),
  ];

  const handleStoreChange = useCallback(
    (value: string) => setToStore(value),
    [],
  );

  // Handle Add new store
  const handleAddStore = useCallback(() => {
    // Prompt user for shop domain
    const shopDomain = prompt(
      "Enter the shop domain (e.g., my-store.myshopify.com):",
    );
    if (shopDomain) {
      // Redirect to OAuth flow
      window.location.href = `/auth/store?shop=${encodeURIComponent(shopDomain)}`;
    }
  }, []);

  // Show success message if store was added
  useEffect(() => {
    if (storeAdded) {
      // You can add a toast notification here
      console.log(`Store ${storeAdded} was successfully added!`);
    }
  }, [storeAdded]);

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

  // Handle row click to open modal
  const handleRowClick = (rowIndex: number) => {
    const product = products.edges[rowIndex]?.node;
    setSelectedProduct(product);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.show();
    }, 0);
  };

  // Format product data for the table
  const formatProductsForTable = () => {
    return products.edges.map(({ node }, idx) => {
      const variant = node.variants.edges[0]?.node;
      return [
        <div style={{ cursor: "pointer" }} onClick={() => handleRowClick(idx)}>
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {node.title}
          </Text>
        </div>,
        <Text key="status" as="span" variant="bodyMd">
          <Badge tone={node.status === "ACTIVE" ? "success" : "warning"}>
            {node.status}
          </Badge>
        </Text>,
        <Text key="vendor" as="span" variant="bodyMd">
          {node.vendor || "—"}
        </Text>,
        <Text key="type" as="span" variant="bodyMd">
          {node.productType || "—"}
        </Text>,
        <Text key="price" as="span" variant="bodyMd">
          {variant?.price ? `$${parseFloat(variant.price).toFixed(2)}` : "—"}
        </Text>,
        <Text key="inventory" as="span" variant="bodyMd">
          {node.totalInventory || 0}
        </Text>,
        <Text key="created" as="span" variant="bodyMd">
          {new Date(node.createdAt).toLocaleDateString()}
        </Text>,
      ];
    });
  };

  // Modal content (scaffold)
  const renderProductModalContent = () => {
    if (!selectedProduct) return null;
    const imageUrl = selectedProduct.images.edges[0]?.node.url;
    const variants = selectedProduct.variants.edges;
    return (
      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "flex-start",
          padding: 24,
        }}
      >
        {/* FROM Side */}
        <div
          style={{ flex: 1, borderRight: "1px solid #eee", paddingRight: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "#FFF7E0",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 600,
                marginRight: 8,
              }}
            >
              FROM
            </div>
            <span style={{ marginRight: 8 }}>
              <Icon source={StoreIcon} tone="base" />
            </span>
            <span style={{ fontWeight: 600 }}>{selectedProduct.vendor}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {imageUrl && (
              <Avatar source={imageUrl} name={selectedProduct.title} />
            )}
            <span style={{ fontWeight: 600, fontSize: 20 }}>
              {selectedProduct.title}
            </span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>
              Product ID:{" "}
              <b>{selectedProduct.id.replace("gid://shopify/Product/", "")}</b>
            </div>
            <div>
              Product Type: <b>{selectedProduct.productType}</b>
            </div>
          </div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Variants</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafbfc" }}>
                <th style={{ textAlign: "left", padding: 4 }}>Title</th>
                <th style={{ textAlign: "left", padding: 4 }}>SKU</th>
                <th style={{ textAlign: "left", padding: 4 }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v: any) => (
                <tr key={v.node.id}>
                  <td style={{ padding: 4 }}>{v.node.title || "-"}</td>
                  <td style={{ padding: 4 }}>{v.node.sku || "-"}</td>
                  <td style={{ padding: 4 }}>
                    {v.node.inventoryQuantity ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* TO Side */}
        <div style={{ flex: 1, paddingLeft: 24 }}>
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
          >
            <div
              style={{
                background: "#FFE3E3",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 600,
                marginRight: 8,
              }}
            >
              TO
            </div>
            <span style={{ marginRight: 8 }}>
              <Icon source={StoreIcon} tone="base" />
            </span>
            <span style={{ fontWeight: 600 }}>
              {toStore
                ? stores.find((store) => store.id === toStore)?.name ||
                  stores.find((store) => store.id === toStore)?.shop ||
                  "No store selected"
                : "No store selected"}
            </span>
          </div>
          {/* Store selection with Select */}
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Select store"
              options={storeOptions}
              onChange={handleStoreChange}
              value={toStore}
            />
          </div>

          {/* Add store button */}
          <div style={{ marginBottom: 16 }}>
            <Button fullWidth variant="primary" onClick={handleAddStore}>
              Add new store
            </Button>
          </div>

          {/* Export button */}
          <button
            style={{
              width: "100%",
              background: "#008060",
              color: "white",
              padding: "12px",
              border: "none",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Export product
          </button>
        </div>
      </div>
    );
  };

  // Hide modal when closed
  useEffect(() => {
    if (!modalRef.current) return;
    const handler = () => setSelectedProduct(null);
    modalRef.current.addEventListener("hide", handler);
    if (modalRef.current) {
      modalRef.current.addEventListener("hide", handler);
    }
  }, []);

  const tableHeaders = [
    "Product",
    "Status",
    "Vendor",
    "Type",
    "Price",
    "Inventory",
    "Created",
  ];

  const hasProducts = products.edges.length > 0;
  const hasNextPage = products.pageInfo?.hasNextPage;
  const hasPreviousPage = products.pageInfo?.hasPreviousPage;
  const endCursor = products.pageInfo?.endCursor;

  return (
    <Page>
      <TitleBar title="Products" />

      {/* Success message */}
      {storeAdded && (
        <div
          style={{
            background: "#d4edda",
            color: "#155724",
            padding: "12px",
            margin: "16px 0",
            borderRadius: "4px",
            border: "1px solid #c3e6cb",
          }}
        >
          ✅ Store "{storeAdded}" was successfully added!
        </div>
      )}

      {/* App Bridge Web Component Modal */}
      <ui-modal id="product-export-modal" variant="max" ref={modalRef as any}>
        {renderProductModalContent()}
        <ui-title-bar title="Export Product">
          <button
            variant="primary"
            onClick={() => {
              // handle export
            }}
          >
            Export
          </button>
          <button onClick={() => modalRef.current?.hide()}>Close</button>
        </ui-title-bar>
      </ui-modal>
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

                {/* Error State */}
                {error && (
                  <Box
                    padding="400"
                    background="bg-surface-critical"
                    borderRadius="200"
                  >
                    <Text as="span" variant="bodyMd" tone="critical">
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Products Table */}
                {hasProducts ? (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "text",
                      "text",
                      "numeric",
                      "numeric",
                      "text",
                    ]}
                    headings={tableHeaders}
                    rows={formatProductsForTable()}
                    hoverable
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
        </Layout>
      </BlockStack>
    </Page>
  );
}
