"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatVnd } from "@/lib/format";
import type { AdminItem, AdminCategory, AdminStation, AdminModifierGroup } from "../types";

const NONE = "__none__";

export function ItemEditorDialog({
  item,
  categories,
  stations,
  modifierGroups,
  onOpenChange,
  onDone,
}: {
  item: AdminItem | null;
  categories: AdminCategory[];
  stations: AdminStation[];
  modifierGroups: AdminModifierGroup[];
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [basePrice, setBasePrice] = useState(item?.basePrice ?? 0);
  const [salePrice, setSalePrice] = useState<number | "">(item?.salePrice ?? "");
  const [stationId, setStationId] = useState(item?.kitchenStationId ?? NONE);
  const [prepTime, setPrepTime] = useState<number | "">(item?.preparationTime ?? "");
  const [loading, setLoading] = useState(false);

  const [variantName, setVariantName] = useState("");
  const [variantDelta, setVariantDelta] = useState(0);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(item?.modifierGroupIds ?? []);

  async function handleSave() {
    setLoading(true);
    try {
      const payload = {
        name,
        sku,
        categoryId,
        description: description || undefined,
        basePrice: Number(basePrice),
        salePrice: salePrice === "" ? null : Number(salePrice),
        kitchenStationId: stationId === NONE ? null : stationId,
        preparationTime: prepTime === "" ? null : Number(prepTime),
      };
      const res = await fetch(item ? `/api/admin/menu/items/${item.id}` : "/api/admin/menu/items", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể lưu món");
        return;
      }
      toast.success(item ? "Đã lưu thay đổi" : "Đã thêm món — mở lại để thêm biến thể / tuỳ chọn");
      onDone();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddVariant() {
    if (!item || !variantName.trim()) return;
    const res = await fetch("/api/admin/menu/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId: item.id, name: variantName, priceDelta: variantDelta, isDefault: item.variants.length === 0 }),
    });
    if (!res.ok) {
      toast.error("Không thể thêm biến thể");
      return;
    }
    setVariantName("");
    setVariantDelta(0);
    onDone();
  }

  async function handleDeleteVariant(id: string) {
    const res = await fetch(`/api/admin/menu/variants/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Không thể xoá biến thể");
      return;
    }
    onDone();
  }

  async function toggleGroup(groupId: string, checked: boolean) {
    if (!item) {
      setSelectedGroupIds((prev) => (checked ? [...prev, groupId] : prev.filter((id) => id !== groupId)));
      return;
    }
    const res = await fetch("/api/admin/menu/item-modifier-groups", {
      method: checked ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId: item.id, groupId }),
    });
    if (!res.ok) {
      toast.error("Không thể cập nhật nhóm tuỳ chọn");
      return;
    }
    onDone();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{item ? `Sửa món — ${item.name}` : "Thêm món mới"}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tên món</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cơm bò" />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="MC-007" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mô tả</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Giá gốc (đ)</Label>
              <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Giá khuyến mãi (đ)</Label>
              <Input
                type="number"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Để trống nếu không áp dụng"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trạm bếp</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Không</SelectItem>
                  {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thời gian chuẩn bị (phút)</Label>
              <Input
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Nhóm tuỳ chọn áp dụng</Label>
            <div className="flex flex-wrap gap-3">
              {modifierGroups.map((g) => (
                <label key={g.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={item ? item.modifierGroupIds.includes(g.id) : selectedGroupIds.includes(g.id)}
                    onCheckedChange={(c) => toggleGroup(g.id, !!c)}
                  />
                  {g.name}
                </label>
              ))}
              {modifierGroups.length === 0 && <p className="text-xs text-muted-foreground">Chưa có nhóm tuỳ chọn nào</p>}
            </div>
          </div>

          {item && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Biến thể (size)</Label>
                {item.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm">
                    <span>{v.name} {v.isDefault && <span className="text-xs text-muted-foreground">(mặc định)</span>}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{v.priceDelta >= 0 ? "+" : ""}{formatVnd(v.priceDelta)}</span>
                      <button onClick={() => handleDeleteVariant(v.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Tên (VD: Large)" value={variantName} onChange={(e) => setVariantName(e.target.value)} className="flex-1" />
                  <Input
                    type="number"
                    placeholder="+giá"
                    value={variantDelta}
                    onChange={(e) => setVariantDelta(Number(e.target.value))}
                    className="w-28"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleAddVariant}><Plus className="size-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!name.trim() || !sku.trim() || !categoryId || loading}>
            {loading ? "Đang lưu..." : item ? "Lưu thay đổi" : "Thêm món"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
