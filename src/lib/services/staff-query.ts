import "server-only";
import { prisma } from "@/lib/db";

export async function listTableBoard(branchId: string) {
  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: [{ area: { sortOrder: "asc" } }, { code: "asc" }],
    include: {
      area: true,
      sessions: {
        where: { status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
        orderBy: { openedAt: "desc" },
        take: 1,
        include: {
          customerRequests: { where: { status: { in: ["NEW", "ACCEPTED"] } } },
          orders: { select: { status: true } },
        },
      },
    },
  });

  return tables.map((t) => {
    const session = t.sessions[0];
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      seats: t.seats,
      status: t.status,
      active: t.active,
      areaId: t.areaId,
      areaName: t.area.name,
      sessionId: session?.id ?? null,
      guestCount: session?.guestCount ?? null,
      openedAt: session?.openedAt.toISOString() ?? null,
      total: session ? Number(session.total) : 0,
      pendingRequests: session?.customerRequests.length ?? 0,
      hasReadyOrder: session?.orders.some((o) => o.status === "READY") ?? false,
    };
  });
}

export async function listAreas(branchId: string) {
  return prisma.area.findMany({ where: { branchId, active: true }, orderBy: { sortOrder: "asc" } });
}

export async function getTableDetail(tableId: string) {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { area: true },
  });
  if (!table) return null;

  const session = await prisma.tableSession.findFirst({
    where: { tableId, status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { name: true } },
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: { include: { modifiers: true } }, createdByUser: { select: { name: true } } },
      },
      customerRequests: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });

  return { table, session };
}
