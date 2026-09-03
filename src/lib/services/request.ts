import "server-only";
import { prisma } from "@/lib/db";
import type { CustomerRequestType } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api-error";
import { publishEvent } from "@/lib/realtime/bus";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit";

export async function createCustomerRequest(params: {
  tableSessionId: string;
  tableId: string;
  branchId: string;
  type: CustomerRequestType;
  note?: string;
  tableCode: string;
}) {
  const request = await prisma.customerRequest.create({
    data: {
      tableSessionId: params.tableSessionId,
      tableId: params.tableId,
      type: params.type,
      note: params.note,
      status: "NEW",
    },
  });

  await writeAuditLog({
    actor: { type: "customer", label: `Bàn ${params.tableCode}` },
    action: "CREATE_REQUEST",
    entityType: "CustomerRequest",
    entityId: request.id,
    after: { type: params.type },
  });

  publishEvent({
    type: "CUSTOMER_REQUEST_CREATED",
    branchId: params.branchId,
    tableId: params.tableId,
    tableSessionId: params.tableSessionId,
    payload: { id: request.id, type: request.type, tableCode: params.tableCode, note: request.note },
  });

  return request;
}

export async function updateCustomerRequestStatus(
  id: string,
  status: "ACCEPTED" | "COMPLETED" | "CANCELLED",
  actor: AuditActor & { type: "user" },
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.customerRequest.findUnique({
      where: { id },
      include: { tableSession: { include: { table: true } } },
    });
    if (!request) throw new NotFoundError("Không tìm thấy yêu cầu");
    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      throw new AppError("Yêu cầu đã được xử lý xong", 409);
    }

    const updated = await tx.customerRequest.update({
      where: { id },
      data: {
        status,
        acceptedAt: status === "ACCEPTED" ? new Date() : request.acceptedAt,
        completedAt: status === "COMPLETED" ? new Date() : request.completedAt,
        acceptedById: status === "ACCEPTED" ? actor.id : request.acceptedById,
      },
    });

    await writeAuditLog({
      actor,
      action: `REQUEST_${status}`,
      entityType: "CustomerRequest",
      entityId: id,
      before: { status: request.status },
      after: { status },
      tx,
    });

    publishEvent({
      type: "CUSTOMER_REQUEST_UPDATED",
      branchId: request.tableSession.table.branchId,
      tableId: request.tableId,
      tableSessionId: request.tableSessionId,
      payload: { id, status },
    });

    return updated;
  });
}
