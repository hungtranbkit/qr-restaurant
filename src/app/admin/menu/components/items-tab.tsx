"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, ImageOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatVnd } from "@/lib/format";
import { ItemEditorDialog } from "./item-editor-dialog";
import type { AdminItem, AdminCategory, AdminStation, AdminModifierGroup } from "../types";

export function ItemsTab({
  items,
  categories,
  stations,
  modifierGroups,
  onChange,
}: {
  items: AdminItem[];
  categories: AdminCategory[];
  stations: AdminStation[];
  modifierGroups: AdminModifierGroup[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggleField(item: AdminItem, field: "active" | "soldOut") {
    const res = await fetch(`/api/admin/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !item[field] }),
    });
    if (!res.ok) {
      toast.error("Không thể cập nhật");
      return;
    }
    onChange();
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Thêm món</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Món</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Trạm bếp</TableHead>
              <TableHead>Hiển thị</TableHead>
              <TableHead>Hết hàng</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="size-9 rounded-md object-cover" />
                    ) : (
                      <ImageOff className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </TableCell>
                <TableCell className="text-sm">{item.categoryName}</TableCell>
                <TableCell className="text-sm">
                  {item.salePrice ? (
                    <>
                      <span className="text-muted-foreground line-through">{formatVnd(item.basePrice)}</span>{" "}
                      <span className="font-medium">{formatVnd(item.salePrice)}</span>
                    </>
                  ) : (
                    formatVnd(item.basePrice)
                  )}
                </TableCell>
                <TableCell>
                  {item.kitchenStationName ? <Badge variant="outline" className="text-xs">{item.kitchenStationName}</Badge> : "—"}
                </TableCell>
                <TableCell><Switch checked={item.active} onCheckedChange={() => toggleField(item, "active")} /></TableCell>
                <TableCell><Switch checked={item.soldOut} onCheckedChange={() => toggleField(item, "soldOut")} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(item)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(creating || editing) && (
        <ItemEditorDialog
          item={editing}
          categories={categories}
          stations={stations}
          modifierGroups={modifierGroups}
          onOpenChange={(o) => {
            if (!o) {
              setCreating(false);
              setEditing(null);
            }
          }}
          onDone={onChange}
        />
      )}
    </div>
  );
}
