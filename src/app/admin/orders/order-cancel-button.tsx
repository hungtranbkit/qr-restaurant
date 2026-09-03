"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function OrderCancelButton({ orderId }: { orderId: string }) {
  const router = useRouter();

  async function handleCancel() {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể huỷ đơn");
      return;
    }
    toast.success("Đã huỷ đơn hàng");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={handleCancel}>
      Huỷ
    </Button>
  );
}
