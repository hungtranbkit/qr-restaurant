import { requirePagePermission } from "@/lib/auth/guard";
import { getTopSellingItems, getRevenueByCategory } from "@/lib/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVnd } from "@/lib/format";
import { TopItemsChart, RevenueByCategoryChart } from "../dashboard-charts";

export default async function AdminReportsPage() {
  const user = await requirePagePermission("reports.view");
  if (!user.branchId) return null;

  const [topItems, revenueByCategory] = await Promise.all([
    getTopSellingItems(user.branchId, 30, 12),
    getRevenueByCategory(user.branchId, 30),
  ]);

  const totalRevenue = revenueByCategory.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Báo cáo</h1>
        <p className="text-sm text-muted-foreground">Tổng hợp 30 ngày gần nhất</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Món bán chạy nhất</CardTitle></CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              <TopItemsChart data={topItems} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Doanh thu theo danh mục</CardTitle></CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              <RevenueByCategoryChart data={revenueByCategory} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Chi tiết theo danh mục</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[...revenueByCategory].sort((a, b) => b.revenue - a.revenue).map((c) => (
            <div key={c.category} className="flex items-center justify-between text-sm">
              <span>{c.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0}%
                </span>
                <span className="font-medium">{formatVnd(c.revenue)}</span>
              </div>
            </div>
          ))}
          {revenueByCategory.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>}
        </CardContent>
      </Card>
    </div>
  );
}
