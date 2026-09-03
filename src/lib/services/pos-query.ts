import "server-only";
import { prisma } from "@/lib/db";

export async function listCheckoutQueue(branchId: string) {
  const sessions = await prisma.tableSession.findMany({
    where: { status: { in: ["OPEN", "PAYMENT_REQUESTED"] }, table: { branchId } },
    orderBy: [{ status: "desc" }, { openedAt: "asc" }],
    include: { table: { select: { code: true } } },
  });
  return sessions.map((s) => ({
    id: s.id,
    tableCode: s.table.code,
    status: s.status,
    guestCount: s.guestCount,
    openedAt: s.openedAt.toISOString(),
    total: Number(s.total),
  }));
}

export async function getCheckoutDetail(tableSessionId: string) {
  const session = await prisma.tableSession.findUnique({
    where: { id: tableSessionId },
    include: {
      table: { select: { code: true, id: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "asc" },
        include: { items: { where: { status: { not: "CANCELLED" } }, include: { modifiers: true } } },
      },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  return session;
}
