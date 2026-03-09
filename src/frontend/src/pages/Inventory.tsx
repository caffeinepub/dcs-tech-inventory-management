import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Filter, Package, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { InventoryItem } from "../backend";
import AddItemModal from "../components/AddItemModal";
import InventoryItemDetail from "../components/InventoryItemDetail";
import { useItemImage } from "../hooks/useItemImages";
import {
  getRoleString,
  useGetCallerUserProfile,
  useInventoryItems,
} from "../hooks/useQueries";

type StockFilter = "all" | "low-stock" | "in-stock";

function ItemThumbnail({
  itemId,
  blobId,
  name,
}: {
  itemId: bigint;
  blobId?: string;
  name: string;
}) {
  const { imageUrl } = useItemImage(itemId, blobId);
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-10 h-10 rounded-md object-cover border border-border flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-md border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
      <Package className="h-4 w-4 text-muted-foreground/60" />
    </div>
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string>;
  const { data: inventoryItems, isLoading } = useInventoryItems();
  const { data: userProfile } = useGetCallerUserProfile();

  const role = userProfile ? getRoleString(userProfile.role) : "guest";
  const isAdmin = role === "admin";

  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle URL params for pre-applied filters
  useEffect(() => {
    if (search?.filter === "low-stock") {
      setStockFilter("low-stock");
    }
    if (search?.itemId && inventoryItems) {
      const item = inventoryItems.find((i) => String(i.id) === search.itemId);
      if (item) setSelectedItem(item);
    }
  }, [search, inventoryItems]);

  const filteredItems = (inventoryItems || []).filter((item: InventoryItem) => {
    const isLowStock = item.quantity <= item.lowStockThreshold;
    if (stockFilter === "low-stock" && !isLowStock) return false;
    if (stockFilter === "in-stock" && isLowStock) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    navigate({
      to: "/inventory",
      search: { itemId: String(item.id) } as Record<string, string>,
    });
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    navigate({ to: "/inventory", search: {} });
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Inventory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {inventoryItems?.length ?? 0} items tracked
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2"
            data-ocid="inventory.primary_button"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
            data-ocid="inventory.search_input"
          />
        </div>
        <Select
          value={stockFilter}
          onValueChange={(v) => setStockFilter(v as StockFilter)}
        >
          <SelectTrigger
            className="w-full sm:w-44 bg-card border-border"
            data-ocid="inventory.select"
          >
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="inventory.loading_state">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16" data-ocid="inventory.empty_state">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-foreground font-semibold">No items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || stockFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first inventory item to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-ocid="inventory.table">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground w-14">
                    Image
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    SKU
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground hidden sm:table-cell">
                    Unit
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right hidden lg:table-cell">
                    Threshold
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: InventoryItem, idx: number) => {
                  const isLowStock = item.quantity <= item.lowStockThreshold;
                  return (
                    <TableRow
                      key={String(item.id)}
                      onClick={() => handleRowClick(item)}
                      data-ocid={`inventory.item.${idx + 1}`}
                      className="cursor-pointer border-border hover:bg-muted/40 transition-colors"
                    >
                      <TableCell>
                        <ItemThumbnail
                          itemId={item.id}
                          blobId={item.blobId ?? undefined}
                          name={item.name}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {item.sku}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="capitalize text-muted-foreground text-sm">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {String(item.quantity)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-muted-foreground text-sm">
                        {String(item.lowStockThreshold)}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge className="bg-warning/15 text-warning border border-warning/30 text-xs">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-success/15 text-success border border-success/30 text-xs">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <InventoryItemDetail item={selectedItem} onClose={handleCloseDetail} />
      )}

      {/* Add Item Modal */}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
