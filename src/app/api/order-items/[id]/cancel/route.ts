import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { cancelOrderItem } from "@/lib/services/order";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({ reason: z.string().trim().max(200).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("orders.manage");
    const { id } = await params;
    const { reason } = schema.parse(await req.json().catch(() => ({})));
    await cancelOrderItem(id, { type: "user", id: user.id, label: user.name }, reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
