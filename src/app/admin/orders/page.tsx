import Link from "next/link";
import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { listOrdersForAdmin } from "@/lib/services/orders-admin-query";
import { ORDER_STATUS_LABEL } from "@/lib/status-labels";
import { formatVnd, formatClock } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderCancelButton } from "./order-cancel-button";
import type { OrderStatus } from "@prisma/client";

const STATUS_TABS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "SUBMITTED", label: "Mới" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "READY", label: "Sẵn sàng" },
  { value: "SERVED", label: "Đã phục vụ" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePagePermission("orders.view");
  if (!user.branchId) return null;

  const { status } = await searchParams;
  const validStatus = STATUS_TABS.some((t) => t.value === status) ? (status as OrderStatus) : undefined;

  const orders = await listOrdersForAdmin(user.branchId, validStatus);
  const canCancel = hasPermission(user.role, "orders.manage");

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Đơn hàng</h1>
        <p className="text-sm text-muted-foreground">{orders.length} đơn gần đây</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "ALL" ? "/admin/orders" : `/admin/orders?status=${tab.value}`}
            className={`rounded-md px-3 py-1.5 font-medium ${
              (validStatus ?? "ALL") === tab.value ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Bàn</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Số món</TableHead>
              <TableHead>Tổng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              {canCancel && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">#{o.orderNumber}</TableCell>
                <TableCell>{o.tableCode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {o.source === "CUSTOMER" ? "Khách" : o.createdByName ?? "Nhân viên"}
                </TableCell>
                <TableCell>{o.itemCount}</TableCell>
                <TableCell>{formatVnd(o.total)}</TableCell>
                <TableCell><Badge variant="secondary">{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatClock(o.createdAt)}</TableCell>
                {canCancel && (
                  <TableCell>
                    {o.status !== "CANCELLED" && o.status !== "SERVED" && <OrderCancelButton orderId={o.id} />}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Không có đơn hàng nào</p>}
      </div>
    </div>
  );
}
