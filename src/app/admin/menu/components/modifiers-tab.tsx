"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatVnd } from "@/lib/format";
import type { AdminModifierGroup } from "../types";

export function ModifiersTab({ modifierGroups, onChange }: { modifierGroups: AdminModifierGroup[]; onChange: () => void }) {
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [gName, setGName] = useState("");
  const [gRequired, setGRequired] = useState(false);
  const [gMin, setGMin] = useState(0);
  const [gMax, setGMax] = useState(1);

  const [addOptionFor, setAddOptionFor] = useState<string | null>(null);
  const [oName, setOName] = useState("");
  const [oPrice, setOPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleAddGroup() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/modifier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: gName, required: gRequired, minSelect: gMin, maxSelect: gMax }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm nhóm tuỳ chọn");
        return;
      }
      toast.success("Đã thêm nhóm tuỳ chọn");
      setGName("");
      setGRequired(false);
      setGMin(0);
      setGMax(1);
      setAddGroupOpen(false);
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddOption() {
    if (!addOptionFor) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/modifier-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: addOptionFor, name: oName, priceDelta: oPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm tuỳ chọn");
        return;
      }
      toast.success("Đã thêm tuỳ chọn");
      setOName("");
      setOPrice(0);
      setAddOptionFor(null);
      onChange();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddGroupOpen(true)}><Plus className="size-4" /> Thêm nhóm tuỳ chọn</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {modifierGroups.map((g) => (
          <Card key={g.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                {g.name}
                {g.required && <Badge variant="destructive" className="ml-2 text-[10px]">Bắt buộc</Badge>}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                chọn {g.minSelect}-{g.maxSelect}
              </span>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {g.options.map((o) => (
                <div key={o.id} className="flex justify-between text-sm">
                  <span>{o.name}</span>
                  <span className="text-muted-foreground">{o.priceDelta > 0 ? `+${formatVnd(o.priceDelta)}` : "0đ"}</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => setAddOptionFor(g.id)}>
                <Plus className="size-3" /> Thêm lựa chọn
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm nhóm tuỳ chọn</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tên nhóm</Label>
              <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Mức cay" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Chọn tối thiểu</Label>
                <Input type="number" min={0} value={gMin} onChange={(e) => setGMin(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Chọn tối đa</Label>
                <Input type="number" min={1} value={gMax} onChange={(e) => setGMax(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={gRequired} onCheckedChange={setGRequired} />
              <Label>Bắt buộc chọn</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddGroup} disabled={!gName.trim() || loading}>{loading ? "Đang thêm..." : "Thêm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addOptionFor} onOpenChange={(o) => !o && setAddOptionFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm lựa chọn</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tên lựa chọn</Label>
              <Input value={oName} onChange={(e) => setOName(e.target.value)} placeholder="Thêm trứng" />
            </div>
            <div className="space-y-2">
              <Label>Phụ thu (đ)</Label>
              <Input type="number" min={0} value={oPrice} onChange={(e) => setOPrice(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddOption} disabled={!oName.trim() || loading}>{loading ? "Đang thêm..." : "Thêm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
