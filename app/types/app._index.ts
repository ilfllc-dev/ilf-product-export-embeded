export interface LoaderData {
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
  error?: string;
  currentStoreName: string;
  storeOnboardUrl: string;
}
