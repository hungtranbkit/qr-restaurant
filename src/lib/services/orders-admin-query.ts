import "server-only";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

export async function listOrdersForAdmin(branchId: string, status?: OrderStatus, take = 100) {
  const orders = await prisma.order.findMany({
    where: { tableSession: { table: { branchId } }, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      tableSession: { include: { table: { select: { code: true } } } },
      createdByUser: { select: { name: true } },
      items: { include: { modifiers: true } },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    tableCode: o.tableSession.table.code,
    createdByName: o.createdByUser?.name ?? null,
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    total: o.items.reduce((s, i) => {
      const modTotal = i.modifiers.reduce((ms, m) => ms + Number(m.priceDeltaSnapshot), 0);
      return s + (Number(i.unitPriceSnapshot) + modTotal) * i.quantity;
    }, 0),
  }));
}
