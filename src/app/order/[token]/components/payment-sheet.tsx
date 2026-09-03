"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Banknote, Landmark, CreditCard } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { ClientTableSession } from "@/types/customer";

const METHODS = [
  { value: "CASH", label: "Tiền mặt", icon: Banknote },
  { value: "BANK_TRANSFER", label: "Chuyển khoản", icon: Landmark },
  { value: "CARD", label: "Thẻ/POS", icon: CreditCard },
] as const;

export function PaymentSheet({
  open,
  onOpenChange,
  session,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ClientTableSession | null;
  onSubmit: (method: string) => Promise<void>;
}) {
  const [method, setMethod] = useState<string>("CASH");
  const [sending, setSending] = useState(false);
  const alreadyRequested = session?.status === "PAYMENT_REQUESTED";

  async function handleSend() {
    setSending(true);
    await onSubmit(method);
    setSending(false);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Gọi thanh toán</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5 rounded-lg border p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Tạm tính</span>
              <span>{formatVnd(session?.subtotal ?? 0)}</span>
            </div>
            {(session?.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Giảm giá</span>
                <span>-{formatVnd(session?.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Thuế</span>
              <span>{formatVnd(session?.taxAmount ?? 0)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-semibold">
              <span>Tổng cộng</span>
              <span>{formatVnd(session?.total ?? 0)}</span>
            </div>
          </div>

          {alreadyRequested ? (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Bạn đã gọi thanh toán. Nhân viên sẽ đến hỗ trợ trong giây lát.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hình thức thanh toán</p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
                      method === value ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-accent"
                    }`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {!alreadyRequested && (
          <SheetFooter>
            <Button size="lg" className="w-full" disabled={sending} onClick={handleSend}>
              {sending ? "Đang gửi..." : "Gọi thanh toán"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
