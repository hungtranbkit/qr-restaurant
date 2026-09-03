import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { getCheckoutDetail } from "@/lib/services/pos-query";
import { toErrorResponse, NotFoundError } from "@/lib/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("payments.view");
    const { id } = await params;
    const session = await getCheckoutDetail(id);
    if (!session) throw new NotFoundError("Không tìm thấy phiên bàn");

    return NextResponse.json({
      id: session.id,
      status: session.status,
      tableCode: session.table.code,
      guestCount: session.guestCount,
      subtotal: Number(session.subtotal),
      discountType: session.discountType,
      discountAmount: Number(session.discountAmount),
      taxAmount: Number(session.taxAmount),
      total: Number(session.total),
      payments: session.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
      orders: session.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        items: o.items.map((item) => ({
          id: item.id,
          name: item.itemNameSnapshot,
          variantName: item.variantNameSnapshot,
          unitPrice: Number(item.unitPriceSnapshot),
          quantity: item.quantity,
          modifiersTotal: item.modifiers.reduce((s, m) => s + Number(m.priceDeltaSnapshot), 0),
          modifierNames: item.modifiers.map((m) => m.nameSnapshot),
        })),
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
