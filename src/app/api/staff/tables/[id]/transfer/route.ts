import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/guard";
import { transferTable } from "@/lib/services/table-session";
import { getTableDetail } from "@/lib/services/staff-query";
import { toErrorResponse, AppError } from "@/lib/api-error";

const schema = z.object({ toTableId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("table.transfer");
    const { id } = await params;
    const { toTableId } = schema.parse(await req.json());

    const detail = await getTableDetail(id);
    if (!detail?.session) throw new AppError("Bàn hiện không có phiên đang mở", 409);

    const session = await transferTable(detail.session.id, toTableId, {
      type: "user",
      id: user.id,
      label: user.name,
    });
    return NextResponse.json({ sessionId: session.id, tableId: session.tableId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
