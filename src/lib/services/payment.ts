import "server-only";
import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api-error";
import { publishEvent } from "@/lib/realtime/bus";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";
import { recalcTableSessionTotals } from "@/lib/services/pricing";

export async function completeCheckout(params: {
  tableSessionId: string;
  method: PaymentMethod;
  reference?: string;
  cashierId: string;
  actor: AuditActor;
}) {
  const { tableSessionId, method, reference, cashierId, actor } = params;

  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findUnique({
      where: { id: tableSessionId },
      include: { table: { include: { branch: true } } },
    });
    if (!session) throw new NotFoundError("Không tìm thấy phiên bàn");
    if (session.status === "CLOSED" || session.status === "PAID") {
      throw new AppError("Phiên bàn đã được thanh toán", 409);
    }

    // Final authoritative recalculation before charging — never trust a stale total.
    const recalced = await recalcTableSessionTotals(tx, tableSessionId);

    const payment = await tx.payment.create({
      data: {
        tableSessionId,
        amount: recalced.total,
        method,
        status: "COMPLETED",
        reference,
        paidAt: new Date(),
        cashierId,
      },
    });

    const autoAvailable = session.table.branch.autoAvailableAfterPayment;
    await tx.tableSession.update({
      where: { id: tableSessionId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    const table = await tx.table.update({
      where: { id: session.tableId },
      data: { status: autoAvailable ? "AVAILABLE" : "CLEANING" },
    });

    await writeAuditLog({
      actor,
      action: "PAYMENT_COMPLETED",
      entityType: "Payment",
      entityId: payment.id,
      after: { amount: recalced.total.toString(), method },
      tx,
    });

    publishEvent({
      type: "PAYMENT_COMPLETED",
      branchId: table.branchId,
      tableId: table.id,
      tableSessionId,
      payload: { tableId: table.id, amount: recalced.total.toString(), method },
    });
    publishEvent({
      type: "TABLE_STATUS_UPDATED",
      branchId: table.branchId,
      tableId: table.id,
      payload: { tableId: table.id, status: table.status },
    });

    return payment;
  });
}

export async function voidPayment(paymentId: string, actor: AuditActor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Không tìm thấy giao dịch");
    if (payment.status === "VOIDED") return payment;

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "VOIDED" },
    });

    await writeAuditLog({
      actor,
      action: "VOID_PAYMENT",
      entityType: "Payment",
      entityId: paymentId,
      before: { status: payment.status },
      after: { status: "VOIDED" },
      reason,
      tx,
    });

    return updated;
  });
}

export async function markTableAvailable(tableId: string, actor: AuditActor) {
  const table = await prisma.table.update({
    where: { id: tableId },
    data: { status: "AVAILABLE" },
  });
  await writeAuditLog({
    actor,
    action: "TABLE_CLEANED",
    entityType: "Table",
    entityId: tableId,
    after: { status: "AVAILABLE" },
  });
  publishEvent({
    type: "TABLE_STATUS_UPDATED",
    branchId: table.branchId,
    tableId: table.id,
    payload: { tableId: table.id, status: table.status },
  });
  return table;
}
