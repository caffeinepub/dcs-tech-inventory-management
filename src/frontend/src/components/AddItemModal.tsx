import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAddInventoryItem } from "../hooks/useQueries";

interface AddItemModalProps {
  onClose: () => void;
}

export default function AddItemModal({ onClose }: AddItemModalProps) {
  const addItem = useAddInventoryItem();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    unit: "",
    lowStockThreshold: "",
    description: "",
    price: "",
    supplier: "",
    barcode: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addItem.mutateAsync({
      name: form.name,
      sku: form.sku,
      category: form.category,
      quantity: BigInt(Number.parseInt(form.quantity) || 0),
      unit: form.unit,
      lowStockThreshold: BigInt(Number.parseInt(form.lowStockThreshold) || 0),
      description: form.description,
      price: Number.parseFloat(form.price) || 0,
      supplier: form.supplier,
      expirationDate: null,
      barcode: form.barcode,
    });
    onClose();
  };

  const fields = [
    {
      id: "name",
      label: "Item Name *",
      placeholder: "e.g. iPhone 14 Pro",
      required: true,
    },
    {
      id: "sku",
      label: "SKU *",
      placeholder: "e.g. IPHONE-14P-BLK",
      required: true,
    },
    {
      id: "category",
      label: "Category *",
      placeholder: "e.g. electronics",
      required: true,
    },
    {
      id: "unit",
      label: "Unit *",
      placeholder: "e.g. units, pieces, boxes",
      required: true,
    },
    {
      id: "quantity",
      label: "Initial Quantity *",
      placeholder: "0",
      type: "number",
      required: true,
    },
    {
      id: "lowStockThreshold",
      label: "Low Stock Threshold *",
      placeholder: "10",
      type: "number",
      required: true,
    },
    { id: "price", label: "Price", placeholder: "0.00", type: "number" },
    { id: "supplier", label: "Supplier", placeholder: "Supplier name" },
    { id: "barcode", label: "Barcode", placeholder: "Barcode number" },
  ];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg w-full max-h-[90vh] flex flex-col p-0 gap-0 border-border"
        style={{
          backgroundColor: "oklch(var(--card))",
          color: "oklch(var(--card-foreground))",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-xl font-display font-bold text-card-foreground">
            Add New Item
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <form
            id="add-item-form"
            onSubmit={handleSubmit}
            className="px-6 py-4 space-y-4"
          >
            {fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label
                  htmlFor={field.id}
                  className="text-sm font-medium text-foreground"
                >
                  {field.label}
                </Label>
                <Input
                  id={field.id}
                  type={field.type || "text"}
                  value={form[field.id as keyof typeof form]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  min={field.type === "number" ? "0" : undefined}
                  step={field.id === "price" ? "0.01" : undefined}
                  className="bg-background border-border"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Item description..."
                rows={3}
                className="bg-background border-border resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={addItem.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-item-form"
            disabled={addItem.isPending}
          >
            {addItem.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Adding...
              </span>
            ) : (
              "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
