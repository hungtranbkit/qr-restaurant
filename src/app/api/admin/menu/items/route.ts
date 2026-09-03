import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { menuItemCreateSchema } from "@/lib/validation/misc";
import { createMenuItem } from "@/lib/services/menu-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("menu.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = menuItemCreateSchema.parse(await req.json());
    const item = await createMenuItem(
      user.branchId,
      input,
      { type: "user", id: user.id, label: user.name },
    );
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
