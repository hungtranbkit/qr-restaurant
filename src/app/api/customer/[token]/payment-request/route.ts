import { NextResponse } from "next/server";
import { resolveTableByToken, getOpenOrPendingSessionForTable } from "@/lib/services/customer-access";
import { requestCheckout } from "@/lib/services/table-session";
import { paymentRequestSchema } from "@/lib/validation/misc";
import { toErrorResponse, AppError } from "@/lib/api-error";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const key = clientKeyFromRequest(req, "customer-payment-request");
    if (!rateLimit(key, 10, 60_000)) {
      return NextResponse.json({ error: "Bạn thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
    }

    const { token } = await params;
    const table = await resolveTableByToken(token);
    const body = await req.json();
    const input = paymentRequestSchema.parse(body);

    const session = await getOpenOrPendingSessionForTable(table.id);
    if (!session) throw new AppError("Bàn chưa có đơn hàng nào để thanh toán", 409);

    await requestCheckout(session.id, { type: "customer", label: `Bàn ${table.code}` }, input.method);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
