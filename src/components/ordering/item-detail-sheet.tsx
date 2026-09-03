"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus, ImageOff } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { ClientMenuItem, CartLine } from "@/types/customer";

export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
  onAdd,
}: {
  item: ClientMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (line: Omit<CartLine, "key">) => void;
}) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  // Reset the form whenever a different item is opened. Done during render
  // (React's documented pattern for "adjust state when a prop changes")
  // rather than in an effect, since this component stays mounted across
  // item selections and an effect would cause an extra visible render.
  const [openedItemId, setOpenedItemId] = useState<string | null>(null);
  const currentItemId = item?.id ?? null;
  if (currentItemId !== openedItemId) {
    setOpenedItemId(currentItemId);
    if (item) {
      const defaultVariant = item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null;
      setVariantId(defaultVariant?.id ?? null);
      setSelectedOptions({});
      setQuantity(1);
      setNote("");
    }
  }

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    let price = item.salePrice ?? item.basePrice;
    const variant = item.variants.find((v) => v.id === variantId);
    if (variant) price += variant.priceDelta;
    for (const group of item.modifierGroups) {
      const chosen = selectedOptions[group.id] ?? [];
      for (const optId of chosen) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) price += opt.priceDelta;
      }
    }
    return price;
  }, [item, variantId, selectedOptions]);

  if (!item) return null;

  function toggleOption(groupId: string, optionId: string, max: number) {
    setSelectedOptions((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (max === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= max) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function canAdd() {
    if (!item) return false;
    for (const group of item.modifierGroups) {
      const chosen = selectedOptions[group.id] ?? [];
      if (group.required && chosen.length < Math.max(1, group.minSelect)) return false;
      if (chosen.length < group.minSelect) return false;
    }
    return true;
  }

  function handleAdd() {
    if (!item || !canAdd()) return;
    const variant = item.variants.find((v) => v.id === variantId);
    const modifierNames: string[] = [];
    const modifierOptionIds: string[] = [];
    for (const group of item.modifierGroups) {
      const chosen = selectedOptions[group.id] ?? [];
      for (const optId of chosen) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          modifierNames.push(opt.name);
          modifierOptionIds.push(opt.id);
        }
      }
    }
    onAdd({
      menuItemId: item.id,
      itemName: item.name,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      modifierOptionIds,
      modifierNames,
      unitPrice,
      quantity,
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-4">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={item.name} className="size-full object-cover" />
            ) : (
              <ImageOff className="size-8 text-muted-foreground" />
            )}
          </div>

          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}

          {item.soldOut ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              Món này hiện đã hết hàng
            </p>
          ) : (
            <>
              {item.variants.length > 0 && (
                <div className="space-y-2">
                  <Label>Phiên bản</Label>
                  <div className="flex flex-wrap gap-2">
                    {item.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariantId(v.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          variantId === v.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {v.name}
                        {v.priceDelta !== 0 && (
                          <span className="ml-1 opacity-80">
                            ({v.priceDelta > 0 ? "+" : ""}
                            {formatVnd(v.priceDelta)})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {item.modifierGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <Label>
                    {group.name}
                    {group.required && <span className="ml-1 text-destructive">*</span>}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {group.maxSelect > 1 ? `chọn tối đa ${group.maxSelect}` : "chọn 1"}
                    </span>
                  </Label>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const checked = (selectedOptions[group.id] ?? []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                        >
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleOption(group.id, opt.id, group.maxSelect)}
                            />
                            {opt.name}
                          </span>
                          {opt.priceDelta !== 0 && (
                            <span className="text-muted-foreground">+{formatVnd(opt.priceDelta)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Textarea
                  id="note"
                  placeholder='Ví dụ: "Không hành"'
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Số lượng</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Giảm số lượng"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-6 text-center font-medium">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Tăng số lượng"
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        {!item.soldOut && (
          <SheetFooter>
            <Button size="lg" className="w-full" disabled={!canAdd()} onClick={handleAdd}>
              Thêm vào giỏ · {formatVnd(unitPrice * quantity)}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
