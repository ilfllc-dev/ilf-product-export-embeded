import React, { useEffect, useState } from "react";
import {
  Modal,
  Select,
  Checkbox,
  Tooltip,
  Spinner,
  Text,
  InlineStack,
  Badge,
  ProgressBar,
  BlockStack,
} from "@shopify/polaris";

interface Store {
  id: string;
  name: string | null;
  shop: string;
}

interface ProductExportModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
  stores: Store[];
  selectedStores: string[];
  setSelectedStores: (ids: string[]) => void;
  currentStoreName: string;
  mode?: "export" | "update";
  onExportProduct: (
    product: any,
    toStores: string[],
    status: "draft" | "active",
    onProgress?: (progress: {
      completed: number;
      total: number;
      failed: number;
    }) => void,
  ) => Promise<any>;
}

export const ProductExportModal: React.FC<ProductExportModalProps> = ({
  open,
  onClose,
  product,
  stores,
  selectedStores,
  setSelectedStores,
  currentStoreName,
  mode = "export",
  onExportProduct,
}) => {
  const isUpdate = mode === "update";

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    completed: number;
    total: number;
    failed: number;
  } | null>(null);
  const [productStatus, setProductStatus] = useState<"draft" | "active">("draft");

  // Update mode: track which stores already have this product
  // "unchecked" = check not run yet or failed — treat all stores as available (fail open)
  const [checkStatus, setCheckStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [existsInStores, setExistsInStores] = useState<Set<string>>(new Set());

  // Run existence check whenever the Update modal opens for a new product
  useEffect(() => {
    if (!open || !isUpdate || !product?.id) return;

    let cancelled = false;
    setCheckStatus("loading");
    setExistsInStores(new Set());

    const productTitle =
      typeof product === "string" ? "" : (product.title || "");

    (async () => {
      try {
        const res = await fetch("/app/api/check-export-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: [{ id: product.id, title: productTitle }],
            storeIds: stores.map((s) => s.id),
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const found = new Set<string>(
            Object.entries(data.results as Record<string, string[]>)
              .filter(([, ids]) => ids.length > 0)
              .map(([storeId]) => storeId),
          );
          setExistsInStores(found);
          // Auto-deselect stores where the product doesn't exist
          setSelectedStores(stores.map(s => s.id).filter((id) => found.has(id)));
          setCheckStatus("done");
        } else {
          // API error — fail open (all stores remain selectable)
          if (!cancelled) setCheckStatus("failed");
        }
      } catch {
        // Network error — fail open
        if (!cancelled) setCheckStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUpdate, product?.id]);

  useEffect(() => {
    if (!open) {
      setIsExporting(false);
      setExportProgress(null);
      setCheckStatus("idle");
      setExistsInStores(new Set());
    }
  }, [open]);

  // When check fails we treat every store as available
  const checkFailed = checkStatus === "failed";

  if (!product) return null;

  const selectedStoreObjects = stores.filter((store) =>
    selectedStores.includes(store.id),
  );
  const imageUrl = product.images?.edges?.[0]?.node?.url;

  const productTitle = (() => {
    if (typeof product === "string") {
      if (product.includes("gid://shopify/Product/")) {
        return `Product ${product.split("/").pop()}`;
      }
      return product;
    }
    return product.title || product.id || "Unknown Product";
  })();

  const productVendor = product.vendor || "";
  const productType = product.productType || "";
  const productPrice = product.variants?.edges?.[0]?.node?.price || "";

  const progressPercent =
    exportProgress && exportProgress.total > 0
      ? Math.round((exportProgress.completed / exportProgress.total) * 100)
      : 0;

  const handleStoreToggle = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStores([...selectedStores, storeId]);
    } else {
      setSelectedStores(selectedStores.filter((id) => id !== storeId));
    }
  };

  const storeList = isUpdate ? (
    <BlockStack gap="200">
      <InlineStack gap="200" blockAlign="center">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          Select target stores
        </Text>
        {checkStatus === "loading" && <Spinner size="small" />}
      </InlineStack>
      {stores.map((store) => {
        // During loading or on check failure: treat all stores as available
        const exists =
          checkFailed ||
          checkStatus === "loading" ||
          checkStatus === "idle" ||
          existsInStores.has(store.id);
        const checkbox = (
          <Checkbox
            key={store.id}
            id={store.id}
            label={store.name || store.shop}
            checked={selectedStores.includes(store.id)}
            disabled={!exists}
            onChange={(checked) => handleStoreToggle(store.id, checked)}
          />
        );
        if (!exists) {
          return (
            <Tooltip
              key={store.id}
              content="Not yet exported to this store — use Export instead"
              activatorWrapper="div"
            >
              <div style={{ cursor: "not-allowed", opacity: 0.5 }}>{checkbox}</div>
            </Tooltip>
          );
        }
        return <div key={store.id}>{checkbox}</div>;
      })}
    </BlockStack>
  ) : (
    <BlockStack gap="200">
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        Select target stores
      </Text>
      {stores.map((store) => (
        <div key={store.id}>
          <Checkbox
            id={store.id}
            label={store.name || store.shop}
            checked={selectedStores.includes(store.id)}
            onChange={(checked) => handleStoreToggle(store.id, checked)}
          />
        </div>
      ))}
    </BlockStack>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isUpdate ? "Update Product" : "Export Product"}
        primaryAction={{
          content: isExporting
            ? `${isUpdate ? "Updating" : "Exporting"} to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}...`
            : `${isUpdate ? "Update" : "Export"} to ${selectedStores.length} Store${selectedStores.length !== 1 ? "s" : ""}`,
          onAction: async () => {
            if (selectedStores.length === 0) return;
            setExportProgress({ completed: 0, total: selectedStores.length, failed: 0 });
            setIsExporting(true);
            try {
              const result = await onExportProduct(
                product,
                selectedStores,
                productStatus,
                (progress) => setExportProgress(progress),
              );
              setIsExporting(false);
              if (typeof shopify !== "undefined" && shopify.toast?.show) {
                const fallback = isUpdate
                  ? `Product updated in ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}`
                  : `Product exported to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}`;
                shopify.toast.show(result?.message || fallback, { duration: 5000 });
              }
              onClose();
            } catch (e: any) {
              setIsExporting(false);
              if (typeof shopify !== "undefined" && shopify.toast?.show) {
                shopify.toast.show(
                  e?.message || (isUpdate ? "Update failed" : "Export failed"),
                  { duration: 5000, isError: true },
                );
              }
            }
          },
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
        {/* Product Card */}
        <Modal.Section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              background: "#f6f6f7",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              marginBottom: 24,
              width: "100%",
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={productTitle}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                  background: "#fff",
                  border: "1px solid #eee",
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
                {productTitle}
              </div>
              {productVendor && (
                <div style={{ color: "#888", fontSize: 14, marginBottom: 2 }}>
                  By {productVendor}
                </div>
              )}
              {productType && (
                <div style={{ color: "#888", fontSize: 14, marginBottom: 2 }}>
                  {productType}
                </div>
              )}
              {productPrice && (
                <div style={{ color: "#222", fontWeight: 600, fontSize: 16 }}>
                  ${productPrice}
                </div>
              )}
            </div>
          </div>
        </Modal.Section>

        {/* FROM → TO */}
        <Modal.Section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 0,
              width: "100%",
              gap: 48,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontWeight: 600, marginBottom: 8 }}>FROM</span>
              <div
                style={{
                  background: "#FFF7E0",
                  padding: "8px 24px",
                  borderRadius: 8,
                  fontWeight: 600,
                  minWidth: 180,
                  maxWidth: 240,
                  width: 240,
                  textAlign: "center",
                  fontSize: 16,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentStoreName}
              </div>
            </div>
            <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", height: 48 }}>
              <span style={{ fontSize: 32, color: "#bbb", lineHeight: 1 }}>&rarr;</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600, marginBottom: 8 }}>TO</span>
              {selectedStores.length === 0 ? (
                <div
                  style={{
                    background: "#f6f6f7",
                    padding: "8px 24px",
                    borderRadius: 8,
                    minWidth: 180,
                    maxWidth: 240,
                    width: 240,
                    textAlign: "center",
                    fontSize: 14,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                  }}
                >
                  Select stores
                </div>
              ) : selectedStores.length === 1 ? (
                <div
                  style={{
                    background: "#FFE3E3",
                    padding: "8px 24px",
                    borderRadius: 8,
                    fontWeight: 600,
                    minWidth: 180,
                    maxWidth: 240,
                    width: 240,
                    textAlign: "center",
                    fontSize: 16,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedStoreObjects[0]?.name || selectedStoreObjects[0]?.shop}
                </div>
              ) : (
                <div
                  style={{
                    background: "#FFE3E3",
                    padding: "8px 24px",
                    borderRadius: 8,
                    fontWeight: 600,
                    minWidth: 180,
                    maxWidth: 240,
                    width: 240,
                    textAlign: "center",
                    fontSize: 16,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedStores.length} stores
                </div>
              )}
            </div>
          </div>
        </Modal.Section>

        {/* Store selector + status */}
        <Modal.Section>
          <div style={{ marginBottom: "1rem", width: "100%" }}>
            {storeList}
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
          <div style={{ width: "100%" }}>
            <Select
              label="Product status"
              options={[
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
              ]}
              value={productStatus}
              onChange={(value) => setProductStatus(value as "draft" | "active")}
            />
          </div>
        </Modal.Section>

        {isExporting && exportProgress && (
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                {isUpdate ? "Updated" : "Exported"} {exportProgress.completed} of{" "}
                {exportProgress.total} item{exportProgress.total !== 1 ? "s" : ""}
              </Text>
              <ProgressBar progress={progressPercent} size="small" />
              {exportProgress.failed > 0 && (
                <Text as="p" variant="bodySm" tone="critical">
                  {exportProgress.failed} failed
                </Text>
              )}
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </>
  );
};
