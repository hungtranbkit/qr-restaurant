"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function SettingsForm({
  taxRatePercent,
  autoAvailableAfterPayment,
}: {
  taxRatePercent: number;
  autoAvailableAfterPayment: boolean;
}) {
  const [taxRate, setTaxRate] = useState(taxRatePercent);
  const [autoAvailable, setAutoAvailable] = useState(autoAvailableAfterPayment);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxRatePercent: taxRate, autoAvailableAfterPayment: autoAvailable }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Không thể lưu cài đặt");
        return;
      }
      toast.success("Đã lưu cài đặt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Thanh toán & Bàn</CardTitle>
        <CardDescription>Áp dụng cho toàn bộ chi nhánh</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="taxRate">Thuế VAT (%)</Label>
          <Input id="taxRate" type="number" min={0} max={30} step={0.5} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Tự động chuyển bàn về Trống sau thanh toán</p>
            <p className="text-xs text-muted-foreground">Nếu tắt, bàn sẽ chuyển sang &quot;Đang dọn dẹp&quot; và cần xác nhận thủ công</p>
          </div>
          <Switch checked={autoAvailable} onCheckedChange={setAutoAvailable} />
        </div>
        <Button onClick={handleSave} disabled={loading}>{loading ? "Đang lưu..." : "Lưu cài đặt"}</Button>
      </CardContent>
    </Card>
  );
}
