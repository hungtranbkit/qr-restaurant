"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OpenTableDialog({
  open,
  onOpenChange,
  tableId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tableId: string;
  onDone: () => void;
}) {
  const [guestCount, setGuestCount] = useState(2);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/tables/${tableId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể mở bàn");
        return;
      }
      toast.success("Đã mở bàn");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở bàn</DialogTitle>
          <DialogDescription>Nhập số lượng khách để bắt đầu phiên phục vụ.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="guestCount">Số khách</Label>
          <Input
            id="guestCount"
            type="number"
            min={1}
            max={50}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleOpen} disabled={loading}>
            {loading ? "Đang mở..." : "Mở bàn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransferDialog({
  open,
  onOpenChange,
  tableId,
  availableTables,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tableId: string;
  availableTables: { id: string; code: string }[];
  onDone: () => void;
}) {
  const [target, setTarget] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleTransfer() {
    if (!target) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/tables/${tableId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toTableId: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể chuyển bàn");
        return;
      }
      toast.success("Đã chuyển bàn");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển bàn</DialogTitle>
          <DialogDescription>Chuyển toàn bộ phiên hiện tại sang một bàn trống khác.</DialogDescription>
        </DialogHeader>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger><SelectValue placeholder="Chọn bàn trống" /></SelectTrigger>
          <SelectContent>
            {availableTables.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={handleTransfer} disabled={!target || loading}>
            {loading ? "Đang chuyển..." : "Chuyển bàn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DiscountDialog({
  open,
  onOpenChange,
  tableSessionId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tableSessionId: string;
  onDone: () => void;
}) {
  const [type, setType] = useState<"FIXED" | "PERCENTAGE">("PERCENTAGE");
  const [value, setValue] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApply(clear = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableSessionId,
          discountType: clear ? null : type,
          discountValue: clear ? null : value,
          reason: clear ? undefined : reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể áp dụng giảm giá");
        return;
      }
      toast.success(clear ? "Đã bỏ giảm giá" : "Đã áp dụng giảm giá");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Áp dụng giảm giá</DialogTitle>
          <DialogDescription>Mọi giảm giá đều được ghi lại vào nhật ký hệ thống.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={type === "PERCENTAGE" ? "default" : "outline"} className="flex-1" onClick={() => setType("PERCENTAGE")}>
              Phần trăm (%)
            </Button>
            <Button variant={type === "FIXED" ? "default" : "outline"} className="flex-1" onClick={() => setType("FIXED")}>
              Số tiền (đ)
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountValue">Giá trị</Label>
            <Input
              id="discountValue"
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => handleApply(true)} disabled={loading}>
            Bỏ giảm giá
          </Button>
          <Button onClick={() => handleApply(false)} disabled={loading || value <= 0}>
            {loading ? "Đang áp dụng..." : "Áp dụng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
