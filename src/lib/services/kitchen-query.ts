import "server-only";
import { prisma } from "@/lib/db";

export async function listKitchenTickets(branchId: string, stationId?: string) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["SUBMITTED", "PREPARING", "READY"] },
      tableSession: { table: { branchId } },
    },
    orderBy: { createdAt: "asc" },
    include: {
      tableSession: { include: { table: { select: { code: true } } } },
      items: {
        where: { status: { not: "CANCELLED" } },
        include: { modifiers: true, kitchenStation: true },
      },
    },
  });

  return orders
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      tableCode: order.tableSession.table.code,
      items: order.items
        .filter((item) => !stationId || item.kitchenStationId === stationId)
        .map((item) => ({
          id: item.id,
          name: item.itemNameSnapshot,
          variantName: item.variantNameSnapshot,
          quantity: item.quantity,
          note: item.note,
          stationName: item.kitchenStation?.name ?? null,
          modifiers: item.modifiers.map((m) => m.nameSnapshot),
        })),
    }))
    .filter((order) => order.items.length > 0);
}

export async function listKitchenStations(branchId: string) {
  return prisma.kitchenStation.findMany({ where: { branchId }, orderBy: { code: "asc" } });
}
