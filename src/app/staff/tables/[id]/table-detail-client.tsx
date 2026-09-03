"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Clock,
  Plus,
  ArrowRightLeft,
  Receipt,
  Percent,
  Sparkles,
  Bell,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSse } from "@/hooks/use-sse";
import { formatVnd, formatClock, formatTimeAgo } from "@/lib/format";
import { ORDER_STATUS_LABEL, TABLE_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/status-labels";
import type { ClientMenuCategory } from "@/types/customer";
import { OrderEntrySheet } from "./order-entry-sheet";
import { OpenTableDialog, TransferDialog, DiscountDialog } from "./table-actions-dialogs";

interface Permissions {
  canOpenTable: boolean;
  canCreateOrder: boolean;
  canManageOrders: boolean;
  canTransfer: boolean;
  canApplyDiscount: boolean;
  canManageRequests: boolean;
  canProcessPayment: boolean;
}

interface DetailResponse {
  table: {
    id: string;
    code: string;
    name: string;
    seats: number;
    status: string;
    active: boolean;
    areaName: string;
  };
  session: {
    id: string;
    status: string;
    guestCount: number;
    openedAt: string;
    openedByName: string | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    orders: {
      id: string;
      orderNumber: number;
      status: string;
      createdAt: string;
      source: string;
      createdByName: string | null;
      items: {
        id: string;
        itemNameSnapshot: string;
        variantNameSnapshot: string | null;
        unitPriceSnapshot: number;
        quantity: number;
        note: string | null;
        status: string;
        modifiers: { id: string; nameSnapshot: string; priceDeltaSnapshot: number }[];
      }[];
    }[];
    customerRequests: { id: string; type: string; status: string; note: string | null; createdAt: string }[];
  } | null;
}

export function TableDetailClient({
  tableId,
  categories,
  availableTables,
  permissions,
}: {
  tableId: string;
  categories: ClientMenuCategory[];
  availableTables: { id: string; code: string }[];
  permissions: Permissions;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [orderEntryOpen, setOrderEntryOpen] = useState(false);
  const [openTableDialogOpen, setOpenTableDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/staff/tables/${tableId}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [tableId]);

  useEffect(() => {
    // Fetch-on-mount: intentional client data load, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useSse("/api/staff/events", (type, evt) => {
    const payload = (evt as { tableId?: string })?.tableId;
    if (payload === tableId || type === "TABLE_STATUS_UPDATED") refresh();
  });

  async function transitionOrder(orderId: string, status: string) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể cập nhật trạng thái");
      return;
    }
    refresh();
  }

  async function cancelItem(itemId: string) {
    const res = await fetch(`/api/order-items/${itemId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể huỷ món");
      return;
    }
    toast.success("Đã huỷ món");
    refresh();
  }

  async function requestPayment() {
    const res = await fetch(`/api/staff/tables/${tableId}/request-payment`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể gửi yêu cầu");
      return;
    }
    toast.success("Đã gửi yêu cầu thanh toán");
    refresh();
  }

  async function markAvailable() {
    const res = await fetch(`/api/staff/tables/${tableId}/mark-available`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể cập nhật");
      return;
    }
    toast.success("Bàn đã sẵn sàng đón khách mới");
    refresh();
  }

  async function handleRequestAction(id: string, status: "ACCEPTED" | "COMPLETED") {
    await fetch(`/api/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { table, session } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff/tables"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Bàn {table.code}</h1>
        <Badge variant="outline">{TABLE_STATUS_LABEL[table.status] ?? table.status}</Badge>
        <span className="text-sm text-muted-foreground">{table.areaName}</span>
      </div>

      {!session ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Bàn hiện đang trống</p>
            {permissions.canOpenTable && table.status === "AVAILABLE" && (
              <Button onClick={() => setOpenTableDialogOpen(true)}>
                <Plus className="size-4" /> Mở bàn
              </Button>
            )}
            {table.status === "CLEANING" && permissions.canOpenTable && (
              <Button variant="outline" onClick={markAvailable}>
                Đánh dấu đã dọn xong
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-muted-foreground" />
                {session.guestCount} khách
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                {formatTimeAgo(session.openedAt)} trước
              </div>
              <div className="text-sm text-muted-foreground">
                Phụ trách: {session.openedByName ?? "Khách tự đặt"}
              </div>
              <div className="text-right text-lg font-semibold sm:text-left">{formatVnd(session.total)}</div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {permissions.canCreateOrder && session.status === "OPEN" && (
              <Button onClick={() => setOrderEntryOpen(true)}>
                <Plus className="size-4" /> Thêm món
              </Button>
            )}
            {permissions.canTransfer && session.status === "OPEN" && (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="size-4" /> Chuyển bàn
              </Button>
            )}
            {permissions.canApplyDiscount && session.status !== "CLOSED" && (
              <Button variant="outline" onClick={() => setDiscountOpen(true)}>
                <Percent className="size-4" /> Giảm giá
              </Button>
            )}
            {session.status === "OPEN" && (
              <Button variant="outline" onClick={requestPayment}>
                <Receipt className="size-4" /> Yêu cầu thanh toán
              </Button>
            )}
            {session.status === "PAYMENT_REQUESTED" && permissions.canProcessPayment && (
              <Button asChild>
                <Link href={`/pos?session=${session.id}`}>
                  <Receipt className="size-4" /> Đến quầy thu ngân
                </Link>
              </Button>
            )}
          </div>

          {(session.discountAmount > 0 || true) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tổng kết hoá đơn</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Tạm tính</span><span>{formatVnd(session.subtotal)}</span></div>
                {session.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Giảm giá</span><span>-{formatVnd(session.discountAmount)}</span></div>
                )}
                <div className="flex justify-between text-muted-foreground"><span>Thuế</span><span>{formatVnd(session.taxAmount)}</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-semibold"><span>Tổng cộng</span><span>{formatVnd(session.total)}</span></div>
              </CardContent>
            </Card>
          )}

          {session.customerRequests.some((r) => r.status === "NEW" || r.status === "ACCEPTED") && (
            <Card className="border-amber-300">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Yêu cầu từ khách</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {session.customerRequests
                  .filter((r) => r.status === "NEW" || r.status === "ACCEPTED")
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                      <div>
                        <p className="flex items-center gap-1.5 font-medium">
                          <Bell className="size-3.5" /> {REQUEST_TYPE_LABEL[r.type] ?? r.type}
                        </p>
                        {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                      </div>
                      {permissions.canManageRequests && (
                        <div className="flex gap-1">
                          {r.status === "NEW" && (
                            <Button size="sm" variant="outline" onClick={() => handleRequestAction(r.id, "ACCEPTED")}>Nhận</Button>
                          )}
                          <Button size="sm" onClick={() => handleRequestAction(r.id, "COMPLETED")}>
                            <CheckCheck className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Lịch sử order</h2>
            {[...session.orders].reverse().map((order) => (
              <Card key={order.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Order #{order.orderNumber} <span className="font-normal text-muted-foreground">· {order.source === "CUSTOMER" ? "Khách tự đặt" : order.createdByName ?? "Nhân viên"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatClock(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
                    {order.status === "READY" && permissions.canCreateOrder && (
                      <Button size="sm" onClick={() => transitionOrder(order.id, "SERVED")}>
                        <Sparkles className="size-3.5" /> Đã phục vụ
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className={item.status === "CANCELLED" ? "text-muted-foreground line-through" : ""}>
                        <span className="font-medium">
                          {item.itemNameSnapshot}
                          {item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ""} ×{item.quantity}
                        </span>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground">{item.modifiers.map((m) => m.nameSnapshot).join(", ")}</p>
                        )}
                        {item.note && <p className="text-xs italic text-muted-foreground">{item.note}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatVnd((item.unitPriceSnapshot + item.modifiers.reduce((s, m) => s + m.priceDeltaSnapshot, 0)) * item.quantity)}
                        </span>
                        {permissions.canManageOrders && item.status !== "CANCELLED" && item.status !== "SERVED" && (
                          <button onClick={() => cancelItem(item.id)} className="text-xs text-destructive hover:underline">
                            Huỷ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <OpenTableDialog open={openTableDialogOpen} onOpenChange={setOpenTableDialogOpen} tableId={tableId} onDone={refresh} />
      {session && (
        <>
          <TransferDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            tableId={tableId}
            availableTables={availableTables}
            onDone={refresh}
          />
          <DiscountDialog
            open={discountOpen}
            onOpenChange={setDiscountOpen}
            tableSessionId={session.id}
            onDone={refresh}
          />
        </>
      )}
      <OrderEntrySheet
        open={orderEntryOpen}
        onOpenChange={setOrderEntryOpen}
        tableId={tableId}
        categories={categories}
        onOrderSent={refresh}
      />
    </div>
  );
}
