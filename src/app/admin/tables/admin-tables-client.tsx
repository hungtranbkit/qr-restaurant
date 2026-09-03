"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, QrCode, Printer, Download, RefreshCw, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TABLE_STATUS_LABEL } from "@/lib/status-labels";

interface AdminTable {
  id: string;
  code: string;
  name: string;
  seats: number;
  status: string;
  active: boolean;
  areaId: string;
  areaName: string;
  orderUrl: string;
}
interface Area {
  id: string;
  name: string;
}

export function AdminTablesClient({ initialTables, areas }: { initialTables: AdminTable[]; areas: Area[] }) {
  const [tables, setTables] = useState(initialTables);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTable | null>(null);
  const [qrTable, setQrTable] = useState<AdminTable | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/tables", { cache: "no-store" });
    if (res.ok) setTables((await res.json()).tables);
  }

  async function toggleActive(t: AdminTable) {
    const res = await fetch(`/api/admin/tables/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    if (!res.ok) {
      toast.error("Không thể cập nhật bàn");
      return;
    }
    toast.success(t.active ? "Đã vô hiệu hoá bàn" : "Đã kích hoạt bàn");
    refresh();
  }

  const filtered = areaFilter === "all" ? tables : tables.filter((t) => t.areaId === areaFilter);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Quản lý bàn</h1>
          <p className="text-sm text-muted-foreground">{tables.length} bàn</p>
        </div>
        <div className="flex gap-2">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Khu vực" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu vực</SelectItem>
              {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Thêm bàn</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((t) => (
          <div key={t.id} className={`flex flex-col gap-1.5 rounded-xl border p-3 ${!t.active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <span className="text-base font-bold">{t.code}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-1.5 -mt-1 size-7"><Pencil className="size-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(t)}><Pencil className="size-3.5" /> Sửa</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQrTable(t)}><QrCode className="size-3.5" /> Xem / Tải QR</DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/tables/${t.id}/print`} target="_blank"><Printer className="size-3.5" /> In thẻ QR</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleActive(t)} variant={t.active ? "destructive" : "default"}>
                    <Power className="size-3.5" /> {t.active ? "Vô hiệu hoá" : "Kích hoạt"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Badge variant="outline" className="w-fit text-xs">{TABLE_STATUS_LABEL[t.status] ?? t.status}</Badge>
            <p className="text-xs text-muted-foreground">{t.areaName} · {t.seats} chỗ</p>
          </div>
        ))}
      </div>

      <AddTableDialog open={addOpen} onOpenChange={setAddOpen} areas={areas} onDone={refresh} />
      {editing && (
        <EditTableDialog table={editing} areas={areas} onOpenChange={(o) => !o && setEditing(null)} onDone={refresh} />
      )}
      {qrTable && <QrDialog table={qrTable} onOpenChange={(o) => !o && setQrTable(null)} />}
    </div>
  );
}

function AddTableDialog({
  open,
  onOpenChange,
  areas,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  areas: Area[];
  onDone: () => void;
}) {
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(4);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId, code, name: name || `Bàn ${code}`, seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm bàn");
        return;
      }
      toast.success("Đã thêm bàn");
      setCode("");
      setName("");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm bàn mới</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Khu vực</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Mã bàn</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="A09" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Tên hiển thị</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={code ? `Bàn ${code}` : ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Số chỗ</Label>
            <Input id="seats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!code || !areaId || loading}>
            {loading ? "Đang thêm..." : "Thêm bàn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTableDialog({
  table,
  areas,
  onOpenChange,
  onDone,
}: {
  table: AdminTable;
  areas: Area[];
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [areaId, setAreaId] = useState(table.areaId);
  const [name, setName] = useState(table.name);
  const [seats, setSeats] = useState(table.seats);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId, name, seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể lưu");
        return;
      }
      toast.success("Đã lưu thay đổi");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sửa bàn {table.code}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Khu vực</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="editName">Tên hiển thị</Label>
            <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editSeats">Số chỗ</Label>
            <Input id="editSeats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QrDialog({ table, onOpenChange }: { table: AdminTable; onOpenChange: (o: boolean) => void }) {
  const [data, setData] = useState<{ dataUrl: string; orderUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/tables/${table.id}/qr`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [table.id]);

  async function regenerate() {
    setLoading(true);
    const res = await fetch(`/api/admin/tables/${table.id}/qr`, { method: "POST" });
    const d = await res.json();
    setData(d);
    setLoading(false);
    toast.success("Đã tạo mã QR mới — mã cũ không còn sử dụng được");
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mã QR — Bàn {table.code}</DialogTitle>
          <DialogDescription>Khách quét mã này để vào trang gọi món của bàn.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {loading || !data ? (
            <div className="flex size-60 items-center justify-center text-sm text-muted-foreground">Đang tải...</div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.dataUrl} alt={`QR bàn ${table.code}`} className="size-60 rounded-lg border" />
          )}
          {data && <p className="max-w-[280px] truncate text-center text-xs text-muted-foreground">{data.orderUrl}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={regenerate} disabled={loading}>
            <RefreshCw className="size-4" /> Tạo lại QR
          </Button>
          {data && (
            <Button asChild>
              <a href={data.dataUrl} download={`ban-${table.code}-qr.png`}>
                <Download className="size-4" /> Tải PNG
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
