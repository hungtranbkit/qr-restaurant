"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { AdminCategory } from "../types";

export function CategoriesTab({ categories, onChange }: { categories: AdminCategory[]; onChange: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, sortOrder: categories.length }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm danh mục");
        return;
      }
      toast.success("Đã thêm danh mục");
      setName("");
      setDescription("");
      setAddOpen(false);
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(cat: AdminCategory) {
    const res = await fetch(`/api/admin/menu/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cat.active }),
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
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Thêm danh mục</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Danh mục</TableHead>
              <TableHead>Số món</TableHead>
              <TableHead>Hiển thị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.itemCount}</TableCell>
                <TableCell><Switch checked={c.active} onCheckedChange={() => toggleActive(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm danh mục</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="catName">Tên danh mục</Label>
              <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Khai vị" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catDesc">Mô tả</Label>
              <Input id="catDesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!name.trim() || loading}>{loading ? "Đang thêm..." : "Thêm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
