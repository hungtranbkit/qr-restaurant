"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/ordering/use-cart";
import { MenuBrowser } from "@/components/ordering/menu-browser";
import { ItemDetailSheet } from "@/components/ordering/item-detail-sheet";
import { CartSheet } from "@/components/ordering/cart-sheet";
import { formatVnd } from "@/lib/format";
import type { ClientMenuCategory, ClientMenuItem } from "@/types/customer";

export function OrderEntrySheet({
  open,
  onOpenChange,
  tableId,
  categories,
  onOrderSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  categories: ClientMenuCategory[];
  onOrderSent: () => void;
}) {
  const cart = useCart();
  const [selectedItem, setSelectedItem] = useState<ClientMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (cart.lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/tables/${tableId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.lines.map((l) => ({
            menuItemId: l.menuItemId,
            variantId: l.variantId,
            modifierOptionIds: l.modifierOptionIds,
            quantity: l.quantity,
            note: l.note,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể gửi bếp");
        return;
      }
      toast.success(`Đã gửi bếp — Order #${data.orderNumber}`);
      cart.clear();
      setCartOpen(false);
      onOpenChange(false);
      onOrderSent();
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b py-3">
          <SheetTitle>Thêm món</SheetTitle>
        </SheetHeader>
        <div className="relative h-[calc(100vh-57px)] overflow-y-auto pb-20">
          <MenuBrowser
            categories={categories}
            onSelectItem={setSelectedItem}
            stickyTop="0px"
            gridClassName="grid-cols-2 gap-3 sm:grid-cols-3"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t bg-background p-3">
          <Button size="lg" className="relative w-full" onClick={() => setCartOpen(true)} disabled={cart.itemCount === 0}>
            <ShoppingCart className="size-4" />
            {cart.itemCount > 0 ? `Xem giỏ (${cart.itemCount}) · ${formatVnd(cart.subtotal)}` : "Chọn món"}
          </Button>
        </div>

        <ItemDetailSheet
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(o) => !o && setSelectedItem(null)}
          onAdd={cart.addLine}
        />
        <CartSheet
          open={cartOpen}
          onOpenChange={setCartOpen}
          cart={cart}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="GỬI BẾP"
        />
      </SheetContent>
    </Sheet>
  );
}
