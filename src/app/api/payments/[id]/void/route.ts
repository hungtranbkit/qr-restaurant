import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { voidPayment } from "@/lib/services/payment";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({ reason: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("payment.void");
    const { id } = await params;
    const { reason } = schema.parse(await req.json());
    const payment = await voidPayment(id, { type: "user", id: user.id, label: user.name }, reason);
    return NextResponse.json({ id: payment.id, status: payment.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
