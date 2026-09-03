import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <ShieldAlert className="size-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tài khoản của bạn không có quyền xem trang này. Liên hệ quản lý nếu bạn cho rằng đây là nhầm lẫn.
      </p>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
