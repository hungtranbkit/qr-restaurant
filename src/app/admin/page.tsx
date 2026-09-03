import { DollarSign, ShoppingBag, Users, LayoutGrid, TrendingUp, Bell } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guard";
import {
  getDashboardSummary,
  getTopSellingItems,
  getRevenueByCategory,
  getRecentActivity,
} from "@/lib/services/reports";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVnd, formatTimeAgo } from "@/lib/format";
import { TABLE_STATUS_LABEL, AUDIT_ACTION_LABEL } from "@/lib/status-labels";
import {
  RevenueByHourChart,
  OrdersByHourChart,
  TopItemsChart,
  RevenueByCategoryChart,
} from "./dashboard-charts";

export default async function AdminDashboardPage() {
  const user = await requirePagePermission("dashboard.view");
  if (!user.branchId) return null;

  const [summary, topItems, revenueByCategory, recentActivity] = await Promise.all([
    getDashboardSummary(user.branchId),
    getTopSellingItems(user.branchId),
    getRevenueByCategory(user.branchId),
    getRecentActivity(user.branchId),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tổng quan hoạt động hôm nay</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Doanh thu hôm nay" value={formatVnd(summary.revenueToday)} icon={DollarSign} />
        <StatCard label="Số order hôm nay" value={String(summary.orderCountToday)} icon={ShoppingBag} />
        <StatCard label="Số khách hôm nay" value={String(summary.guestCountToday)} icon={Users} />
        <StatCard label="Bàn đang dùng" value={String(summary.activeTableCount)} icon={LayoutGrid} />
        <StatCard label="Giá trị TB / đơn" value={formatVnd(summary.avgOrderValue)} icon={TrendingUp} />
      </div>

      {summary.pendingRequests > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-400">
          <Bell className="size-4" />
          Có {summary.pendingRequests} yêu cầu từ khách đang chờ xử lý
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Doanh thu theo giờ (hôm nay)</CardTitle></CardHeader>
          <CardContent><RevenueByHourChart data={summary.revenueByHour} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Số order theo giờ (hôm nay)</CardTitle></CardHeader>
          <CardContent><OrdersByHourChart data={summary.ordersByHour} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Món bán chạy (7 ngày qua)</CardTitle></CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              <TopItemsChart data={topItems} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Doanh thu theo danh mục (7 ngày qua)</CardTitle></CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              <RevenueByCategoryChart data={revenueByCategory} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Tình trạng bàn</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.tablesStatusOverview.map((t) => (
              <Badge key={t.status} variant="secondary" className="text-xs">
                {TABLE_STATUS_LABEL[t.status] ?? t.status}: {t.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-semibold">Hoạt động gần đây</CardTitle></CardHeader>
          <CardContent className="max-h-72 space-y-2.5 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Chưa có hoạt động</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{log.actor?.name ?? log.actorLabel}</span>{" "}
                    <span className="text-muted-foreground">{AUDIT_ACTION_LABEL[log.action] ?? log.action}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTimeAgo(log.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
