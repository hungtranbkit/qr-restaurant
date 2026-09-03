import { NextResponse } from "next/server";
import { resolveTableByToken } from "@/lib/services/customer-access";
import { getOrCreateCustomerSession } from "@/lib/services/table-session";
import { createOrder } from "@/lib/services/order";
import { submitOrderSchema } from "@/lib/validation/order";
import { toErrorResponse } from "@/lib/api-error";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const key = clientKeyFromRequest(req, "customer-order");
    if (!rateLimit(key, 30, 60_000)) {
      return NextResponse.json({ error: "Bạn thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
    }

    const { token } = await params;
    const table = await resolveTableByToken(token);
    const body = await req.json();
    const input = submitOrderSchema.parse(body);

    const session = await getOrCreateCustomerSession(table.id);

    const order = await createOrder({
      tableSessionId: session.id,
      branchId: table.branchId,
      tableId: table.id,
      items: input.items,
      note: input.orderNote,
      source: "CUSTOMER",
      actor: { type: "customer", label: `Bàn ${table.code}` },
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
