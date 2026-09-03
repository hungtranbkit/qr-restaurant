import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { markTableAvailable } from "@/lib/services/payment";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("table.open");
    const { id } = await params;
    const table = await markTableAvailable(id, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ status: table.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
