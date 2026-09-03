"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Banknote, Landmark, CreditCard, Wallet, MoreHorizontal, Percent, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useSse } from "@/hooks/use-sse";
import { formatVnd, formatTimeAgo } from "@/lib/format";
import { TABLE_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/status-labels";
import { DiscountDialog } from "@/app/staff/tables/[id]/table-actions-dialogs";

interface QueueEntry {
  id: string;
  tableCode: string;
  status: string;
  guestCount: number;
  openedAt: string;
  total: number;
}
interface CheckoutDetail {
  id: string;
  status: string;
  tableCode: string;
  guestCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  payments: { id: string; amount: number; method: string; status: string; paidAt: string | null }[];
  orders: {
    id: string;
    orderNumber: number;
    items: {
      id: string;
      name: string;
      variantName: string | null;
      unitPrice: number;
      quantity: number;
      modifiersTotal: number;
      modifierNames: string[];
    }[];
  }[];
}

const METHODS = [
  { value: "CASH", label: "Tiền mặt", icon: Banknote },
  { value: "BANK_TRANSFER", label: "Chuyển khoản", icon: Landmark },
  { value: "CARD", label: "Thẻ/POS", icon: CreditCard },
  { value: "E_WALLET", label: "Ví điện tử", icon: Wallet },
  { value: "OTHER", label: "Khác", icon: MoreHorizontal },
] as const;

export function PosClient({
  initialQueue,
  initialSelectedId,
  canProcessPayment,
  canVoidPayment,
  canApplyDiscount,
}: {
  initialQueue: QueueEntry[];
  initialSelectedId: string | null;
  canProcessPayment: boolean;
  canVoidPayment: boolean;
  canApplyDiscount: boolean;
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<CheckoutDetail | null>(null);
  const [method, setMethod] = useState<string>("CASH");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const refreshQueue = useCallback(async () => {
    const res = await fetch("/api/pos/queue", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setQueue(data.queue);
    }
  }, []);

  const refreshDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/pos/session/${id}`, { cache: "no-store" });
    if (res.ok) setDetail(await res.json());
    else setDetail(null);
  }, []);

  useEffect(() => {
    // Fetch-on-selection-change: intentional client data load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) refreshDetail(selectedId);
    else setDetail(null);
  }, [selectedId, refreshDetail]);

  useSse("/api/staff/events", (type) => {
    if (["TABLE_STATUS_UPDATED", "ORDER_CREATED", "ORDER_UPDATED", "PAYMENT_REQUEST_CREATED", "PAYMENT_COMPLETED"].includes(type)) {
      refreshQueue();
      if (selectedId) refreshDetail(selectedId);
    }
  });

  async function handleCheckout() {
    if (!selectedId) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableSessionId: selectedId, method, reference: reference || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thanh toán");
        return;
      }
      toast.success("Thanh toán thành công");
      setSelectedId(null);
      setReference("");
      refreshQueue();
    } finally {
      setProcessing(false);
    }
  }

  async function handleVoid() {
    if (!voidingId || !voidReason.trim()) return;
    const res = await fetch(`/api/payments/${voidingId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: voidReason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Không thể huỷ giao dịch");
      return;
    }
    toast.success("Đã huỷ giao dịch");
    setVoidingId(null);
    setVoidReason("");
    if (selectedId) refreshDetail(selectedId);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-6xl">
      <aside className={`w-full shrink-0 overflow-y-auto border-r md:block md:w-80 ${selectedId ? "hidden" : "block"}`}>
        <div className="border-b p-3">
          <h1 className="text-base font-semibold">Chờ thanh toán ({queue.length})</h1>
        </div>
        {queue.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Không có bàn nào đang chờ</p>
        ) : (
          <div className="divide-y">
            {queue.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent ${selectedId === q.id ? "bg-accent" : ""}`}
              >
                <div>
                  <p className="font-semibold">Bàn {q.tableCode}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(q.openedAt)} trước · {q.guestCount} khách</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatVnd(q.total)}</p>
                  {q.status === "PAYMENT_REQUESTED" && (
                    <Badge variant="destructive" className="text-[10px]">{TABLE_STATUS_LABEL[q.status]}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className={`flex-1 overflow-y-auto ${selectedId ? "block" : "hidden md:block"}`}>
        {!selectedId || !detail ? (
          <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted-foreground">
            {selectedId ? <Skeleton className="h-64 w-full max-w-md" /> : "Chọn một bàn để thanh toán"}
          </div>
        ) : (
          <div className="mx-auto max-w-xl space-y-4 p-4">
            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="text-lg font-semibold">Bàn {detail.tableCode}</h2>
            </div>
            <h2 className="hidden text-lg font-semibold md:block">Thanh toán — Bàn {detail.tableCode}</h2>

            <div className="space-y-3 rounded-lg border p-4">
              {detail.orders.map((order) => (
                <div key={order.id} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Order #{order.orderNumber}</p>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span>
                          {item.name}
                          {item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}
                        </span>
                        {item.modifierNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">{item.modifierNames.join(", ")}</p>
                        )}
                      </div>
                      <span>{formatVnd((item.unitPrice + item.modifiersTotal) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Tạm tính</span><span>{formatVnd(detail.subtotal)}</span></div>
                {detail.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Giảm giá</span><span>-{formatVnd(detail.discountAmount)}</span></div>
                )}
                <div className="flex justify-between text-muted-foreground"><span>Thuế</span><span>{formatVnd(detail.taxAmount)}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Tổng cộng</span><span>{formatVnd(detail.total)}</span></div>
              </div>
              {canApplyDiscount && (
                <Button variant="outline" size="sm" onClick={() => setDiscountOpen(true)}>
                  <Percent className="size-3.5" /> Giảm giá
                </Button>
              )}
            </div>

            {detail.payments.length > 0 && (
              <div className="space-y-1.5 rounded-lg border p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground">Lịch sử giao dịch</p>
                {detail.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span>{PAYMENT_METHOD_LABEL[p.method] ?? p.method} · {formatVnd(p.amount)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === "VOIDED" ? "outline" : "secondary"}>{p.status}</Badge>
                      {canVoidPayment && p.status === "COMPLETED" && (
                        <button onClick={() => setVoidingId(p.id)} className="text-xs text-destructive hover:underline">
                          <Ban className="mr-0.5 inline size-3" />Huỷ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canProcessPayment && detail.status !== "CLOSED" && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Hình thức thanh toán</p>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setMethod(value)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs ${method === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"}`}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Số tham chiếu (không bắt buộc)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Button size="lg" className="w-full" onClick={handleCheckout} disabled={processing}>
                  {processing ? "Đang xử lý..." : `Xác nhận thanh toán · ${formatVnd(detail.total)}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {detail && (
        <DiscountDialog
          open={discountOpen}
          onOpenChange={setDiscountOpen}
          tableSessionId={detail.id}
          onDone={() => refreshDetail(detail.id)}
        />
      )}

      <AlertDialog open={!!voidingId} onOpenChange={(o) => !o && setVoidingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ giao dịch thanh toán</AlertDialogTitle>
            <AlertDialogDescription>Nhập lý do huỷ. Thao tác này được ghi vào nhật ký hệ thống.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Lý do huỷ" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction disabled={!voidReason.trim()} onClick={handleVoid}>
              Xác nhận huỷ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
