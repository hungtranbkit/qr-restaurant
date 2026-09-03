import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { userUpdateSchema } from "@/lib/validation/misc";
import { updateUser } from "@/lib/services/user-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("staff.manage");
    const { id } = await params;
    if (id === user.id) throw new AppError("Không thể tự thay đổi tài khoản của chính mình tại đây", 400);
    const input = userUpdateSchema.parse(await req.json());
    const updated = await updateUser(id, input, { type: "user", id: user.id, label: user.name });
    return NextResponse.json({ id: updated.id, role: updated.role, active: updated.active });
  } catch (err) {
    return toErrorResponse(err);
  }
}
