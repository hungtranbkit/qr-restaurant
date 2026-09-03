import { randomBytes } from "crypto";
import { db } from "./client";

/** Creates a throwaway table under the seeded Demo Bistro branch, for tests to open sessions on. */
export async function createTestTable(codePrefix = "TEST") {
  const branch = await db.branch.findFirstOrThrow();
  const area = await db.area.findFirstOrThrow({ where: { branchId: branch.id } });
  const code = `${codePrefix}-${randomBytes(3).toString("hex")}`;
  const table = await db.table.create({
    data: {
      branchId: branch.id,
      areaId: area.id,
      code,
      name: `Bàn thử ${code}`,
      seats: 4,
      qrToken: randomBytes(24).toString("base64url"),
    },
  });
  return table;
}

/** Deletes a test table and everything created under it, in dependency order. */
export async function cleanupTable(tableId: string) {
  const sessions = await db.tableSession.findMany({ where: { tableId }, select: { id: true } });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length > 0) {
    const orders = await db.order.findMany({ where: { tableSessionId: { in: sessionIds } }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    await db.orderItemModifier.deleteMany({ where: { orderItem: { orderId: { in: orderIds } } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.customerRequest.deleteMany({ where: { tableSessionId: { in: sessionIds } } });
    await db.payment.deleteMany({ where: { tableSessionId: { in: sessionIds } } });
    await db.tableSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  await db.table.delete({ where: { id: tableId } }).catch(() => undefined);
}

export async function getSeededTable(code: string) {
  return db.table.findFirstOrThrow({ where: { code } });
}

export async function getSeededMenuItem(sku: string) {
  return db.menuItem.findFirstOrThrow({
    where: { sku },
    include: { variants: true, modifierGroups: { include: { group: { include: { options: true } } } } },
  });
}
