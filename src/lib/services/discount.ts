import "server-only";
import { prisma } from "@/lib/db";
import type { DiscountType } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api-error";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";
import { recalcTableSessionTotals } from "@/lib/services/pricing";
import { publishEvent } from "@/lib/realtime/bus";

export async function applyDiscount(params: {
  tableSessionId: string;
  discountType: DiscountType | null;
  discountValue: number | null;
  reason?: string;
  actor: AuditActor & { type: "user" };
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findUnique({
      where: { id: params.tableSessionId },
      include: { table: true },
    });
    if (!session) throw new NotFoundError("Không tìm thấy phiên bàn");
    if (session.status !== "OPEN" && session.status !== "PAYMENT_REQUESTED") {
      throw new AppError("Không thể áp dụng giảm giá cho phiên đã đóng", 409);
    }
    if (params.discountType === "PERCENTAGE" && (params.discountValue ?? 0) > 100) {
      throw new AppError("Phần trăm giảm giá không hợp lệ", 422);
    }

    await tx.tableSession.update({
      where: { id: params.tableSessionId },
      data: {
        discountType: params.discountType,
        discountValue: params.discountValue,
        discountReason: params.reason,
        discountById: params.actor.id,
      },
    });

    const recalced = await recalcTableSessionTotals(tx, params.tableSessionId);

    await writeAuditLog({
      actor: params.actor,
      action: "APPLY_DISCOUNT",
      entityType: "TableSession",
      entityId: params.tableSessionId,
      after: {
        discountType: params.discountType,
        discountValue: params.discountValue,
        discountAmount: recalced.discountAmount.toString(),
      },
      reason: params.reason,
      tx,
    });

    publishEvent({
      type: "ORDER_UPDATED",
      branchId: session.table.branchId,
      tableId: session.tableId,
      tableSessionId: params.tableSessionId,
      payload: { discountApplied: true },
    });

    return recalced;
  });
}
