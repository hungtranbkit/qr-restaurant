"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Bell, Receipt, ClipboardList, UtensilsCrossed } from "lucide-react";
import { useSse } from "@/hooks/use-sse";
import { useCart } from "@/components/ordering/use-cart";
import { MenuBrowser } from "@/components/ordering/menu-browser";
import { ItemDetailSheet } from "@/components/ordering/item-detail-sheet";
import { CartSheet } from "@/components/ordering/cart-sheet";
import { RequestSheet } from "./components/request-sheet";
import { PaymentSheet } from "./components/payment-sheet";
import { TrackingView } from "./components/tracking-view";
import { TABLE_STATUS_LABEL } from "@/lib/status-labels";
import type { ClientMenuCategory, ClientMenuItem, ClientTableSession } from "@/types/customer";

export function OrderPageClient({
  token,
  table,
  restaurantName,
  categories,
  initialSession,
}: {
  token: string;
  table: { id: string; code: string; name: string; seats: number; status: string };
  restaurantName: string;
  categories: ClientMenuCategory[];
  initialSession: ClientTableSession | null;
}) {
  const [menu, setMenu] = useState(categories);
  const [session, setSession] = useState(initialSession);
  const [tableStatus, setTableStatus] = useState(table.status);
  const [tab, setTab] = useState<"menu" | "tracking">("menu");
  const [selectedItem, setSelectedItem] = useState<ClientMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cart = useCart();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/${token}/session`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSession(data.session);
      setTableStatus(data.table.status);
    } catch {
      // best-effort; SSE + user-triggered refetches will catch up
    }
  }, [token]);

  useSse(`/api/customer/${token}/events`, (type, data) => {
    if (type === "MENU_ITEM_UPDATED" && data && typeof data === "object") {
      const payload = data as { payload?: { menuItemId?: string; soldOut?: boolean; active?: boolean } };
      const p = payload.payload;
      if (p?.menuItemId) {
        setMenu((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === p.menuItemId ? { ...item, soldOut: p.soldOut ?? item.soldOut } : item,
            ),
          })),
        );
      }
      return;
    }
    refreshSession();
  });

  async function handleSubmitOrder() {
    if (cart.lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/${token}/orders`, {
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
        toast.error(data.error ?? "Không thể gửi đơn");
        return;
      }
      toast.success(`Đã gửi đơn #${data.orderNumber}`);
      cart.clear();
      setCartOpen(false);
      setTab("tracking");
      refreshSession();
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequest(type: string, note?: string) {
    try {
      const res = await fetch(`/api/customer/${token}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Không thể gửi yêu cầu");
        return;
      }
      toast.success("Đã gửi yêu cầu, nhân viên sẽ đến ngay");
      refreshSession();
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
    }
  }

  async function handlePaymentRequest(method: string) {
    try {
      const res = await fetch(`/api/customer/${token}/payment-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể gửi yêu cầu thanh toán");
        return;
      }
      toast.success("Đã gửi yêu cầu thanh toán");
      refreshSession();
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background pb-24">
      <header className="sticky top-0 z-20 space-y-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{restaurantName}</p>
              <p className="text-xs text-muted-foreground">Bàn {table.code}</p>
            </div>
          </div>
          <Badge variant="outline">{TABLE_STATUS_LABEL[tableStatus] ?? tableStatus}</Badge>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          <button
            onClick={() => setTab("menu")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
              tab === "menu" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Thực đơn
          </button>
          <button
            onClick={() => setTab("tracking")}
            className={`relative flex-1 rounded-md py-1.5 font-medium transition-colors ${
              tab === "tracking" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Đơn của bạn
            {session && session.orders.length > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {session.orders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        {tab === "menu" ? (
          <MenuBrowser categories={menu} onSelectItem={setSelectedItem} />
        ) : (
          <TrackingView session={session} />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-lg items-center gap-2 border-t bg-background p-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setRequestOpen(true)}>
          <Bell className="size-4" /> Gọi nhân viên
        </Button>
        {session && session.orders.length > 0 && (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setPaymentOpen(true)}>
            <Receipt className="size-4" /> Thanh toán
          </Button>
        )}
        <Button size="lg" className="relative flex-1" onClick={() => setCartOpen(true)}>
          <ShoppingCart className="size-4" /> Giỏ món
          {cart.itemCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {cart.itemCount}
            </span>
          )}
        </Button>
      </div>

      <ItemDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onAdd={cart.addLine}
      />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} cart={cart} onSubmit={handleSubmitOrder} submitting={submitting} />
      <RequestSheet open={requestOpen} onOpenChange={setRequestOpen} onSubmit={handleRequest} />
      <PaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} session={session} onSubmit={handlePaymentRequest} />

      {session?.status === "PAYMENT_REQUESTED" && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 mx-auto w-full max-w-lg px-3">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <ClipboardList className="size-4 shrink-0" />
            Đã gửi yêu cầu thanh toán — nhân viên sẽ đến hỗ trợ bạn.
          </div>
        </div>
      )}
    </div>
  );
}
