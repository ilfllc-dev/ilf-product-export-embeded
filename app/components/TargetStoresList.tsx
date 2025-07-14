import React from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  EmptyState,
} from "@shopify/polaris";

interface Store {
  id: string;
  name: string | null;
  shop: string;
  createdAt: Date;
}

interface TargetStoresListProps {
  stores: Store[];
  onAddStore: () => void;
}

export const TargetStoresList: React.FC<TargetStoresListProps> = ({
  stores,
  onAddStore,
}) => (
  <Card>
    <BlockStack gap="400">
      <InlineStack gap="300" align="space-between">
        <Text as="h2" variant="headingMd">
          Target Stores
        </Text>
        <InlineStack gap="200">
          <Text as="span" variant="bodyMd" tone="subdued">
            {stores.length} stores
          </Text>
          <Button variant="primary" onClick={onAddStore}>
            Add Store
          </Button>
        </InlineStack>
      </InlineStack>
      {stores.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stores.map((store) => (
            <div
              key={store.id}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <img
                src="/shopifybag.svg"
                alt="Shopify"
                style={{ width: "20px", height: "20px" }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>
                  {store.name || store.shop}
                </div>
                {store.name && (
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {store.shop}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#666" }}>
                  Added {new Date(store.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          heading="No target stores found"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            You haven't added any target stores yet. Add stores to export
            products to them.
          </p>
          <Button variant="primary" onClick={onAddStore}>
            Add your first store
          </Button>
        </EmptyState>
      )}
    </BlockStack>
  </Card>
);
