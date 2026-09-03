import "server-only";
import { prisma } from "@/lib/db";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardSummary(branchId: string) {
  const since = startOfToday();

  const [paymentsToday, sessionsToday, activeTableCount, pendingRequests, tables] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "COMPLETED", paidAt: { gte: since }, tableSession: { table: { branchId } } },
      select: { amount: true, paidAt: true, tableSessionId: true },
    }),
    prisma.tableSession.findMany({
      where: { openedAt: { gte: since }, table: { branchId } },
      select: { id: true, guestCount: true },
    }),
    prisma.table.count({ where: { branchId, status: { notIn: ["AVAILABLE", "DISABLED"] } } }),
    prisma.customerRequest.count({
      where: { status: { in: ["NEW", "ACCEPTED"] }, tableSession: { table: { branchId } } },
    }),
    prisma.table.groupBy({ by: ["status"], where: { branchId }, _count: { _all: true } }),
  ]);

  const revenueToday = paymentsToday.reduce((s, p) => s + Number(p.amount), 0);
  const orderCountToday = sessionsToday.length;
  const guestCountToday = sessionsToday.reduce((s, x) => s + x.guestCount, 0);
  const avgOrderValue = paymentsToday.length ? revenueToday / paymentsToday.length : 0;

  const revenueByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0 }));
  for (const p of paymentsToday) {
    if (!p.paidAt) continue;
    revenueByHour[p.paidAt.getHours()].revenue += Number(p.amount);
  }

  const ordersRaw = await prisma.order.findMany({
    where: { createdAt: { gte: since }, tableSession: { table: { branchId } } },
    select: { createdAt: true },
  });
  const ordersByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of ordersRaw) ordersByHour[o.createdAt.getHours()].orders += 1;

  const tablesStatusOverview = tables.map((t) => ({ status: t.status, count: t._count._all }));

  return {
    revenueToday,
    orderCountToday,
    guestCountToday,
    activeTableCount,
    avgOrderValue,
    pendingRequests,
    revenueByHour,
    ordersByHour,
    tablesStatusOverview,
  };
}

export async function getTopSellingItems(branchId: string, days = 7, limit = 8) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const items = await prisma.orderItem.groupBy({
    by: ["itemNameSnapshot"],
    where: {
      status: { not: "CANCELLED" },
      order: { createdAt: { gte: since }, tableSession: { table: { branchId } } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return items.map((i) => ({ name: i.itemNameSnapshot, quantity: i._sum.quantity ?? 0 }));
}

export async function getRevenueByCategory(branchId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const items = await prisma.orderItem.findMany({
    where: {
      status: { not: "CANCELLED" },
      order: { createdAt: { gte: since }, tableSession: { table: { branchId } } },
    },
    select: {
      quantity: true,
      unitPriceSnapshot: true,
      modifiers: { select: { priceDeltaSnapshot: true } },
      menuItem: { select: { category: { select: { name: true } } } },
    },
  });
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const modTotal = item.modifiers.reduce((s, m) => s + Number(m.priceDeltaSnapshot), 0);
    const lineTotal = (Number(item.unitPriceSnapshot) + modTotal) * item.quantity;
    const cat = item.menuItem.category.name;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + lineTotal);
  }
  return Array.from(byCategory.entries()).map(([category, revenue]) => ({ category, revenue }));
}

export async function getRecentActivity(branchId: string, limit = 20) {
  // V1 single-branch; audit log doesn't carry branchId directly, so this
  // returns the most recent global activity, which is acceptable at this scale.
  void branchId;
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, role: true } } },
  });
}
