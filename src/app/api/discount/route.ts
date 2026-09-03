import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { discountSchema } from "@/lib/validation/misc";
import { applyDiscount } from "@/lib/services/discount";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("discount.apply");
    const input = discountSchema.parse(await req.json());
    const result = await applyDiscount({
      tableSessionId: input.tableSessionId,
      discountType: input.discountType,
      discountValue: input.discountValue,
      reason: input.reason,
      actor: { type: "user", id: user.id, label: user.name },
    });
    return NextResponse.json({ total: result.total.toString(), discountAmount: result.discountAmount.toString() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
