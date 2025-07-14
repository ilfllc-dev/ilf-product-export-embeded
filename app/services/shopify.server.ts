export const getCurrentStoreName = async (admin: any): Promise<string> => {
  try {
    const shopInfoQuery = `#graphql
      {
        shop {
          name
        }
      }`;
    const shopInfoResponse = await admin.graphql(shopInfoQuery);
    const shopInfoJson = await shopInfoResponse.json();
    return shopInfoJson.data.shop.name;
  } catch (error) {
    return "";
  }
};

export const fetchTargetStores = async (): Promise<
  Array<{
    id: string;
    shop: string;
    name: string | null;
    createdAt: Date;
  }>
> => {
  const storeOnboardUrl =
    process.env.SHOPIFY_STORE_ONBOARD_URL || "http://localhost:5174";

  try {
    console.log(
      `Attempting to fetch stores from: ${storeOnboardUrl}/api/stores`,
    );

    const response = await fetch(`${storeOnboardUrl}/api/stores`);

    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched ${data.stores?.length || 0} stores`);
      return (
        data.stores?.map((store: any) => ({
          id: store.id,
          shop: store.shop,
          name: store.name,
          createdAt: new Date(store.createdAt),
        })) || []
      );
    } else {
      console.error(
        `Failed to fetch stores: ${response.status} ${response.statusText}`,
      );
      if (response.status === 404) {
        console.error(
          "Store-onboard app API endpoint not found. Make sure the store-onboard app is running.",
        );
      }
      return [];
    }
  } catch (error) {
    console.error("Error fetching stores from shopify-store-onboard:", error);
    console.error(
      "Make sure the store-onboard app is running at:",
      storeOnboardUrl,
    );
    return [];
  }
};

export const fetchShopifyProducts = async (
  admin: any,
  variables: { first: number; after: string | null; query: string | null },
): Promise<any> => {
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
            bodyHtml
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
  try {
    const response = await admin.graphql(query, { variables });
    const responseJson = await response.json();

    console.log("GraphQL response:", JSON.stringify(responseJson, null, 2));

    if (responseJson.errors) {
      console.error(
        "GraphQL errors:",
        JSON.stringify(responseJson.errors, null, 2),
      );
      return null;
    }

    if (!responseJson.data || !responseJson.data.products) {
      console.error("Invalid GraphQL response structure:", responseJson);
      return null;
    }

    return responseJson.data.products;
  } catch (error) {
    console.error("Error fetching products from Shopify:", error);
    return null;
  }
};

export const fetchDetailedProductForExport = async (
  admin: any,
  productId: string,
): Promise<any> => {
  const query = `#graphql
    query getDetailedProduct($id: ID!) {
      product(id: $id) {
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
        bodyHtml
        images(first: 50) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              inventoryQuantity
              sku
              barcode
              selectedOptions {
                name
                value
              }
            }
          }
        }
        metafields(first: 50) {
          edges {
            node {
              id
              namespace
              key
              value
              type
              description
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query, {
      variables: { id: productId },
    });
    const responseJson = await response.json();

    if (responseJson.errors) {
      console.error(
        "Shopify GraphQL errors:",
        JSON.stringify(responseJson.errors, null, 2),
      );
      // Surface the error for debugging
      throw new Error(JSON.stringify(responseJson.errors));
    }

    if (!responseJson.data || !responseJson.data.product) {
      console.error("Invalid GraphQL response structure:", responseJson);
      throw new Error("Invalid GraphQL response structure");
    }

    return responseJson.data.product;
  } catch (error) {
    console.error("Error fetching detailed product from Shopify:", error);
    throw error;
  }
};

export const exportProductToStore = async (
  product: any,
  toStoreId: string,
  admin: any,
) => {
  console.log("Starting export process for product:", product.title);
  console.log("Target store ID:", toStoreId);

  // Fetch detailed product data including all variants and metafields
  console.log("Fetching detailed product data for export...");
  const detailedProduct = await fetchDetailedProductForExport(
    admin,
    product.id,
  );

  if (!detailedProduct) {
    throw new Error("Failed to fetch detailed product data for export");
  }

  console.log(
    "Detailed product data:",
    JSON.stringify(detailedProduct, null, 2),
  );

  // 1. Fetch the target store's access token and shop domain
  const storeOnboardUrl =
    process.env.SHOPIFY_STORE_ONBOARD_URL || "http://localhost:5174";
  const storesRes = await fetch(`${storeOnboardUrl}/api/stores`);
  if (!storesRes.ok) throw new Error("Failed to fetch target stores");
  const storesData = await storesRes.json();
  const targetStore = storesData.stores.find((s: any) => s.id === toStoreId);
  if (!targetStore) throw new Error("Target store not found");
  const { accessToken, shop } = targetStore;
  if (!accessToken || !shop)
    throw new Error("Missing access token or shop domain for target store");

  console.log("Found target store:", shop);

  // 2. Check if product already exists by searching for it using the original product ID
  console.log("Checking if product already exists...");

  // Search for products with the same title first (more efficient)
  const searchRes = await fetch(
    `https://${shop}/admin/api/2023-10/products.json?title=${encodeURIComponent(detailedProduct.title)}&limit=50`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  let existingProduct = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    console.log(
      `Found ${searchData.products.length} products with title: "${detailedProduct.title}"`,
    );

    // Look for a product that has a metafield with the original product ID
    for (const p of searchData.products) {
      try {
        const metafieldsRes = await fetch(
          `https://${shop}/admin/api/2023-10/products/${p.id}/metafields.json`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
          },
        );

        if (metafieldsRes.ok) {
          const metafieldsData = await metafieldsRes.json();
          const originalIdMetafield = metafieldsData.metafields.find(
            (mf: any) =>
              mf.namespace === "product_export" &&
              mf.key === "original_product_id",
          );

          if (
            originalIdMetafield &&
            originalIdMetafield.value === detailedProduct.id
          ) {
            existingProduct = p;
            console.log(
              "Found existing product by original ID:",
              existingProduct.id,
            );
            break;
          }
        }
      } catch (error) {
        console.log("Error checking metafields for product:", p.id, error);
      }
    }

    if (!existingProduct) {
      console.log(
        "No existing product found with matching original ID, will create new one",
      );
    }
  } else {
    console.log("Product search failed, will attempt to create new product");
  }

  // 3. Map product data to Shopify REST API format
  const productPayload: any = {
    product: {
      title: detailedProduct.title || "Untitled Product",
      body_html: detailedProduct.bodyHtml || "",
      vendor: detailedProduct.vendor || "",
      product_type: detailedProduct.productType || "",
      tags: detailedProduct.tags || [],
      images: [],
      variants: [],
    },
  };

  // Handle images if present
  if (
    detailedProduct.images &&
    detailedProduct.images.edges &&
    Array.isArray(detailedProduct.images.edges)
  ) {
    console.log(`Processing ${detailedProduct.images.edges.length} images`);
    productPayload.product.images = detailedProduct.images.edges.map(
      (img: any) => ({
        src: img.node.url,
        alt: img.node.altText || "",
      }),
    );
  }

  // Handle variants if present
  if (
    detailedProduct.variants &&
    detailedProduct.variants.edges &&
    Array.isArray(detailedProduct.variants.edges)
  ) {
    console.log(`Processing ${detailedProduct.variants.edges.length} variants`);

    // Collect all unique option names from variants
    const allOptionNames = new Set<string>();
    detailedProduct.variants.edges.forEach((v: any) => {
      const variant = v.node;
      if (variant.selectedOptions) {
        variant.selectedOptions.forEach((opt: any) => {
          allOptionNames.add(opt.name);
        });
      }
    });

    // Convert to array and sort for consistent ordering
    const optionNamesArray = Array.from(allOptionNames).sort();

    // Set the product options - REST API expects array of objects with 'name' property
    productPayload.product.options = optionNamesArray.map((name) => ({
      name,
    }));

    productPayload.product.variants = detailedProduct.variants.edges.map(
      (v: any) => {
        const variant = v.node;
        console.log("Processing variant:", variant.title || "Default Title");

        // Convert selectedOptions to option1, option2, option3 for REST API
        const option1 =
          variant.selectedOptions?.find(
            (opt: any) => opt.name === optionNamesArray[0],
          )?.value || null;
        const option2 =
          optionNamesArray.length > 1
            ? variant.selectedOptions?.find(
                (opt: any) => opt.name === optionNamesArray[1],
              )?.value || null
            : null;
        const option3 =
          optionNamesArray.length > 2
            ? variant.selectedOptions?.find(
                (opt: any) => opt.name === optionNamesArray[2],
              )?.value || null
            : null;

        return {
          title: variant.title || "Default Title",
          price: variant.price || "0.00",
          compare_at_price: variant.compareAtPrice || null,
          sku: variant.sku || "",
          barcode: variant.barcode || "",
          inventory_quantity: variant.inventoryQuantity || 0,
          option1: option1,
          option2: option2,
          option3: option3,
        };
      },
    );
  } else {
    // Add a default variant if no variants are present
    console.log("No variants found, creating default variant");
    productPayload.product.options = [{ name: "Title" }];
    productPayload.product.variants = [
      {
        title: "Default Title",
        price: "0.00",
        compare_at_price: null,
        sku: "",
        barcode: "",
        inventory_quantity: 0,
        option_values: ["Default Title"],
      },
    ];
  }

  // Check for potential variant title conflicts if creating a new product
  if (!existingProduct) {
    const allProductsRes = await fetch(
      `https://${shop}/admin/api/2023-10/products.json?limit=1`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      },
    );

    if (allProductsRes.ok) {
      const allProductsData = await allProductsRes.json();
      if (allProductsData.products.length > 0) {
        console.log(
          "Found existing products in store, checking for conflicts...",
        );
        // Add a unique suffix to all variant titles to avoid conflicts
        const timestamp = Date.now();
        productPayload.product.variants = productPayload.product.variants.map(
          (variant: any, index: number) => ({
            ...variant,
            title: `${variant.title} (${timestamp})`,
            // Also update option1 to match the new title
            option1: variant.option1
              ? `${variant.option1} (${timestamp})`
              : variant.option1,
          }),
        );

        console.log(
          "Added unique timestamps to variant titles to avoid conflicts",
        );
      }
    }
  }

  let resultProduct;
  let isUpdate = false;

  if (existingProduct) {
    // 4a. Update existing product
    console.log("Updating existing product:", existingProduct.id);
    console.log("Product payload:", JSON.stringify(productPayload, null, 2));

    const updateRes = await fetch(
      `https://${shop}/admin/api/2023-10/products/${existingProduct.id}.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(productPayload),
      },
    );

    console.log("Update product response status:", updateRes.status);

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Failed to update product:", errText);
      throw new Error(`Failed to update product in target store: ${errText}`);
    }

    resultProduct = (await updateRes.json()).product;
    console.log("Successfully updated product:", resultProduct.id);
    isUpdate = true;
  } else {
    // 4b. Create new product
    console.log("Creating new product in target store:", shop);
    console.log("Product payload:", JSON.stringify(productPayload, null, 2));

    const createRes = await fetch(
      `https://${shop}/admin/api/2023-10/products.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(productPayload),
      },
    );

    console.log("Create product response status:", createRes.status);

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Failed to create product:", errText);
      throw new Error(`Failed to create product in target store: ${errText}`);
    }

    resultProduct = (await createRes.json()).product;
    console.log("Successfully created product:", resultProduct.id);
  }

  // 5. Create metafields if present
  if (
    detailedProduct.metafields &&
    detailedProduct.metafields.edges &&
    Array.isArray(detailedProduct.metafields.edges)
  ) {
    console.log(
      `Processing ${detailedProduct.metafields.edges.length} metafields`,
    );
    for (const mfEdge of detailedProduct.metafields.edges) {
      const mf = mfEdge.node;
      console.log("Processing metafield:", mf.namespace, mf.key);

      const metafieldPayload = {
        metafield: {
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value,
          type: mf.type || "single_line_text_field",
          description: mf.description || "",
        },
      };
      const mfRes = await fetch(
        `https://${shop}/admin/api/2023-10/products/${resultProduct.id}/metafields.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify(metafieldPayload),
        },
      );
      if (!mfRes.ok) {
        const mfErr = await mfRes.text();
        console.error("Failed to create metafield:", mfErr);
        // Don't throw error for metafield failures, just log them
      } else {
        console.log("Successfully created metafield:", mf.namespace, mf.key);
      }
    }
  } else {
    console.log("No metafields found to export");
  }

  // 6. Always create a metafield to store the original product ID for future updates
  const originalIdMetafieldPayload = {
    metafield: {
      namespace: "product_export",
      key: "original_product_id",
      value: detailedProduct.id,
      type: "single_line_text_field",
      description: "Original product ID from source store",
    },
  };

  const originalIdRes = await fetch(
    `https://${shop}/admin/api/2023-10/products/${resultProduct.id}/metafields.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify(originalIdMetafieldPayload),
    },
  );

  if (!originalIdRes.ok) {
    const mfErr = await originalIdRes.text();
    console.error("Failed to create original ID metafield:", mfErr);
    // Don't throw error for metafield failures, just log them
  } else {
    console.log("Successfully created original ID metafield");
  }

  // 7. Done
  return {
    success: true,
    productId: resultProduct.id,
    isUpdate,
    message: isUpdate
      ? "Product updated successfully"
      : "Product created successfully",
  };
};
