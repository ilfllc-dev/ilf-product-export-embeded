import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  IndexTable,
  TextField,
  Avatar,
  Text,
  Button,
  Badge,
  Icon,
  InlineStack,
  Box,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { SearchIcon, FilterIcon } from "@shopify/polaris-icons";

interface ProductResourceListProps {
  products: Array<{
    id: string;
    title: string;
    status: string;
    totalInventory: number;
    vendor?: string;
    productType?: string;
    imageUrl?: string;
    category?: string;
    channels?: number;
  }>;
  onProductClick: (product: any) => void;
  onUpdateClick?: (product: any) => void;
  loading?: boolean;
  selectedProductIds: string[];
  onSelectionChange?: (selected: string[]) => void;
  onBulkExport?: (selected: string[]) => void;
  onBulkUpdate?: (selected: string[]) => void;
  initialSearchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const ProductResourceList: React.FC<ProductResourceListProps> = ({
  products,
  onProductClick,
  onUpdateClick,
  loading,
  selectedProductIds,
  onSelectionChange,
  onBulkExport,
  onBulkUpdate,
  initialSearchValue = "",
  onSearchChange,
}) => {
  const [search, setSearch] = useState(initialSearchValue);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterPopoverActive, setFilterPopoverActive] = useState(false);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = product.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === null || product.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [products, search, statusFilter],
  );

  // FIX: Track visible IDs so selection persists across searches.
  const visibleProductIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );
  const visibleSelectedCount = useMemo(
    () =>
      filteredProducts.filter((product) =>
        selectedProductIds.includes(product.id),
      ).length,
    [filteredProducts, selectedProductIds],
  );
  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleSelectedCount === visibleProductIds.length;

  const resourceName = { singular: "product", plural: "products" };
  const handleSelectionChange = useCallback(
    (selectionType: any, isSelecting: boolean, selection?: string | string[] | [number, number]) => {
      if (!onSelectionChange) {
        return;
      }

      const normalizedSelectionType =
        typeof selectionType === "string"
          ? selectionType.toLowerCase()
          : selectionType;
      const nextSelected = new Set(selectedProductIds);
      const removeVisible = () => {
        visibleProductIds.forEach((id) => nextSelected.delete(id));
      };
      const addVisible = () => {
        visibleProductIds.forEach((id) => nextSelected.add(id));
      };

      // FIX: Merge selection changes from the filtered view into global selection.
      if (normalizedSelectionType === "all" || normalizedSelectionType === "page") {
        if (isSelecting) {
          addVisible();
        } else {
          removeVisible();
        }
      } else if (normalizedSelectionType === "single") {
        const id = selection as string;
        if (isSelecting) {
          nextSelected.add(id);
        } else {
          nextSelected.delete(id);
        }
      } else if (Array.isArray(selection)) {
        removeVisible();
        selection.forEach((id) => nextSelected.add(String(id)));
      } else if (typeof selection === "string") {
        if (isSelecting) {
          nextSelected.add(selection);
        } else {
          nextSelected.delete(selection);
        }
      }

      onSelectionChange(Array.from(nextSelected));
    },
    [onSelectionChange, selectedProductIds, visibleProductIds],
  );

  return (
    <>
      <Box paddingBlockEnd="400">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Search products"
                labelHidden
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  if (onSearchChange) {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => onSearchChange(value), 400);
                  }
                }}
                autoComplete="off"
                placeholder="Search by title, vendor, or type..."
                prefix={<Icon source={SearchIcon} tone="base" />}
                disabled={loading}
                clearButton
                onClearButtonClick={() => {
                  setSearch("");
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  onSearchChange?.("");
                }}
              />
            </div>
            <Popover
              active={filterPopoverActive}
              activator={
                <Button
                  icon={FilterIcon}
                  onClick={() => setFilterPopoverActive((v) => !v)}
                  accessibilityLabel="Filter by status"
                  pressed={statusFilter !== null}
                />
              }
              onClose={() => setFilterPopoverActive(false)}
            >
              <ActionList
                items={[
                  {
                    content: "All",
                    onAction: () => { setStatusFilter(null); setFilterPopoverActive(false); },
                    active: statusFilter === null,
                  },
                  {
                    content: "Active",
                    onAction: () => { setStatusFilter("active"); setFilterPopoverActive(false); },
                    active: statusFilter === "active",
                  },
                  {
                    content: "Draft",
                    onAction: () => { setStatusFilter("draft"); setFilterPopoverActive(false); },
                    active: statusFilter === "draft",
                  },
                  {
                    content: "Archived",
                    onAction: () => { setStatusFilter("archived"); setFilterPopoverActive(false); },
                    active: statusFilter === "archived",
                  },
                ]}
              />
            </Popover>
          </div>
          <InlineStack gap="300" align="center" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
            </Text>
            <Button
              variant="primary"
              disabled={selectedProductIds.length === 0}
              onClick={() => {
                if (selectedProductIds.length === 1) {
                  const selectedProduct = products.find(
                    (p) => p.id === selectedProductIds[0],
                  );
                  if (selectedProduct && onProductClick) {
                    onProductClick(selectedProduct);
                  }
                } else if (onBulkExport) {
                  onBulkExport(selectedProductIds);
                }
              }}
            >
              Export selected{selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
            </Button>
            <Button
              disabled={selectedProductIds.length === 0}
              onClick={() => {
                if (selectedProductIds.length === 1) {
                  const selectedProduct = products.find(
                    (p) => p.id === selectedProductIds[0],
                  );
                  if (selectedProduct && onUpdateClick) {
                    onUpdateClick(selectedProduct);
                  }
                } else if (onBulkUpdate) {
                  onBulkUpdate(selectedProductIds);
                }
              }}
            >
              Update selected{selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
            </Button>
          </InlineStack>
        </div>
      </Box>
      <IndexTable
        resourceName={resourceName}
        itemCount={filteredProducts.length}
        selectedItemsCount={
          allVisibleSelected ? "All" : visibleSelectedCount
        }
        onSelectionChange={handleSelectionChange}
        headings={[
          { title: "Product" },
          { title: "Status" },
          { title: "Inventory" },
          { title: "Category" },
          { title: "Channels" },
          { title: "Actions" },
        ]}
        loading={loading}
      >
        {filteredProducts.map((product, index) => (
          <IndexTable.Row
            id={product.id}
            key={product.id}
            selected={selectedProductIds.includes(product.id)}
            position={index}
          >
            <IndexTable.Cell>
              <InlineStack gap="200" align="start">
                <Avatar source={product.imageUrl} name={product.title} />
                <Text variant="bodyMd" fontWeight="bold" as="span">
                  {product.title}
                </Text>
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge
                tone={
                  product.status.toUpperCase() === "ACTIVE"
                    ? "success"
                    : product.status.toUpperCase() === "DRAFT"
                      ? "warning"
                      : undefined
                }
              >
                {product.status.charAt(0).toUpperCase() + product.status.slice(1).toLowerCase()}
              </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span">{product.totalInventory}</Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span">
                {product.category || product.productType || "-"}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span">{product.channels ?? 1}</Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="200">
                <Button onClick={() => onProductClick(product)}>Export</Button>
                <Button onClick={() => onUpdateClick?.(product)}>Update</Button>
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    </>
  );
};
