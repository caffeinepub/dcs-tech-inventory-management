import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  ImagePlus,
  Loader2,
  Minus,
  Package,
  Plus,
} from "lucide-react";
import { useRef, useState } from "react";
import { type InventoryItem, Variant_add_remove } from "../backend";
import { useItemImage } from "../hooks/useItemImages";
import {
  getRoleString,
  useAdjustInventory,
  useAdjustmentLogs,
  useGetCallerUserProfile,
} from "../hooks/useQueries";

interface InventoryItemDetailProps {
  item: InventoryItem;
  onClose: () => void;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function InventoryItemDetail({
  item,
  onClose,
}: InventoryItemDetailProps) {
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const { data: allLogs } = useAdjustmentLogs();
  const adjustInventory = useAdjustInventory();
  const { data: userProfile } = useGetCallerUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = userProfile ? getRoleString(userProfile.role) : "guest";
  const canAdjust = role === "admin" || role === "staff";

  const { imageUrl, uploadImage, isUploading } = useItemImage(
    item.id,
    item.blobId ?? undefined,
  );

  const itemLogs = (allLogs || [])
    .filter((log) => String(log.itemId) === String(item.id))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const isLowStock = item.quantity <= item.lowStockThreshold;

  const handleAdjust = async (type: "add" | "remove") => {
    const amount = Number.parseInt(adjustAmount);
    if (!amount || amount <= 0) return;

    await adjustInventory.mutateAsync({
      itemId: item.id,
      adjustmentType:
        type === "add" ? Variant_add_remove.add : Variant_add_remove.remove,
      amount: BigInt(amount),
      notes: adjustNotes,
    });

    setAdjustAmount("");
    setAdjustNotes("");
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 border-border"
        style={{
          backgroundColor: "oklch(var(--card))",
          color: "oklch(var(--card-foreground))",
        }}
        data-ocid="inventory.item.dialog"
      >
        {/* Dialog header with tinted band */}
        <DialogHeader
          className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0"
          style={{ backgroundColor: "oklch(var(--muted) / 0.4)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-display font-bold text-card-foreground">
                {item.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                  {item.sku}
                </span>
                <span className="text-muted-foreground text-xs">&middot;</span>
                <span className="text-sm capitalize text-muted-foreground">
                  {item.category}
                </span>
                {isLowStock ? (
                  <Badge className="bg-warning/15 text-warning border border-warning/30 text-xs">
                    Low Stock
                  </Badge>
                ) : (
                  <Badge className="bg-success/15 text-success border border-success/30 text-xs">
                    In Stock
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Item Image */}
            <div>
              <div
                data-ocid="inventory.item.canvas_target"
                className="w-full h-52 rounded-xl overflow-hidden border border-border flex items-center justify-center"
                style={{ backgroundColor: "oklch(var(--muted))" }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
                      <Package className="h-8 w-8 opacity-40" />
                    </div>
                    <span className="text-xs font-medium opacity-50">
                      No image available
                    </span>
                  </div>
                )}
              </div>

              {canAdjust && (
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2 text-xs border-border hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                    data-ocid="inventory.item.upload_button"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {isUploading
                      ? "Uploading..."
                      : imageUrl
                        ? "Replace Image"
                        : "Upload Image"}
                  </Button>
                </div>
              )}
            </div>

            {/* Item Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                className="rounded-xl p-3 border border-border"
                style={{ backgroundColor: "oklch(var(--primary) / 0.07)" }}
              >
                <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                <p
                  className="text-2xl font-display font-bold"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  {String(item.quantity)}
                </p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
              <div
                className="rounded-xl p-3 border border-border"
                style={{
                  backgroundColor: isLowStock
                    ? "oklch(var(--warning) / 0.07)"
                    : "oklch(var(--muted) / 0.5)",
                }}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  Low Stock Threshold
                </p>
                <p
                  className="text-2xl font-display font-bold"
                  style={{
                    color: isLowStock
                      ? "oklch(var(--warning))"
                      : "oklch(var(--foreground))",
                  }}
                >
                  {String(item.lowStockThreshold)}
                </p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
              <div
                className="rounded-xl p-3 border border-border col-span-2 sm:col-span-1"
                style={{ backgroundColor: "oklch(var(--success) / 0.07)" }}
              >
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p
                  className="text-2xl font-display font-bold"
                  style={{ color: "oklch(var(--success))" }}
                >
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">per {item.unit}</p>
              </div>
            </div>

            {item.description && (
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Description
                </p>
                <p className="text-sm text-foreground">{item.description}</p>
              </div>
            )}

            {item.supplier && (
              <div className="flex items-center gap-4 text-sm bg-muted/20 rounded-lg px-3 py-2 border border-border/50">
                <div>
                  <span className="text-muted-foreground">Supplier: </span>
                  <span className="text-foreground font-medium">
                    {item.supplier}
                  </span>
                </div>
                {item.barcode && (
                  <div>
                    <span className="text-muted-foreground">Barcode: </span>
                    <span className="text-foreground font-mono text-xs">
                      {item.barcode}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Adjust Stock Controls */}
            {canAdjust && (
              <>
                <Separator className="bg-border" />
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                      <Package className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Adjust Stock
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label
                          htmlFor="adjust-amount"
                          className="text-xs text-muted-foreground mb-1 block"
                        >
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
                          data-ocid="inventory.item.input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="adjust-notes"
                        className="text-xs text-muted-foreground mb-1 block"
                      >
                        Notes (optional)
                      </Label>
                      <Textarea
                        id="adjust-notes"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        placeholder="Reason for adjustment..."
                        rows={2}
                        className="bg-background border-border resize-none"
                        data-ocid="inventory.item.textarea"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAdjust("add")}
                        disabled={
                          !adjustAmount ||
                          Number.parseInt(adjustAmount) <= 0 ||
                          adjustInventory.isPending
                        }
                        className="flex-1 bg-success/15 text-success hover:bg-success/25 border border-success/30"
                        variant="outline"
                        data-ocid="inventory.item.primary_button"
                      >
                        {adjustInventory.isPending ? (
                          <span className="w-4 h-4 border-2 border-success border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Add Stock
                      </Button>
                      <Button
                        onClick={() => handleAdjust("remove")}
                        disabled={
                          !adjustAmount ||
                          Number.parseInt(adjustAmount) <= 0 ||
                          adjustInventory.isPending
                        }
                        className="flex-1 bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                        variant="outline"
                        data-ocid="inventory.item.secondary_button"
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
                <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                  <History className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Adjustment History
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {itemLogs.length}
                </Badge>
              </div>
              {itemLogs.length === 0 ? (
                <div
                  className="text-center py-6 bg-muted/20 rounded-xl border border-border/50"
                  data-ocid="inventory.item.history.empty_state"
                >
                  <History className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No adjustments recorded yet
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Date/Time
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          User
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                          New Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemLogs.map((log, idx) => {
                        const isAdd = JSON.stringify(
                          log.adjustmentType,
                        ).includes("add");
                        return (
                          <TableRow
                            key={String(log.id)}
                            data-ocid={`inventory.item.history.item.${idx + 1}`}
                            className="border-border hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-xs text-foreground max-w-[120px] truncate">
                              {log.adjustedByEmail || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {isAdd ? (
                                <Badge className="bg-success/15 text-success border border-success/30 text-xs">
                                  Add
                                </Badge>
                              ) : (
                                <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs">
                                  Remove
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right text-sm font-semibold ${
                                isAdd ? "text-success" : "text-destructive"
                              }`}
                            >
                              {isAdd ? "+" : "-"}
                              {String(log.amount)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-foreground">
                              {String(log.newQuantity)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[150px] truncate">
                              {log.notes || "\u2014"}
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
