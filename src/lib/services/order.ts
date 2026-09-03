import "server-only";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api-error";
import { publishEvent } from "@/lib/realtime/bus";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";
import { resolveCartLine, recalcTableSessionTotals } from "@/lib/services/pricing";
import { recomputeTableStatus } from "@/lib/services/table-session";
import type { CartLineInput } from "@/lib/validation/order";

export async function createOrder(params: {
  tableSessionId: string;
  branchId: string;
  tableId: string;
  items: CartLineInput[];
  note?: string;
  source: "CUSTOMER" | "STAFF";
  createdByUserId?: string;
  actor: AuditActor;
}) {
  const { tableSessionId, branchId, tableId, items, source, createdByUserId, actor } = params;

  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findUniqueOrThrow({ where: { id: tableSessionId } });
    if (session.status !== "OPEN") {
      throw new AppError("Bàn đã yêu cầu thanh toán, không thể gọi thêm món", 409);
    }

    const resolved = await Promise.all(items.map((line) => resolveCartLine(tx, line, branchId)));

    const order = await tx.order.create({
      data: {
        tableSessionId,
        source,
        createdByUserId,
        status: "SUBMITTED",
        note: params.note,
        submittedAt: new Date(),
        items: {
          create: resolved.map((line) => ({
            menuItemId: line.menuItemId,
            itemNameSnapshot: line.itemNameSnapshot,
            variantNameSnapshot: line.variantNameSnapshot,
            unitPriceSnapshot: line.unitPriceSnapshot,
            quantity: line.quantity,
            note: line.note,
            kitchenStationId: line.kitchenStationId,
            status: "SUBMITTED",
            modifiers: {
              create: line.modifiers.map((m) => ({
                nameSnapshot: m.nameSnapshot,
                priceDeltaSnapshot: m.priceDeltaSnapshot,
              })),
            },
          })),
        },
      },
      include: { items: { include: { modifiers: true } } },
    });

    await recalcTableSessionTotals(tx, tableSessionId);
    await recomputeTableStatus(tx, tableId);

    await writeAuditLog({
      actor,
      action: "CREATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      after: { itemCount: order.items.length, source },
      tx,
    });

    publishEvent({
      type: "ORDER_CREATED",
      branchId,
      tableId,
      tableSessionId,
      payload: { orderId: order.id, orderNumber: order.orderNumber },
    });
    publishEvent({
      type: "KITCHEN_TICKET_CREATED",
      branchId,
      tableId,
      tableSessionId,
      payload: { orderId: order.id },
    });

    return order;
  });
}

const KITCHEN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
};

export async function transitionOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: AuditActor,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { tableSession: { include: { table: true } } },
    });
    if (!order) throw new NotFoundError("Không tìm thấy đơn hàng");

    const allowed = KITCHEN_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(`Không thể chuyển từ ${order.status} sang ${nextStatus}`, 409);
    }

    const timestampField: Partial<Record<OrderStatus, string>> = {
      PREPARING: "preparingAt",
      READY: "readyAt",
      SERVED: "servedAt",
      CANCELLED: "cancelledAt",
    };
    const field = timestampField[nextStatus];

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        ...(field ? { [field]: new Date() } : {}),
      },
    });

    // Item-level status mirrors the ticket for PREPARING/READY/SERVED/CANCELLED,
    // skipping items already cancelled individually.
    await tx.orderItem.updateMany({
      where: { orderId, status: { not: "CANCELLED" } },
      data: { status: nextStatus === "CANCELLED" ? "CANCELLED" : (nextStatus as "PREPARING" | "READY" | "SERVED") },
    });

    if (nextStatus === "CANCELLED") {
      await recalcTableSessionTotals(tx, order.tableSessionId);
    }

    await recomputeTableStatus(tx, order.tableSession.tableId);

    await writeAuditLog({
      actor,
      action: `ORDER_${nextStatus}`,
      entityType: "Order",
      entityId: orderId,
      before: { status: order.status },
      after: { status: nextStatus },
      tx,
    });

    publishEvent({
      type: "KITCHEN_TICKET_UPDATED",
      branchId: order.tableSession.table.branchId,
      tableId: order.tableSession.tableId,
      tableSessionId: order.tableSessionId,
      payload: { orderId, status: nextStatus },
    });
    publishEvent({
      type: "ORDER_UPDATED",
      branchId: order.tableSession.table.branchId,
      tableId: order.tableSession.tableId,
      tableSessionId: order.tableSessionId,
      payload: { orderId, status: nextStatus },
    });

    return updated;
  });
}

export async function cancelOrderItem(orderItemId: string, actor: AuditActor, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { tableSession: { include: { table: true } } } } },
    });
    if (!item) throw new NotFoundError("Không tìm thấy món");
    if (item.status === "CANCELLED") return item;

    await tx.orderItem.update({ where: { id: orderItemId }, data: { status: "CANCELLED" } });
    await recalcTableSessionTotals(tx, item.order.tableSessionId);
    await recomputeTableStatus(tx, item.order.tableSession.tableId);

    await writeAuditLog({
      actor,
      action: "CANCEL_ORDER_ITEM",
      entityType: "OrderItem",
      entityId: orderItemId,
      before: { status: item.status },
      after: { status: "CANCELLED" },
      reason,
      tx,
    });

    publishEvent({
      type: "ORDER_UPDATED",
      branchId: item.order.tableSession.table.branchId,
      tableId: item.order.tableSession.tableId,
      tableSessionId: item.order.tableSessionId,
      payload: { orderId: item.orderId, itemId: orderItemId, status: "CANCELLED" },
    });

    return item;
  });
}
