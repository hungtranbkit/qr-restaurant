import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { resetUserPassword } from "@/lib/services/user-admin";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("staff.manage");
    const { id } = await params;
    const newPassword = await resetUserPassword(id, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ newPassword });
  } catch (err) {
    return toErrorResponse(err);
  }
}
