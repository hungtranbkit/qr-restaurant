import Link from "next/link";
import { CreditCard } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guard";
import { NotificationBell } from "@/components/shell/notification-bell";
import { UserMenu } from "@/components/shell/user-menu";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePagePermission("payments.view");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
        <Link href="/pos" className="flex items-center gap-2 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-4" />
          </div>
          <span className="hidden sm:inline">Demo Bistro — Thu ngân</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell canManageRequests={hasPermission(user.role, "request.manage")} />
          <UserMenu name={user.name} role={user.role} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
