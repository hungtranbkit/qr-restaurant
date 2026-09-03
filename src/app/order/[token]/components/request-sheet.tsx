"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bell, GlassWater, Utensils, HelpCircle, MoreHorizontal } from "lucide-react";
import { REQUEST_TYPE_LABEL } from "@/lib/status-labels";

const TYPES = [
  { value: "CALL_STAFF", icon: Bell },
  { value: "WATER", icon: GlassWater },
  { value: "UTENSILS", icon: Utensils },
  { value: "ITEM_SUPPORT", icon: HelpCircle },
  { value: "OTHER", icon: MoreHorizontal },
] as const;

export function RequestSheet({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (type: string, note?: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    await onSubmit(selected, note.trim() || undefined);
    setSending(false);
    setSelected(null);
    setNote("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Gọi nhân viên</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                  selected === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                <Icon className="size-5" />
                {REQUEST_TYPE_LABEL[value]}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Ghi chú thêm (không bắt buộc)"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <SheetFooter>
          <Button size="lg" className="w-full" disabled={!selected || sending} onClick={handleSend}>
            {sending ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
