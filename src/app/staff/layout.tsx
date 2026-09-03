import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guard";
import { NotificationBell } from "@/components/shell/notification-bell";
import { UserMenu } from "@/components/shell/user-menu";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePagePermission("tables.view");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
        <Link href="/staff/tables" className="flex items-center gap-2 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" />
          </div>
          <span className="hidden sm:inline">Demo Bistro — Phục vụ</span>
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
