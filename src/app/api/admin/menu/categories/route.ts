import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth/guard";
import { menuCategoryCreateSchema } from "@/lib/validation/misc";
import { createMenuCategory } from "@/lib/services/menu-admin";
import { toErrorResponse, AppError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await requireApiPermission("menu.manage");
    if (!user.branchId) throw new AppError("Tài khoản chưa được gán chi nhánh", 400);
    const input = menuCategoryCreateSchema.parse(await req.json());
    const category = await createMenuCategory(user.branchId, input);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
