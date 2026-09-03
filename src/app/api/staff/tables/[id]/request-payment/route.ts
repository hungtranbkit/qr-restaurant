import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { requestCheckout } from "@/lib/services/table-session";
import { getTableDetail } from "@/lib/services/staff-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("table.open");
    const { id } = await params;
    const detail = await getTableDetail(id);
    if (!detail?.session) throw new AppError("Bàn hiện không có phiên đang mở", 409);

    await requestCheckout(detail.session.id, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
