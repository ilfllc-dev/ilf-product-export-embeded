import React, { useState, useMemo } from "react";
import {
  Card,
  IndexTable,
  TextField,
  Avatar,
  Text,
  useIndexResourceState,
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
  onSelectionChange?: (selected: string[]) => void;
  onBulkExport?: (selected: string[]) => void;
}

export const ProductResourceList: React.FC<ProductResourceListProps> = ({
  products,
  onProductClick,
  loading,
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

  const resourceName = { singular: "product", plural: "products" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredProducts);

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedResources);
    }
  }, [selectedResources, onSelectionChange]);

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
              disabled={selectedResources.length === 0}
              onClick={() => {
                if (selectedResources.length === 1) {
                  // If only one product is selected, open the modal for that product
                  const selectedProduct = filteredProducts.find(
                    (p) => p.id === selectedResources[0],
                  );
                  if (selectedProduct && onProductClick) {
                    onProductClick(selectedProduct);
                  }
                } else if (onBulkExport) {
                  // If multiple products are selected, use bulk export
                  onBulkExport(selectedResources);
                }
              }}
            >
              Export to Store
            </Button>
          </InlineStack>
        </InlineStack>
      </Box>
      <IndexTable
        resourceName={resourceName}
        itemCount={filteredProducts.length}
        selectedItemsCount={
          allResourcesSelected ? "All" : selectedResources.length
        }
        onSelectionChange={handleSelectionChange}
        headings={[
          { title: "Product" },
          { title: "Status" },
          { title: "Inventory" },
          { title: "Category" },
          { title: "Channels" },
        ]}
        loading={loading}
      >
        {filteredProducts.map((product, index) => (
          <IndexTable.Row
            id={product.id}
            key={product.id}
            selected={selectedResources.includes(product.id)}
            position={index}
            onClick={() => onProductClick(product)}
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
          </IndexTable.Row>
        ))}
      </IndexTable>
    </Card>
  );
};
