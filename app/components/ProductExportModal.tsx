import React, { useState } from "react";
import { Modal, Select } from "@shopify/polaris";

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
  toStore: string;
  setToStore: (id: string) => void;
  currentStoreName: string;
  onExportProduct: (
    product: any,
    toStore: string,
    status: "draft" | "active",
  ) => Promise<any>;
}

export const ProductExportModal: React.FC<ProductExportModalProps> = ({
  open,
  onClose,
  product,
  stores,
  toStore,
  setToStore,
  currentStoreName,
  onExportProduct,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [productStatus, setProductStatus] = useState<"draft" | "active">(
    "draft",
  );

  if (!product) return null;

  // Debug logging
  console.log("ProductExportModal - product:", product);
  console.log("ProductExportModal - product.title:", product.title);
  console.log("ProductExportModal - product.id:", product.id);

  const toStoreObj = stores.find((store) => store.id === toStore);
  const storeOptions = stores.map((store) => ({
    label: store.name || store.shop,
    value: store.id,
  }));
  const imageUrl = product.images?.edges?.[0]?.node?.url;

  // Handle case where product might be just an ID string
  const productTitle = (() => {
    if (typeof product === "string") {
      // If it's just a string (product ID), try to extract a readable name
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

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Export Product"
        primaryAction={{
          content: isExporting ? "Exporting..." : "Export Product",
          onAction: async () => {
            setIsExporting(true);
            try {
              const result = await onExportProduct(
                product,
                toStore,
                productStatus,
              );
              setIsExporting(false);
              if (
                typeof shopify !== "undefined" &&
                shopify.toast &&
                shopify.toast.show
              ) {
                const message = result?.message || "Product saved";
                shopify.toast.show(message, { duration: 5000 });
              }
              onClose();
            } catch (e) {
              setIsExporting(false);
              // Optionally show error feedback here
            }
          },
          loading: isExporting,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            content: "Close",
            onAction: onClose,
            disabled: isExporting,
          },
        ]}
      >
        {/* Product Card Section */}
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
        <Modal.Section>
          {/* FROM -> TO row with arrow */}
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
            {/* FROM (left) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
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
            {/* Arrow - horizontally centered with colored boxes */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                alignItems: "center",
                height: 48,
              }}
            >
              <span style={{ fontSize: 32, color: "#bbb", lineHeight: 1 }}>
                &rarr;
              </span>
            </div>
            {/* TO (right) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600, marginBottom: 8 }}>TO</span>
              {toStoreObj && (
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
                  {toStoreObj.name || toStoreObj.shop}
                </div>
              )}
            </div>
          </div>
        </Modal.Section>
        <Modal.Section>
          <div style={{ marginBottom: "1rem", width: "100%" }}>
            <Select
              label="Select target store"
              labelHidden
              options={storeOptions}
              value={toStore}
              onChange={setToStore}
            />
          </div>
          <div style={{ width: "100%" }}>
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
        </Modal.Section>
      </Modal>
    </>
  );
};
