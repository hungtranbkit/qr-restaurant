import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);

    const [requests, paymentRequests, readyOrders] = await Promise.all([
      prisma.customerRequest.findMany({
        where: { status: { in: ["NEW", "ACCEPTED"] }, tableSession: { table: { branchId: user.branchId } } },
        orderBy: { createdAt: "asc" },
        include: { tableSession: { include: { table: { select: { code: true } } } } },
        take: 30,
      }),
      prisma.table.findMany({
        where: { branchId: user.branchId, status: "PAYMENT_REQUESTED" },
        select: { id: true, code: true },
      }),
      prisma.order.findMany({
        where: { status: "READY", tableSession: { table: { branchId: user.branchId } } },
        include: { tableSession: { include: { table: { select: { code: true } } } } },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        note: r.note,
        tableCode: r.tableSession.table.code,
        createdAt: r.createdAt.toISOString(),
      })),
      paymentRequests: paymentRequests.map((t) => ({ tableId: t.id, tableCode: t.code })),
      readyOrders: readyOrders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        tableCode: o.tableSession.table.code,
        tableId: o.tableSession.tableId,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
