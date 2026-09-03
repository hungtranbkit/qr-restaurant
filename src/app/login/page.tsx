"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@example.local" },
  { label: "Quản lý", email: "manager@example.local" },
  { label: "Thu ngân", email: "cashier@example.local" },
  { label: "Phục vụ", email: "waiter@example.local" },
  { label: "Bếp", email: "kitchen@example.local" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Đăng nhập thất bại");
        setLoading(false);
        return;
      }
      toast.success(`Xin chào, ${data.user.name}`);
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      toast.error("Lỗi kết nối máy chủ");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Demo Bistro</h1>
          <p className="text-sm text-muted-foreground">Hệ thống quản lý gọi món QR</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>Dành cho quản lý, thu ngân, phục vụ và bếp</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.local"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Đăng nhập
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tài khoản demo (mật khẩu: demo123)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => setEmail(acc.email)}
                className="rounded border px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
              >
                <div className="font-medium text-foreground">{acc.label}</div>
                <div className="truncate">{acc.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
