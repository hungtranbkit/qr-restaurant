"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSse } from "@/hooks/use-sse";
import { UserMenu } from "@/components/shell/user-menu";

interface TicketItem {
  id: string;
  name: string;
  variantName: string | null;
  quantity: number;
  note: string | null;
  stationName: string | null;
  modifiers: string[];
}
interface Ticket {
  id: string;
  orderNumber: number;
  status: "SUBMITTED" | "PREPARING" | "READY";
  createdAt: string;
  tableCode: string;
  items: TicketItem[];
}
interface Station {
  id: string;
  code: string;
  name: string;
}

const COLUMNS: { status: Ticket["status"]; title: string; action: string; next: string }[] = [
  { status: "SUBMITTED", title: "MỚI", action: "Nhận món", next: "PREPARING" },
  { status: "PREPARING", title: "ĐANG CHUẨN BỊ", action: "Hoàn thành", next: "READY" },
  { status: "READY", title: "SẴN SÀNG", action: "Đã lấy món", next: "SERVED" },
];

function useElapsedMinutes(createdAt: string) {
  const [mins, setMins] = useState(() => Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  useEffect(() => {
    const interval = setInterval(() => {
      setMins(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    }, 15_000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return mins;
}

function TicketCard({
  ticket,
  onAdvance,
  canAdvance,
}: {
  ticket: Ticket;
  onAdvance: (id: string, next: string) => void;
  canAdvance: boolean;
}) {
  const mins = useElapsedMinutes(ticket.createdAt);
  const stale = mins >= 15;
  const warm = mins >= 8 && mins < 15;
  const column = COLUMNS.find((c) => c.status === ticket.status)!;

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border-2 bg-card p-3 shadow-sm ${
        stale ? "border-amber-500" : warm ? "border-amber-300" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold">Order #{ticket.orderNumber}</p>
          <p className="text-sm text-muted-foreground">Bàn {ticket.tableCode}</p>
        </div>
        <Badge variant={stale ? "destructive" : "secondary"} className="text-sm">
          {mins} phút
        </Badge>
      </div>
      <div className="space-y-1.5 border-t pt-2">
        {ticket.items.map((item) => (
          <div key={item.id} className="text-sm">
            <p className="font-semibold">
              {item.quantity} × {item.name}
              {item.variantName ? ` (${item.variantName})` : ""}
            </p>
            {item.modifiers.length > 0 && (
              <ul className="ml-4 list-disc text-muted-foreground">
                {item.modifiers.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
            {item.note && <p className="ml-4 italic text-muted-foreground">{item.note}</p>}
          </div>
        ))}
      </div>
      {canAdvance && (
        <Button className="mt-1 w-full" size="lg" onClick={() => onAdvance(ticket.id, column.next)}>
          {column.action}
        </Button>
      )}
    </div>
  );
}

export function KitchenBoardClient({
  stations,
  userName,
  userRole,
  canAdvance,
}: {
  stations: Station[];
  userName: string;
  userRole: string;
  canAdvance: boolean;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stationFilter, setStationFilter] = useState<string>("all");

  const refresh = useCallback(async () => {
    const url = stationFilter === "all" ? "/api/kitchen/tickets" : `/api/kitchen/tickets?stationId=${stationFilter}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTickets(data.tickets);
    }
  }, [stationFilter]);

  useEffect(() => {
    // Fetch-on-mount / on-filter-change: intentional client data load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useSse("/api/staff/events", (type) => {
    if (type === "KITCHEN_TICKET_CREATED" || type === "KITCHEN_TICKET_UPDATED" || type === "ORDER_UPDATED") {
      if (type === "KITCHEN_TICKET_CREATED") toast.info("Có order mới");
      refresh();
    }
  });

  async function advance(orderId: string, nextStatus: string) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể cập nhật");
      return;
    }
    refresh();
  }

  return (
    <div className="flex h-screen flex-col bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <h1 className="text-lg font-bold tracking-tight">BẾP — Kitchen Display</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            <button
              onClick={() => setStationFilter("all")}
              className={`rounded-md px-3 py-1.5 font-medium ${stationFilter === "all" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Tất cả
            </button>
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => setStationFilter(s.id)}
                className={`rounded-md px-3 py-1.5 font-medium ${stationFilter === s.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <UserMenu name={userName} role={userRole} />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnTickets = tickets.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="flex flex-col overflow-hidden rounded-xl bg-background">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h2 className="text-sm font-bold tracking-wide text-muted-foreground">{col.title}</h2>
                <Badge variant="outline">{columnTickets.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {columnTickets.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Không có order</p>
                ) : (
                  columnTickets.map((t) => (
                    <TicketCard key={t.id} ticket={t} onAdvance={advance} canAdvance={canAdvance} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
