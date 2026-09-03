import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { submitOrderSchema } from "@/lib/validation/order";
import { createOrder } from "@/lib/services/order";
import { getTableDetail } from "@/lib/services/staff-query";
import { toErrorResponse, AppError } from "@/lib/api-error";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("orders.create");
    const { id } = await params;
    const input = submitOrderSchema.parse(await req.json());

    const detail = await getTableDetail(id);
    if (!detail) throw new AppError("Không tìm thấy bàn", 404);
    if (!detail.session) throw new AppError("Vui lòng mở bàn trước khi gọi món", 409);

    const table = await prisma.table.findUniqueOrThrow({ where: { id } });

    const order = await createOrder({
      tableSessionId: detail.session.id,
      branchId: table.branchId,
      tableId: id,
      items: input.items,
      note: input.orderNote,
      source: "STAFF",
      createdByUserId: user.id,
      actor: { type: "user", id: user.id, label: user.name },
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
