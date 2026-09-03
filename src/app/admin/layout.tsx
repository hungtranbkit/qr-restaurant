import Link from "next/link";
import { UtensilsCrossed, Menu } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { AdminSidebarNav } from "@/components/shell/admin-sidebar-nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import { UserMenu } from "@/components/shell/user-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePagePermission("dashboard.view");

  const visibleGroups = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(user.role, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" />
          </div>
          Demo Bistro
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminSidebarNav groups={visibleGroups} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <SheetTitle className="mb-2">Demo Bistro</SheetTitle>
                <AdminSidebarNav groups={visibleGroups} />
              </SheetContent>
            </Sheet>
            <Link href="/admin" className="font-semibold md:hidden">Demo Bistro</Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell canManageRequests={hasPermission(user.role, "request.manage")} />
            <UserMenu name={user.name} role={user.role} />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
