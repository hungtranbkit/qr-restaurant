"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { formatClock, formatVnd } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/status-labels";
import type { ClientTableSession } from "@/types/customer";

const STATUS_TONE: Record<string, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PREPARING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  READY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  SERVED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function TrackingView({ session }: { session: ClientTableSession | null }) {
  if (!session || session.orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <ClipboardList className="size-8" />
        <p className="text-sm">Bạn chưa gọi món nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {[...session.orders].reverse().map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-sm font-semibold">Order #{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">{formatClock(order.createdAt)}</p>
            </div>
            <Badge variant="secondary" className={STATUS_TONE[order.status]}>
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </Badge>
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
                    <p className="text-xs text-muted-foreground">
                      {item.modifiers.map((m) => m.nameSnapshot).join(", ")}
                    </p>
                  )}
                  {item.note && <p className="text-xs italic text-muted-foreground">{item.note}</p>}
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {formatVnd(
                    (item.unitPriceSnapshot + item.modifiers.reduce((s, m) => s + m.priceDeltaSnapshot, 0)) *
                      item.quantity,
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
