import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { deleteVariant } from "@/lib/services/menu-admin";
import { toErrorResponse } from "@/lib/api-error";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("menu.manage");
    const { id } = await params;
    await deleteVariant(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
