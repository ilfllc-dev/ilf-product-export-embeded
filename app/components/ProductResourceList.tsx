import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  IndexTable,
  TextField,
  Avatar,
  Text,
  Button,
  Badge,
  Icon,
  InlineStack,
  Popover,
  ActionList,
  Box,
  ButtonGroup,
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
  loading?: boolean;
  selectedProductIds: string[];
  onSelectionChange?: (selected: string[]) => void;
  onBulkExport?: (selected: string[]) => void;
}

export const ProductResourceList: React.FC<ProductResourceListProps> = ({
  products,
  onProductClick,
  loading,
  selectedProductIds,
  onSelectionChange,
  onBulkExport,
}) => {
  const [search, setSearch] = useState("");
  const [popoverActive, setPopoverActive] = useState(false);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
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
    (selectionType: any, isSelecting: boolean, selection: string | string[]) => {
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
        selection.forEach((id) => nextSelected.add(id));
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

  // Filter popover (placeholder for future filter logic)
  const filterPopover = (
    <Popover
      active={popoverActive}
      activator={
        <Button
          icon={FilterIcon}
          onClick={() => setPopoverActive((a) => !a)}
          accessibilityLabel="Filter"
        />
      }
      onClose={() => setPopoverActive(false)}
    >
      <ActionList
        items={[
          { content: "Active", onAction: () => {} },
          { content: "Draft", onAction: () => {} },
          { content: "Archived", onAction: () => {} },
        ]}
      />
    </Popover>
  );

  return (
    <Card>
      <Box paddingBlockEnd="400">
        <InlineStack gap="400" align="space-between">
          <ButtonGroup>
            <TextField
              label="Search products"
              labelHidden
              value={search}
              onChange={setSearch}
              autoComplete="off"
              placeholder="Search by title, vendor, or type..."
              prefix={<Icon source={SearchIcon} tone="base" />}
              disabled={loading}
              clearButton
              onClearButtonClick={() => setSearch("")}
            />
            {filterPopover}
          </ButtonGroup>
          <InlineStack gap="200" align="center">
            <Text as="span" variant="bodySm">
              {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""}
            </Text>
            <Button
              variant="primary"
              disabled={selectedProductIds.length === 0}
              onClick={() => {
                if (selectedProductIds.length === 1) {
                  // FIX: Use the global selection when a search filter is active.
                  const selectedProduct = products.find(
                    (p) => p.id === selectedProductIds[0],
                  );
                  if (selectedProduct && onProductClick) {
                    onProductClick(selectedProduct);
                  }
                } else if (onBulkExport) {
                  // If multiple products are selected, use bulk export
                  onBulkExport(selectedProductIds);
                }
              }}
            >
              Export selected
              {selectedProductIds.length > 0
                ? ` (${selectedProductIds.length})`
                : ""}
            </Button>
          </InlineStack>
        </InlineStack>
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
                  product.status === "Active"
                    ? "success"
                    : product.status === "Draft"
                      ? "warning"
                      : undefined
                }
              >
                {product.status}
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
              <Button onClick={() => onProductClick(product)}>Export</Button>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    </Card>
  );
};
