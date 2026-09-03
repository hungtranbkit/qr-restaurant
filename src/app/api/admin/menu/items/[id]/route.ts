import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { menuItemUpdateSchema } from "@/lib/validation/misc";
import { updateMenuItem } from "@/lib/services/menu-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("menu.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const { id } = await params;
    const input = menuItemUpdateSchema.parse(await req.json());
    const item = await updateMenuItem(
      user.branchId,
      id,
      input,
      { type: "user", id: user.id, label: user.name },
    );
    return NextResponse.json(item);
  } catch (err) {
    return toErrorResponse(err);
  }
}
