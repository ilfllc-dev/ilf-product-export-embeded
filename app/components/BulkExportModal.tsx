import React, { useEffect, useState } from "react";
import {
  Modal,
  Checkbox,
  Tooltip,
  Spinner,
  Text,
  InlineStack,
  Badge,
  Select,
  BlockStack,
  ProgressBar,
} from "@shopify/polaris";

interface Store {
  id: string;
  name: string | null;
  shop: string;
}

interface BulkExportModalProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: { id: string; title: string }[];
  stores: Store[];
  selectedStores: string[];
  setSelectedStores: (ids: string[]) => void;
  currentStoreName: string;
  mode?: "export" | "update";
  onBulkExport: (
    productIds: string[],
    toStores: string[],
    status: "draft" | "active",
    onProgress?: (progress: {
      completed: number;
      total: number;
      failed: number;
    }) => void,
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
  mode = "export",
  onBulkExport,
}) => {
  const isUpdate = mode === "update";

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    completed: number;
    total: number;
    failed: number;
  } | null>(null);
  const [productStatus, setProductStatus] = useState<"draft" | "active">("draft");

  // Update mode: per-store count of how many selected products already exist
  // "failed" = check couldn't run — treat all stores as open
  const [checkStatus, setCheckStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  // { [storeId]: number of selectedProducts that exist in that store }
  const [storeExistCounts, setStoreExistCounts] = useState<Record<string, number>>({});

  // Run existence check whenever the Update modal opens or selection changes
  useEffect(() => {
    if (!open || !isUpdate || selectedProducts.length === 0) return;

    let cancelled = false;
    setCheckStatus("loading");
    setStoreExistCounts({});

    (async () => {
      try {
        const res = await fetch("/app/api/check-export-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: selectedProducts,
            storeIds: stores.map((s) => s.id),
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const counts: Record<string, number> = {};
          for (const store of stores) {
            counts[store.id] = (data.results[store.id] as string[] | undefined)?.length ?? 0;
          }
          setStoreExistCounts(counts);
          // Auto-deselect only stores where 0 products exist
          setSelectedStores(stores.map(s => s.id).filter((id) => (counts[id] ?? 0) > 0));
          setCheckStatus("done");
        } else {
          // API error — fail open
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
  }, [open, isUpdate, selectedProducts.map(p => p.id).join(",")]);

  useEffect(() => {
    if (!open) {
      setIsExporting(false);
      setExportProgress(null);
      setCheckStatus("idle");
      setStoreExistCounts({});
    }
  }, [open]);

  const selectedStoreObjects = stores.filter((store) =>
    selectedStores.includes(store.id),
  );

  const handleStoreToggle = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStores([...selectedStores, storeId]);
    } else {
      setSelectedStores(selectedStores.filter((id) => id !== storeId));
    }
  };

  const handleExport = async () => {
    if (selectedStores.length === 0 || selectedProducts.length === 0) return;

    const productIds = selectedProducts.map((p) => p.id);
    setExportProgress({
      completed: 0,
      total: productIds.length * selectedStores.length,
      failed: 0,
    });
    setIsExporting(true);
    try {
      const result = await onBulkExport(
        productIds,
        selectedStores,
        productStatus,
        (progress) => setExportProgress(progress),
      );
      setIsExporting(false);
      if (typeof shopify !== "undefined" && shopify.toast?.show) {
        const fallback = isUpdate
          ? `Updated ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} in ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}`
          : `Exported ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}`;
        shopify.toast.show(result?.message || fallback, { duration: 5000 });
      }
      onClose();
    } catch (e: any) {
      setIsExporting(false);
      if (typeof shopify !== "undefined" && shopify.toast?.show) {
        shopify.toast.show(e.message || (isUpdate ? "Failed to update products" : "Failed to export products"), {
          duration: 5000,
          isError: true,
        });
      }
    }
  };

  const progressPercent =
    exportProgress && exportProgress.total > 0
      ? Math.round((exportProgress.completed / exportProgress.total) * 100)
      : 0;

  const total = selectedProducts.length;
  const checkFailed = checkStatus === "failed";

  const storeList = isUpdate ? (
    <BlockStack gap="200">
      <InlineStack gap="200" blockAlign="center">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          Select target stores
        </Text>
        {checkStatus === "loading" && <Spinner size="small" />}
      </InlineStack>
      {stores.map((store) => {
        const existing = storeExistCounts[store.id] ?? 0;
        const missing = total - existing;
        // Only block a store if the check succeeded AND confirmed 0 products exist there
        const noneExist = !checkFailed && checkStatus === "done" && existing === 0;
        const someExist = !checkFailed && checkStatus === "done" && existing > 0 && existing < total;
        const allExist = !checkFailed && checkStatus === "done" && existing === total;

        let badge: React.ReactNode = null;
        if (allExist) {
          badge = <Badge tone="success">{`${existing}/${total}`}</Badge>;
        } else if (someExist) {
          badge = (
            <Badge tone="warning">{`${existing}/${total} — ${missing} will be created`}</Badge>
          );
        } else if (noneExist) {
          badge = <Badge tone="critical">{`0/${total}`}</Badge>;
        }

        const checkbox = (
          <Checkbox
            key={store.id}
            id={store.id}
            label={
              <InlineStack gap="200" blockAlign="center">
                <span>{store.name || store.shop}</span>
                {badge}
              </InlineStack>
            }
            checked={selectedStores.includes(store.id)}
            disabled={noneExist || checkStatus === "loading"}
            onChange={(checked) => handleStoreToggle(store.id, checked)}
          />
        );

        if (noneExist) {
          return (
            <Tooltip
              key={store.id}
              content="No selected products exist in this store — use Export first"
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
    <Modal
      open={open}
      onClose={onClose}
      title={isUpdate ? "Bulk Update Products" : "Bulk Export Products"}
      primaryAction={{
        content: isExporting
          ? `${isUpdate ? "Updating" : "Exporting"} ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}...`
          : `${isUpdate ? "Update" : "Export"} ${selectedProducts.length} Product${selectedProducts.length !== 1 ? "s" : ""} to ${selectedStores.length} Store${selectedStores.length !== 1 ? "s" : ""}`,
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
                {isUpdate ? "Updating" : "Exporting"} {selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                From: {currentStoreName}
              </Text>
            </div>
          </div>

          <div>
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

          <div>
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
        </BlockStack>
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
  );
};
