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
  const baseQuery = `#graphql
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

  const channelAwareQuery = `#graphql
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
            availablePublicationsCount {
              count
            }
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

  const runProductsQuery = async (query: string, label: string) => {
    try {
      const response = await admin.graphql(query, { variables });
      return await response.json();
    } catch (error) {
      console.error(`Error executing ${label} product query:`, error);
      return null;
    }
  };

  try {
    // Best-effort: try to fetch channel counts, but never fail product loading if unsupported.
    const channelAwareResult = await runProductsQuery(
      channelAwareQuery,
      "channel-aware",
    );
    if (channelAwareResult?.data?.products) {
      return channelAwareResult.data.products;
    }

    if (channelAwareResult?.errors) {
      console.log(
        "Channel-aware product query returned errors; falling back to base query",
        JSON.stringify(channelAwareResult.errors),
      );
    }

    const fallbackResult = await runProductsQuery(baseQuery, "fallback");
    if (fallbackResult?.data?.products) {
      return fallbackResult.data.products;
    }

    if (fallbackResult?.errors) {
      console.error(
        "Fallback product query returned errors:",
        JSON.stringify(fallbackResult.errors, null, 2),
      );
      return null;
    }

    if (!fallbackResult?.data?.products) {
      console.error("Invalid GraphQL response structure:", fallbackResult);
      return null;
    }

    return fallbackResult.data.products;
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
        options {
          name
          position
        }
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
              inventoryItem {
                measurement {
                  weight {
                    value
                    unit
                  }
                }
              }
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

const mapGraphqlWeightUnitToRest = (unit: string | null | undefined) => {
  switch (unit) {
    case "GRAMS":
      return "g";
    case "KILOGRAMS":
      return "kg";
    case "POUNDS":
      return "lb";
    case "OUNCES":
      return "oz";
    default:
      return undefined;
  }
};

const getVariantWeight = (variant: any) => {
  const weight = variant?.inventoryItem?.measurement?.weight;
  if (!weight || typeof weight.value !== "number") {
    return { weight: undefined, weightUnit: undefined };
  }

  return {
    weight: weight.value,
    weightUnit: mapGraphqlWeightUnitToRest(weight.unit),
  };
};

const fetchPublishedChannelNames = async (
  admin: any,
  productId: string,
): Promise<string[]> => {
  const channelsQuery = `#graphql
    query ProductChannels($id: ID!) {
      product(id: $id) {
        resourcePublications(first: 50, onlyPublished: true) {
          edges {
            node {
              isPublished
              publication {
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(channelsQuery, {
      variables: { id: productId },
    });
    const responseJson = await response.json();

    if (responseJson.errors) {
      console.log(
        "Could not fetch source channels (continuing without channel sync):",
        JSON.stringify(responseJson.errors),
      );
      return [];
    }

    const edges =
      responseJson?.data?.product?.resourcePublications?.edges ?? [];

    return edges
      .map((edge: any) => edge?.node)
      .filter(
        (node: any) =>
          node?.isPublished && typeof node?.publication?.name === "string",
      )
      .map((node: any) => node.publication.name);
  } catch (error) {
    console.log(
      "Error fetching source channels (continuing without channel sync):",
      error,
    );
    return [];
  }
};

type ChannelSyncResult = {
  status: "synced" | "skipped" | "failed";
  sourceChannels: number;
  matchedChannels: number;
  reason?: string;
};

const syncProductChannelsInTargetStore = async (
  shop: string,
  accessToken: string,
  targetProductId: string | number,
  sourceChannelNames: string[],
) : Promise<ChannelSyncResult> => {
  if (!Array.isArray(sourceChannelNames) || sourceChannelNames.length === 0) {
    return {
      status: "skipped",
      sourceChannels: 0,
      matchedChannels: 0,
      reason: "no_source_channels",
    };
  }

  const targetGraphqlEndpoint = `https://${shop}/admin/api/2023-10/graphql.json`;
  const uniqueSourceChannelNames = Array.from(
    new Set(sourceChannelNames.map((name) => name.trim()).filter(Boolean)),
  );

  try {
    const publicationsRes = await fetch(targetGraphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: `#graphql
          query GetTargetPublications {
            publications(first: 50) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        `,
      }),
    });

    if (!publicationsRes.ok) {
      const errText = await publicationsRes.text();
      console.log(
        "Could not load target channels (continuing without channel sync):",
        errText,
      );
      return {
        status: "failed",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: 0,
        reason: "target_publications_unavailable",
      };
    }

    const publicationsJson = await publicationsRes.json();
    if (
      Array.isArray(publicationsJson?.errors) &&
      publicationsJson.errors.length > 0
    ) {
      console.log(
        "Target channel query returned GraphQL errors:",
        JSON.stringify(publicationsJson.errors),
      );
      return {
        status: "failed",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: 0,
        reason: "target_publications_query_error",
      };
    }

    const targetPublicationNodes =
      publicationsJson?.data?.publications?.edges?.map((edge: any) => edge.node) ??
      [];
    const targetPublicationsByName = new Map<string, string>();

    for (const publication of targetPublicationNodes) {
      if (publication?.id && typeof publication?.name === "string") {
        targetPublicationsByName.set(
          publication.name.trim().toLowerCase(),
          publication.id,
        );
      }
    }

    const publicationIds = uniqueSourceChannelNames
      .map((name) => targetPublicationsByName.get(name.toLowerCase()))
      .filter((publicationId): publicationId is string => Boolean(publicationId));

    if (publicationIds.length === 0) {
      console.log(
        "No matching target channels found by name; skipping channel sync",
      );
      return {
        status: "skipped",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: 0,
        reason: "no_matching_target_channels",
      };
    }

    const publishRes = await fetch(targetGraphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: `#graphql
          mutation PublishProductToChannels($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          id: `gid://shopify/Product/${targetProductId}`,
          input: publicationIds.map((publicationId) => ({ publicationId })),
        },
      }),
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.log(
        "Failed to publish product to matched target channels:",
        errText,
      );
      return {
        status: "failed",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: publicationIds.length,
        reason: "publish_request_failed",
      };
    }

    const publishJson = await publishRes.json();
    if (Array.isArray(publishJson?.errors) && publishJson.errors.length > 0) {
      console.log(
        "Channel publish mutation returned GraphQL errors:",
        JSON.stringify(publishJson.errors),
      );
      return {
        status: "failed",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: publicationIds.length,
        reason: "publish_graphql_error",
      };
    }

    const userErrors = publishJson?.data?.publishablePublish?.userErrors;
    if (Array.isArray(userErrors) && userErrors.length > 0) {
      console.log(
        "Channel publish mutation returned user errors:",
        JSON.stringify(userErrors),
      );
      return {
        status: "failed",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: publicationIds.length,
        reason: "publish_user_error",
      };
    } else {
      console.log(
        `Successfully synced ${publicationIds.length} publication channel(s)`,
      );
      return {
        status: "synced",
        sourceChannels: uniqueSourceChannelNames.length,
        matchedChannels: publicationIds.length,
      };
    }
  } catch (error) {
    console.log(
      "Error syncing channels to target store (continuing without channel sync):",
      error,
    );
    return {
      status: "failed",
      sourceChannels: uniqueSourceChannelNames.length,
      matchedChannels: 0,
      reason: "channel_sync_exception",
    };
  }
};

export const exportProductToStore = async (
  product: any,
  toStoreId: string,
  admin: any,
  status?: "draft" | "active",
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
  const sourceChannelNames = await fetchPublishedChannelNames(
    admin,
    detailedProduct.id,
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

  let existingProduct: { id: string; title?: string } | null = null;

  // FIX: Prefer a metafield lookup by original product ID to avoid title mismatches.
  try {
    const metafieldQuery = `#graphql
      query FindProductByOriginalId($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;
    const queryValue = `metafield:product_export.original_product_id:"${detailedProduct.id}"`;
    const metafieldRes = await fetch(
      `https://${shop}/admin/api/2023-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: metafieldQuery,
          variables: { query: queryValue },
        }),
      },
    );

    if (metafieldRes.ok) {
      const metafieldData = await metafieldRes.json();
      const existingNode =
        metafieldData?.data?.products?.edges?.[0]?.node || null;
      if (existingNode?.id) {
        const numericId = existingNode.id.split("/").pop();
        if (numericId) {
          existingProduct = { id: numericId, title: existingNode.title };
          console.log(
            "Found existing product by original ID metafield:",
            existingProduct.id,
          );
        }
      }
    } else {
      const metafieldErr = await metafieldRes.text();
      console.log(
        "Metafield lookup failed, falling back to title search:",
        metafieldErr,
      );
    }
  } catch (error) {
    console.log("Metafield lookup error, falling back to title search:", error);
  }

  if (!existingProduct) {
    // FIX: Fallback to title search for legacy products without metafields.
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
  }

  // 3. Map product data to Shopify REST API format
  const normalizedStatus: "draft" | "active" =
    status === "active" ? "active" : "draft";
  const productPayload: any = {
    product: {
      title: detailedProduct.title || "Untitled Product",
      body_html: detailedProduct.bodyHtml || "",
      vendor: detailedProduct.vendor || "",
      product_type: detailedProduct.productType || "",
      tags: detailedProduct.tags || [],
      status: normalizedStatus,
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

    const productOptions = Array.isArray(detailedProduct.options)
      ? detailedProduct.options
          .filter((opt: any) => typeof opt?.name === "string")
          .sort((a: any, b: any) => {
            const aPos = typeof a?.position === "number" ? a.position : 0;
            const bPos = typeof b?.position === "number" ? b.position : 0;
            return aPos - bPos;
          })
          .map((opt: any) => opt.name)
      : [];

    const optionNamesArray =
      productOptions.length > 0
        ? productOptions
        : Array.from(
            new Set(
              detailedProduct.variants.edges.flatMap((v: any) =>
                Array.isArray(v?.node?.selectedOptions)
                  ? v.node.selectedOptions
                      .map((opt: any) => opt?.name)
                      .filter((name: any) => typeof name === "string")
                  : [],
              ),
            ),
          );

    // Set the product options - REST API expects array of objects with 'name' property
    productPayload.product.options = optionNamesArray.map((name) => ({
      name,
    }));

    productPayload.product.variants = detailedProduct.variants.edges.map(
      (v: any) => {
        const variant = v.node;
        const productTitle = detailedProduct.title || "Untitled Product";
        console.log("Processing variant:", variant.title || productTitle);

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

        // Always use product title as fallback for variant title
        const variantTitle = variant.title || productTitle;
        // If all option values are null, use product title for option1 to avoid "(default name)"
        const defaultOption1 =
          option1 === null && option2 === null && option3 === null
            ? productTitle
            : option1;
        const { weight, weightUnit } = getVariantWeight(variant);

        return {
          title: variantTitle,
          price: variant.price || "0.00",
          compare_at_price: variant.compareAtPrice || null,
          sku: variant.sku || "",
          barcode: variant.barcode || "",
          inventory_quantity: variant.inventoryQuantity || 0,
          ...(typeof weight === "number" ? { weight } : {}),
          ...(weightUnit ? { weight_unit: weightUnit } : {}),
          option1: defaultOption1,
          option2: option2,
          option3: option3,
        };
      },
    );
  } else {
    // Add a default variant if no variants are present
    const productTitle = detailedProduct.title || "Untitled Product";
    console.log("No variants found, creating default variant");
    productPayload.product.options = [{ name: "Title" }];
    productPayload.product.variants = [
      {
        title: productTitle,
        price: "0.00",
        compare_at_price: null,
        sku: "",
        barcode: "",
        inventory_quantity: 0,
        option_values: [productTitle],
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
  let channelSync: ChannelSyncResult = {
    status: "skipped",
    sourceChannels: sourceChannelNames.length,
    matchedChannels: 0,
    reason: "status_not_active",
  };

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

  if (normalizedStatus === "active") {
    channelSync = await syncProductChannelsInTargetStore(
      shop,
      accessToken,
      resultProduct.id,
      sourceChannelNames,
    );
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
    channelSync,
  };
};
