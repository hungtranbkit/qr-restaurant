import { NextResponse } from "next/server";
import { resolveTableByToken } from "@/lib/services/customer-access";
import { getOrCreateCustomerSession } from "@/lib/services/table-session";
import { createCustomerRequest } from "@/lib/services/request";
import { customerRequestSchema } from "@/lib/validation/misc";
import { toErrorResponse } from "@/lib/api-error";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const key = clientKeyFromRequest(req, "customer-request");
    if (!rateLimit(key, 20, 60_000)) {
      return NextResponse.json({ error: "Bạn thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
    }

    const { token } = await params;
    const table = await resolveTableByToken(token);
    const body = await req.json();
    const input = customerRequestSchema.parse(body);

    const session = await getOrCreateCustomerSession(table.id);
    const request = await createCustomerRequest({
      tableSessionId: session.id,
      tableId: table.id,
      branchId: table.branchId,
      type: input.type,
      note: input.note,
      tableCode: table.code,
    });

    return NextResponse.json({ id: request.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
