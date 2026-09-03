import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { getTableDetail } from "@/lib/services/staff-query";
import { getBranchMenu, toClientMenu } from "@/lib/services/customer-access";
import { prisma } from "@/lib/db";
import { TableDetailClient } from "./table-detail-client";

export default async function TableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePagePermission("tables.view");
  if (!user.branchId) return null;

  const detail = await getTableDetail(id);
  if (!detail) notFound();

  const [rawMenu, availableTables] = await Promise.all([
    getBranchMenu(user.branchId),
    prisma.table.findMany({
      where: { branchId: user.branchId, status: "AVAILABLE", active: true, id: { not: id } },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <TableDetailClient
      tableId={id}
      categories={toClientMenu(rawMenu)}
      availableTables={availableTables}
      permissions={{
        canOpenTable: hasPermission(user.role, "table.open"),
        canCreateOrder: hasPermission(user.role, "orders.create"),
        canManageOrders: hasPermission(user.role, "orders.manage"),
        canTransfer: hasPermission(user.role, "table.transfer"),
        canApplyDiscount: hasPermission(user.role, "discount.apply"),
        canManageRequests: hasPermission(user.role, "request.manage"),
        canProcessPayment: hasPermission(user.role, "payment.process"),
      }}
    />
  );
}
