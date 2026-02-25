import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Package, History } from 'lucide-react';
import { useAdjustmentLogs, useAdjustInventory, useGetCallerUserProfile, getRoleString } from '../hooks/useQueries';
import { Variant_add_remove, type InventoryItem } from '../backend';

interface InventoryItemDetailProps {
  item: InventoryItem;
  onClose: () => void;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function InventoryItemDetail({ item, onClose }: InventoryItemDetailProps) {
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const { data: allLogs } = useAdjustmentLogs();
  const adjustInventory = useAdjustInventory();
  const { data: userProfile } = useGetCallerUserProfile();

  const role = userProfile ? getRoleString(userProfile.role) : 'guest';
  const canAdjust = role === 'admin' || role === 'staff';

  const itemLogs = (allLogs || [])
    .filter(log => String(log.itemId) === String(item.id))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const isLowStock = item.quantity <= item.lowStockThreshold;

  const handleAdjust = async (type: 'add' | 'remove') => {
    const amount = parseInt(adjustAmount);
    if (!amount || amount <= 0) return;

    await adjustInventory.mutateAsync({
      itemId: item.id,
      adjustmentType: type === 'add' ? Variant_add_remove.add : Variant_add_remove.remove,
      amount: BigInt(amount),
      notes: adjustNotes,
    });

    setAdjustAmount('');
    setAdjustNotes('');
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 border-border"
        style={{
          backgroundColor: 'oklch(var(--card))',
          color: 'oklch(var(--card-foreground))',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-display font-bold text-card-foreground">
                {item.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-muted-foreground">{item.sku}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm capitalize text-muted-foreground">{item.category}</span>
                {isLowStock ? (
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Low Stock</Badge>
                ) : (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">In Stock</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            {/* Item Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                <p className="text-2xl font-display font-bold text-foreground">{String(item.quantity)}</p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Low Stock Threshold</p>
                <p className="text-2xl font-display font-bold text-foreground">{String(item.lowStockThreshold)}</p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">per {item.unit}</p>
              </div>
            </div>

            {item.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-foreground">{item.description}</p>
              </div>
            )}

            {item.supplier && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier: </span>
                  <span className="text-foreground font-medium">{item.supplier}</span>
                </div>
                {item.barcode && (
                  <div>
                    <span className="text-muted-foreground">Barcode: </span>
                    <span className="text-foreground font-mono text-xs">{item.barcode}</span>
                  </div>
                )}
              </div>
            )}

            {/* Adjust Stock Controls */}
            {canAdjust && (
              <>
                <Separator className="bg-border" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Adjust Stock</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label htmlFor="adjust-amount" className="text-xs text-muted-foreground mb-1 block">
                          Amount
                        </Label>
                        <Input
                          id="adjust-amount"
                          type="number"
                          min="1"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="Enter quantity"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="adjust-notes" className="text-xs text-muted-foreground mb-1 block">
                        Notes (optional)
                      </Label>
                      <Textarea
                        id="adjust-notes"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        placeholder="Reason for adjustment..."
                        rows={2}
                        className="bg-background border-border resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAdjust('add')}
                        disabled={!adjustAmount || parseInt(adjustAmount) <= 0 || adjustInventory.isPending}
                        className="flex-1 bg-success/10 text-success hover:bg-success/20 border border-success/20"
                        variant="outline"
                      >
                        {adjustInventory.isPending ? (
                          <span className="w-4 h-4 border-2 border-success border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Add Stock
                      </Button>
                      <Button
                        onClick={() => handleAdjust('remove')}
                        disabled={!adjustAmount || parseInt(adjustAmount) <= 0 || adjustInventory.isPending}
                        className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                        variant="outline"
                      >
                        {adjustInventory.isPending ? (
                          <span className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Minus className="h-4 w-4 mr-1" />
                        )}
                        Remove Stock
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Adjustment History */}
            <Separator className="bg-border" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Adjustment History</h3>
                <Badge variant="secondary" className="text-xs">{itemLogs.length}</Badge>
              </div>
              {itemLogs.length === 0 ? (
                <div className="text-center py-6 bg-muted/20 rounded-lg">
                  <History className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No adjustments recorded yet</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-xs font-semibold text-muted-foreground">Date/Time</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">User</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">New Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemLogs.map(log => {
                        const isAdd = JSON.stringify(log.adjustmentType).includes('add');
                        return (
                          <TableRow key={String(log.id)} className="border-border">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-xs text-foreground max-w-[120px] truncate">
                              {log.adjustedByEmail || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {isAdd ? (
                                <Badge className="bg-success/10 text-success border-success/20 text-xs">Add</Badge>
                              ) : (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Remove</Badge>
                              )}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${isAdd ? 'text-success' : 'text-destructive'}`}>
                              {isAdd ? '+' : '-'}{String(log.amount)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-foreground">
                              {String(log.newQuantity)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[150px] truncate">
                              {log.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
