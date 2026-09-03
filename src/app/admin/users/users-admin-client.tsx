"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "CASHIER", label: "Thu ngân" },
  { value: "WAITER", label: "Phục vụ" },
  { value: "KITCHEN", label: "Bếp" },
];

export function UsersAdminClient({ initialUsers, currentUserId }: { initialUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setUsers((await res.json()).users);
  }

  async function updateRole(u: AdminUser, role: string) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể đổi vai trò");
      return;
    }
    toast.success("Đã cập nhật vai trò");
    refresh();
  }

  async function toggleActive(u: AdminUser) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Không thể cập nhật");
      return;
    }
    refresh();
  }

  async function handleReset() {
    if (!resetFor) return;
    const res = await fetch(`/api/admin/users/${resetFor.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Không thể đặt lại mật khẩu");
      return;
    }
    setNewPassword(data.newPassword);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Người dùng</h1>
          <p className="text-sm text-muted-foreground">{users.length} tài khoản</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Thêm người dùng</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8"><AvatarFallback className="text-xs">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.id === currentUserId && <Badge variant="secondary" className="text-[10px]">Bạn</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => updateRole(u, v)} disabled={u.id === currentUserId}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} disabled={u.id === currentUserId} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => { setResetFor(u); setNewPassword(null); }}>
                    <KeyRound className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onDone={refresh} />

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu — {resetFor?.name}</DialogTitle>
            <DialogDescription>Chỉ dùng cho môi trường demo/dev.</DialogDescription>
          </DialogHeader>
          {newPassword ? (
            <p className="rounded-md bg-muted p-3 text-sm">
              Mật khẩu mới: <span className="font-mono font-semibold">{newPassword}</span>
            </p>
          ) : (
            <Button onClick={handleReset}>Đặt lại về mật khẩu demo</Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddUserDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("WAITER");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm người dùng");
        return;
      }
      toast.success("Đã thêm người dùng — mật khẩu mặc định: demo123");
      setName("");
      setEmail("");
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm người dùng</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Họ tên</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@example.local" />
          </div>
          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={!name.trim() || !email.trim() || loading}>
            {loading ? "Đang thêm..." : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
