import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { checkoutSchema } from "@/lib/validation/misc";
import { completeCheckout } from "@/lib/services/payment";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("payment.process");
    const input = checkoutSchema.parse(await req.json());
    const payment = await completeCheckout({
      tableSessionId: input.tableSessionId,
      method: input.method,
      reference: input.reference,
      cashierId: user.id,
      actor: { type: "user", id: user.id, label: user.name },
    });
    return NextResponse.json({ paymentId: payment.id, amount: payment.amount.toString() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
