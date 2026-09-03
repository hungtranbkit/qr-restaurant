import "server-only";
import { prisma } from "@/lib/db";
import { Prisma, type OrderStatus, type TableStatus } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api-error";
import { publishEvent } from "@/lib/realtime/bus";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "PREPARING", "READY"];

/** Derives the display status of a table from its currently active orders. */
export function deriveOccupiedStatus(orderStatuses: OrderStatus[]): TableStatus {
  if (orderStatuses.length === 0) return "OCCUPIED";
  if (orderStatuses.some((s) => ACTIVE_ORDER_STATUSES.includes(s))) return "WAITING_FOOD";
  return "DINING";
}

async function setTableStatus(
  tx: Prisma.TransactionClient,
  tableId: string,
  status: TableStatus,
) {
  const table = await tx.table.update({ where: { id: tableId }, data: { status } });
  publishEvent({
    type: "TABLE_STATUS_UPDATED",
    branchId: table.branchId,
    tableId: table.id,
    payload: { tableId: table.id, status: table.status },
  });
  return table;
}

/** Recomputes and applies OCCUPIED/WAITING_FOOD/DINING from live order state. */
export async function recomputeTableStatus(tx: Prisma.TransactionClient, tableId: string) {
  const table = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
  if (table.status === "DISABLED" || table.status === "CLEANING") return table;
  if (table.status === "PAYMENT_REQUESTED" || table.status === "CHECKOUT") return table;

  const openSession = await tx.tableSession.findFirst({
    where: { tableId, status: "OPEN" },
    include: { orders: { select: { status: true } } },
  });
  if (!openSession) return table;

  const next = deriveOccupiedStatus(openSession.orders.map((o) => o.status));
  if (next !== table.status) return setTableStatus(tx, tableId, next);
  return table;
}

export async function findOpenSessionByTableId(tableId: string) {
  return prisma.tableSession.findFirst({
    where: { tableId, status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
    orderBy: { openedAt: "desc" },
  });
}

/** Used by the customer QR flow: reuses an open session for the table, or opens a new one. */
export async function getOrCreateCustomerSession(tableId: string) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
    if (!table.active || table.status === "DISABLED") {
      throw new AppError("Bàn hiện không khả dụng", 409);
    }

    const existing = await tx.tableSession.findFirst({
      where: { tableId, status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
      orderBy: { openedAt: "desc" },
    });
    if (existing) return existing;

    const session = await tx.tableSession.create({
      data: { tableId, guestCount: 1, status: "OPEN" },
    });
    await setTableStatus(tx, tableId, "OCCUPIED");
    await writeAuditLog({
      actor: { type: "customer", label: `Bàn ${table.code}` },
      action: "OPEN_TABLE",
      entityType: "TableSession",
      entityId: session.id,
      after: { tableId, source: "CUSTOMER_QR" },
      tx,
    });
    return session;
  });
}

export async function openTableByStaff(
  tableId: string,
  guestCount: number,
  actor: AuditActor & { type: "user" },
) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
    if (!table.active || table.status === "DISABLED") {
      throw new AppError("Bàn hiện không khả dụng", 409);
    }
    const existing = await tx.tableSession.findFirst({
      where: { tableId, status: { in: ["OPEN", "PAYMENT_REQUESTED"] } },
    });
    if (existing) return existing;

    const session = await tx.tableSession.create({
      data: { tableId, guestCount, status: "OPEN", openedById: actor.id },
    });
    await setTableStatus(tx, tableId, "OCCUPIED");
    await writeAuditLog({
      actor,
      action: "OPEN_TABLE",
      entityType: "TableSession",
      entityId: session.id,
      after: { tableId, guestCount },
      tx,
    });
    return session;
  });
}

export async function requestCheckout(
  tableSessionId: string,
  actor: AuditActor,
  method?: string,
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findUniqueOrThrow({
      where: { id: tableSessionId },
      include: { table: true },
    });
    if (session.status !== "OPEN") {
      throw new AppError("Bàn không ở trạng thái có thể yêu cầu thanh toán", 409);
    }
    const updated = await tx.tableSession.update({
      where: { id: tableSessionId },
      data: { status: "PAYMENT_REQUESTED" },
    });
    await setTableStatus(tx, session.tableId, "PAYMENT_REQUESTED");
    publishEvent({
      type: "PAYMENT_REQUEST_CREATED",
      branchId: session.table.branchId,
      tableId: session.tableId,
      tableSessionId,
      payload: { tableId: session.tableId, tableCode: session.table.code, method, total: session.total },
    });
    await writeAuditLog({
      actor,
      action: "REQUEST_PAYMENT",
      entityType: "TableSession",
      entityId: tableSessionId,
      after: { method },
      tx,
    });
    return updated;
  });
}

export async function transferTable(
  fromTableSessionId: string,
  toTableId: string,
  actor: AuditActor & { type: "user" },
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findUniqueOrThrow({
      where: { id: fromTableSessionId },
      include: { table: true },
    });
    if (session.status !== "OPEN") throw new AppError("Chỉ có thể chuyển bàn đang mở", 409);

    const targetTable = await tx.table.findUniqueOrThrow({ where: { id: toTableId } });
    if (!targetTable.active || targetTable.status !== "AVAILABLE") {
      throw new AppError("Bàn đích không sẵn sàng", 409);
    }

    const fromTableId = session.tableId;
    await tx.tableSession.update({ where: { id: fromTableSessionId }, data: { tableId: toTableId } });
    await setTableStatus(tx, toTableId, "OCCUPIED");
    await setTableStatus(tx, fromTableId, "AVAILABLE");
    await recomputeTableStatus(tx, toTableId);

    await writeAuditLog({
      actor,
      action: "TRANSFER_TABLE",
      entityType: "TableSession",
      entityId: fromTableSessionId,
      before: { tableId: fromTableId },
      after: { tableId: toTableId },
      tx,
    });
    return tx.tableSession.findUniqueOrThrow({ where: { id: fromTableSessionId } });
  });
}

export async function getSessionOrThrow(id: string) {
  const session = await prisma.tableSession.findUnique({ where: { id } });
  if (!session) throw new NotFoundError("Không tìm thấy phiên bàn");
  return session;
}
