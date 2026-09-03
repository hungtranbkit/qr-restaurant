"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, Bell as BellDot, CheckCheck, Receipt, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useSse } from "@/hooks/use-sse";
import { REQUEST_TYPE_LABEL } from "@/lib/status-labels";
import { formatTimeAgo } from "@/lib/format";

interface RequestItem {
  id: string;
  type: string;
  status: string;
  note: string | null;
  tableCode: string;
  createdAt: string;
}
interface PaymentRequestItem {
  tableId: string;
  tableCode: string;
}
interface ReadyOrderItem {
  orderId: string;
  orderNumber: number;
  tableCode: string;
  tableId: string;
}

export function NotificationBell({ canManageRequests }: { canManageRequests: boolean }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyOrderItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests);
      setPaymentRequests(data.paymentRequests);
      setReadyOrders(data.readyOrders);
    } catch {
      // best effort
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: intentional client data load, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useSse("/api/staff/events", (type, data) => {
    if (type === "CUSTOMER_REQUEST_CREATED") {
      const payload = (data as { payload?: { type: string; tableCode: string } })?.payload;
      if (payload) toast.info(`Bàn ${payload.tableCode}: ${REQUEST_TYPE_LABEL[payload.type] ?? payload.type}`);
    }
    if (type === "PAYMENT_REQUEST_CREATED") {
      const payload = (data as { payload?: { tableCode: string } })?.payload;
      if (payload) toast.warning(`Bàn ${payload.tableCode} yêu cầu thanh toán`);
    }
    if (type === "KITCHEN_TICKET_UPDATED") {
      const payload = (data as { payload?: { status?: string } })?.payload;
      if (payload?.status === "READY") toast.success("Có món đã sẵn sàng để phục vụ");
    }
    if (
      [
        "CUSTOMER_REQUEST_CREATED",
        "CUSTOMER_REQUEST_UPDATED",
        "PAYMENT_REQUEST_CREATED",
        "PAYMENT_COMPLETED",
        "KITCHEN_TICKET_UPDATED",
        "TABLE_STATUS_UPDATED",
      ].includes(type)
    ) {
      refresh();
    }
  });

  async function acceptRequest(id: string) {
    await fetch(`/api/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    refresh();
  }
  async function completeRequest(id: string) {
    await fetch(`/api/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    refresh();
  }

  const total = requests.length + paymentRequests.length + readyOrders.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {total > 0 ? <BellDot className="size-5" /> : <Bell className="size-5" />}
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="max-h-96 overflow-y-auto">
          {total === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Không có thông báo mới</p>
          )}

          {paymentRequests.length > 0 && (
            <div className="border-b p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Yêu cầu thanh toán</p>
              {paymentRequests.map((p) => (
                <Link
                  key={p.tableId}
                  href={`/staff/tables/${p.tableId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <Receipt className="size-4 text-amber-600" />
                  Bàn {p.tableCode} yêu cầu thanh toán
                </Link>
              ))}
            </div>
          )}

          {readyOrders.length > 0 && (
            <div className="border-b p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Món sẵn sàng phục vụ</p>
              {readyOrders.map((o) => (
                <Link
                  key={o.orderId}
                  href={`/staff/tables/${o.tableId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <ChefHat className="size-4 text-emerald-600" />
                  Bàn {o.tableCode} — Order #{o.orderNumber} sẵn sàng
                </Link>
              ))}
            </div>
          )}

          {requests.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Yêu cầu từ khách</p>
              {requests.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
                  <div>
                    <p className="font-medium">
                      Bàn {r.tableCode} — {REQUEST_TYPE_LABEL[r.type] ?? r.type}
                    </p>
                    {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(r.createdAt)} trước</p>
                    {r.status === "ACCEPTED" && (
                      <Badge variant="secondary" className="mt-1">Đã nhận</Badge>
                    )}
                  </div>
                  {canManageRequests && (
                    <div className="flex shrink-0 gap-1">
                      {r.status === "NEW" && (
                        <Button size="sm" variant="outline" onClick={() => acceptRequest(r.id)}>
                          Nhận
                        </Button>
                      )}
                      <Button size="sm" onClick={() => completeRequest(r.id)}>
                        <CheckCheck className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
