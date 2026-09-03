import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { openTableByStaff } from "@/lib/services/table-session";
import { toErrorResponse } from "@/lib/api-error";

const schema = z.object({ guestCount: z.number().int().min(1).max(50).default(2) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("table.open");
    const { id } = await params;
    const { guestCount } = schema.parse(await req.json().catch(() => ({})));
    const session = await openTableByStaff(id, guestCount, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
