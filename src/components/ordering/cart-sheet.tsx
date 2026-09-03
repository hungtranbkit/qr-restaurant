"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { UseCartReturn } from "./use-cart";

export function CartSheet({
  open,
  onOpenChange,
  cart,
  onSubmit,
  submitting,
  submitLabel = "GỬI ĐƠN",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: UseCartReturn;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Giỏ món ({cart.itemCount})</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-4">
          {cart.lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <ShoppingCart className="size-8" />
              <p className="text-sm">Giỏ món đang trống</p>
            </div>
          ) : (
            cart.lines.map((line) => (
              <div key={line.key} className="flex gap-3 rounded-lg border p-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">
                      {line.itemName}
                      {line.variantName && <span className="text-muted-foreground"> ({line.variantName})</span>}
                    </p>
                    <button
                      onClick={() => cart.removeLine(line.key)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Xoá món"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {line.modifierNames.length > 0 && (
                    <p className="text-xs text-muted-foreground">{line.modifierNames.join(", ")}</p>
                  )}
                  {line.note && <p className="text-xs italic text-muted-foreground">Ghi chú: {line.note}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7"
                        aria-label="Giảm số lượng"
                        onClick={() => cart.updateQuantity(line.key, line.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-5 text-center text-sm font-medium">{line.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7"
                        aria-label="Tăng số lượng"
                        onClick={() => cart.updateQuantity(line.key, line.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold">{formatVnd(line.unitPrice * line.quantity)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.lines.length > 0 && (
          <SheetFooter className="gap-3">
            <Separator />
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Tạm tính</span>
              <span>{formatVnd(cart.subtotal)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={onSubmit} disabled={submitting}>
              {submitting ? "Đang gửi..." : `${submitLabel} · ${formatVnd(cart.subtotal)}`}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
