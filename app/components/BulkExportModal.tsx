import React, { useState } from "react";
import {
  Modal,
  ChoiceList,
  Text,
  InlineStack,
  Badge,
  Select,
  BlockStack,
} from "@shopify/polaris";

interface Store {
  id: string;
  name: string | null;
  shop: string;
}

interface BulkExportModalProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: string[];
  stores: Store[];
  selectedStores: string[];
  setSelectedStores: (ids: string[]) => void;
  currentStoreName: string;
  onBulkExport: (
    productIds: string[],
    toStores: string[],
    status: "draft" | "active",
  ) => Promise<any>;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  open,
  onClose,
  selectedProducts,
  stores,
  selectedStores,
  setSelectedStores,
  currentStoreName,
  onBulkExport,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [productStatus, setProductStatus] = useState<"draft" | "active">(
    "draft",
  );

  const selectedStoreObjects = stores.filter((store) =>
    selectedStores.includes(store.id),
  );
  const storeChoices = stores.map((store) => ({
    label: store.name || store.shop,
    value: store.id,
  }));

  const handleExport = async () => {
    if (selectedStores.length === 0 || selectedProducts.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      const result = await onBulkExport(
        selectedProducts,
        selectedStores,
        productStatus,
      );
      setIsExporting(false);

      if (
        typeof shopify !== "undefined" &&
        shopify.toast &&
        shopify.toast.show
      ) {
        const message =
          result?.message ||
          `Exported ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}`;
        shopify.toast.show(message, { duration: 5000 });
      }
      onClose();
    } catch (e: any) {
      setIsExporting(false);
      if (
        typeof shopify !== "undefined" &&
        shopify.toast &&
        shopify.toast.show
      ) {
        shopify.toast.show(
          e.message || "Failed to export products",
          { duration: 5000 },
        );
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Export Products"
      primaryAction={{
        content: isExporting
          ? `Exporting ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}...`
          : `Export ${selectedProducts.length} Product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} Store${selectedStores.length !== 1 ? "s" : ""}`,
        onAction: handleExport,
        loading: isExporting,
        disabled: isExporting || selectedStores.length === 0,
      }}
      secondaryActions={[
        {
          content: "Close",
          onAction: onClose,
          disabled: isExporting,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              background: "#f6f6f7",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Exporting {selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                From: {currentStoreName}
              </Text>
            </div>
          </div>

          <div>
            <ChoiceList
              title="Select target stores"
              choices={storeChoices}
              selected={selectedStores}
              onChange={setSelectedStores}
              allowMultiple
            />
            {selectedStores.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <InlineStack gap="200" wrap>
                  {selectedStoreObjects.map((store) => (
                    <Badge key={store.id} tone="info">
                      {store.name || store.shop}
                    </Badge>
                  ))}
                </InlineStack>
              </div>
            )}
          </div>

          <div>
            <Select
              label="Product status"
              options={[
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
              ]}
              value={productStatus}
              onChange={(value) =>
                setProductStatus(value as "draft" | "active")
              }
            />
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};
