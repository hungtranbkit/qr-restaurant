"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { AdminStation } from "../types";

export function StationsTab({ stations, onChange }: { stations: AdminStation[]; onChange: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm trạm bếp");
        return;
      }
      toast.success("Đã thêm trạm bếp");
      setCode("");
      setName("");
      setAddOpen(false);
      onChange();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Thêm trạm bếp</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên trạm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm trạm bếp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="stationCode">Mã (viết hoa, không dấu)</Label>
              <Input id="stationCode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GRILL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stationName">Tên hiển thị</Label>
              <Input id="stationName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bếp nướng" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!code.trim() || !name.trim() || loading}>
              {loading ? "Đang thêm..." : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
