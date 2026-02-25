import { useState, useEffect } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Plus, Search, Package, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventoryItems, useGetCallerUserProfile, getRoleString } from '../hooks/useQueries';
import type { InventoryItem } from '../backend';
import InventoryItemDetail from '../components/InventoryItemDetail';
import AddItemModal from '../components/AddItemModal';

type StockFilter = 'all' | 'low-stock' | 'in-stock';

export default function Inventory() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string>;
  const { data: inventoryItems, isLoading } = useInventoryItems();
  const { data: userProfile } = useGetCallerUserProfile();

  const role = userProfile ? getRoleString(userProfile.role) : 'guest';
  const isAdmin = role === 'admin';

  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle URL params for pre-applied filters
  useEffect(() => {
    if (search?.filter === 'low-stock') {
      setStockFilter('low-stock');
    }
    if (search?.itemId && inventoryItems) {
      const item = inventoryItems.find(i => String(i.id) === search.itemId);
      if (item) setSelectedItem(item);
    }
  }, [search, inventoryItems]);

  const filteredItems = (inventoryItems || []).filter((item: InventoryItem) => {
    const isLowStock = item.quantity <= item.lowStockThreshold;
    if (stockFilter === 'low-stock' && !isLowStock) return false;
    if (stockFilter === 'in-stock' && isLowStock) return false;
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
    navigate({ to: '/inventory', search: { itemId: String(item.id) } as Record<string, string> });
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    navigate({ to: '/inventory', search: {} });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {inventoryItems?.length ?? 0} items tracked
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
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
            className="pl-9"
          />
        </div>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
          <SelectTrigger className="w-full sm:w-44">
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
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || stockFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first inventory item to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">SKU</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">Category</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Quantity</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="font-semibold text-foreground text-right hidden lg:table-cell">Threshold</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: InventoryItem) => {
                  const isLowStock = item.quantity <= item.lowStockThreshold;
                  return (
                    <TableRow
                      key={String(item.id)}
                      onClick={() => handleRowClick(item)}
                      className="cursor-pointer border-border hover:bg-accent/50 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="capitalize text-muted-foreground text-sm">{item.category}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {String(item.quantity)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.unit}</TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-muted-foreground text-sm">
                        {String(item.lowStockThreshold)}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">
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
        <InventoryItemDetail
          item={selectedItem}
          onClose={handleCloseDetail}
        />
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
