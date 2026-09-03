import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { getTableDetail } from "@/lib/services/staff-query";
import { toErrorResponse, NotFoundError } from "@/lib/api-error";
import { toClientOrder } from "@/lib/services/customer-access";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("tables.view");
    const { id } = await params;
    const detail = await getTableDetail(id);
    if (!detail) throw new NotFoundError("Không tìm thấy bàn");

    const { table, session } = detail;
    return NextResponse.json({
      table: {
        id: table.id,
        code: table.code,
        name: table.name,
        seats: table.seats,
        status: table.status,
        active: table.active,
        areaName: table.area.name,
      },
      session: session
        ? {
            id: session.id,
            status: session.status,
            guestCount: session.guestCount,
            openedAt: session.openedAt.toISOString(),
            openedByName: session.openedBy?.name ?? null,
            subtotal: Number(session.subtotal),
            discountType: session.discountType,
            discountValue: session.discountValue ? Number(session.discountValue) : null,
            discountAmount: Number(session.discountAmount),
            taxAmount: Number(session.taxAmount),
            total: Number(session.total),
            orders: session.orders.map((o) => ({
              ...toClientOrder(o),
              createdByName: o.createdByUser?.name ?? null,
            })),
            customerRequests: session.customerRequests.map((r) => ({
              id: r.id,
              type: r.type,
              status: r.status,
              note: r.note,
              createdAt: r.createdAt.toISOString(),
            })),
          }
        : null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
