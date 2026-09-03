"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bell, Receipt, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSse } from "@/hooks/use-sse";
import { formatVnd } from "@/lib/format";
import { TABLE_STATUS_LABEL } from "@/lib/status-labels";

interface BoardTable {
  id: string;
  code: string;
  name: string;
  seats: number;
  status: string;
  active: boolean;
  areaId: string;
  areaName: string;
  sessionId: string | null;
  guestCount: number | null;
  total: number;
  pendingRequests: number;
  hasReadyOrder: boolean;
}
interface Area {
  id: string;
  name: string;
}

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "border-border bg-card",
  OCCUPIED: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
  WAITING_FOOD: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  DINING: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
  PAYMENT_REQUESTED: "border-destructive/40 bg-destructive/5",
  CHECKOUT: "border-destructive/40 bg-destructive/5",
  CLEANING: "border-border bg-muted",
  DISABLED: "border-border bg-muted opacity-60",
};

export function TableBoardClient({
  initialTables,
  areas,
}: {
  initialTables: BoardTable[];
  areas: Area[];
  canOpenTable: boolean;
}) {
  const [tables, setTables] = useState(initialTables);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/tables", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useSse("/api/staff/events", (type) => {
    if (
      [
        "TABLE_STATUS_UPDATED",
        "ORDER_CREATED",
        "ORDER_UPDATED",
        "KITCHEN_TICKET_UPDATED",
        "CUSTOMER_REQUEST_CREATED",
        "CUSTOMER_REQUEST_UPDATED",
        "PAYMENT_REQUEST_CREATED",
        "PAYMENT_COMPLETED",
      ].includes(type)
    ) {
      refresh();
    }
  });

  useEffect(() => {
    const interval = setInterval(refresh, 30_000); // light polling fallback alongside SSE
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = tables.filter((t) => {
    if (areaFilter !== "all" && t.areaId !== areaFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const statuses = Array.from(new Set(tables.map((t) => t.status)));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Sơ đồ bàn</h1>
        <div className="flex gap-2">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Khu vực" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu vực</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{TABLE_STATUS_LABEL[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && tables.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Không có bàn phù hợp bộ lọc</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/staff/tables/${t.id}`}
              className={`relative flex flex-col gap-1.5 rounded-xl border p-3 transition-shadow hover:shadow-md ${STATUS_STYLE[t.status] ?? ""}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-base font-bold">{t.code}</span>
                {t.pendingRequests > 0 && (
                  <Bell className="size-4 text-destructive" />
                )}
              </div>
              <Badge variant="outline" className="w-fit text-xs">
                {TABLE_STATUS_LABEL[t.status] ?? t.status}
              </Badge>
              <p className="text-xs text-muted-foreground">{t.areaName}</p>
              {t.guestCount != null && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" /> {t.guestCount} khách
                </p>
              )}
              {t.total > 0 && <p className="text-sm font-semibold">{formatVnd(t.total)}</p>}
              <div className="flex gap-1">
                {t.status === "PAYMENT_REQUESTED" && (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <Receipt className="size-3" /> Thanh toán
                  </Badge>
                )}
                {t.hasReadyOrder && (
                  <Badge className="gap-1 bg-emerald-600 text-[10px] hover:bg-emerald-600">
                    <ChefHat className="size-3" /> Sẵn sàng
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
